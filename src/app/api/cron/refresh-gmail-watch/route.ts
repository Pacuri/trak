import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Cron job to refresh Gmail watch subscriptions before they expire
// Gmail watch expires after 7 days, so we run this daily to keep them active

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  const results: { email: string; success: boolean; error?: string }[] = []

  try {
    // Get all active email integrations
    const { data: integrations, error } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('is_active', true)
      .eq('provider', 'gmail')

    if (error || !integrations) {
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
    }

    console.log(`Refreshing Gmail watch for ${integrations.length} integrations`)

    for (const integration of integrations) {
      try {
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
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

        // Stop existing watch (ignore errors)
        try {
          await gmail.users.stop({ userId: 'me' })
        } catch (e) {
          // Ignore
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

          results.push({ email: integration.email_address, success: true })
          console.log(`Refreshed watch for ${integration.email_address}`)
        }
      } catch (err: any) {
        console.error(`Failed to refresh watch for ${integration.email_address}:`, err.message)

        // Update last_error in database
        await supabase
          .from('email_integrations')
          .update({ last_error: err.message })
          .eq('id', integration.id)

        results.push({
          email: integration.email_address,
          success: false,
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      refreshed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
