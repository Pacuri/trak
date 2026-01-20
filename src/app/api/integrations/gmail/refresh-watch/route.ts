import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// POST - Refresh Gmail watch subscription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Get email integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'No email integration found' }, { status: 404 })
    }

    // Setup OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    })

    // Refresh token if expired
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken()
        await supabase
          .from('email_integrations')
          .update({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || integration.refresh_token,
            token_expires_at: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : null,
          })
          .eq('id', integration.id)
        oauth2Client.setCredentials(credentials)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Stop existing watch first (ignore errors)
    try {
      await gmail.users.stop({ userId: 'me' })
    } catch (e) {
      // Ignore - might not have an active watch
    }

    // Setup new watch
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelIds: ['INBOX'],
      },
    })

    if (watchResponse.data) {
      await supabase
        .from('email_integrations')
        .update({
          history_id: watchResponse.data.historyId,
          watch_expiration: watchResponse.data.expiration
            ? new Date(parseInt(watchResponse.data.expiration)).toISOString()
            : null,
          last_error: null,
        })
        .eq('id', integration.id)

      const expirationDate = watchResponse.data.expiration
        ? new Date(parseInt(watchResponse.data.expiration))
        : null

      return NextResponse.json({
        success: true,
        historyId: watchResponse.data.historyId,
        expiration: expirationDate?.toISOString(),
        expiresIn: expirationDate
          ? `${Math.round((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`
          : 'unknown',
      })
    }

    return NextResponse.json({ error: 'Watch setup failed' }, { status: 500 })
  } catch (error: any) {
    console.error('Gmail refresh watch error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
