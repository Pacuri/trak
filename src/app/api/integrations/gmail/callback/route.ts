import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Gmail OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${error}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_params', request.url)
      )
    }

    // Verify state and extract organization ID
    let stateData: { organizationId: string; userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', request.url)
      )
    }

    // Verify state is not too old (5 minutes max)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=state_expired', request.url)
      )
    }

    // Verify user is still authenticated and matches state
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=auth_mismatch', request.url)
      )
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user's email from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: googleUser } = await oauth2.userinfo.get()

    if (!googleUser.email) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=no_email', request.url)
      )
    }

    // Check if integration already exists for this org
    const { data: existingIntegration } = await supabase
      .from('email_integrations')
      .select('id')
      .eq('organization_id', stateData.organizationId)
      .single()

    const integrationData = {
      organization_id: stateData.organizationId,
      provider: 'gmail',
      email_address: googleUser.email,
      display_name: googleUser.name || googleUser.email.split('@')[0],
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_active: true,
      connected_at: new Date().toISOString(),
      connected_by: user.id,
      last_error: null,
    }

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('email_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)

      if (updateError) {
        console.error('Error updating email integration:', updateError)
        return NextResponse.redirect(
          new URL('/dashboard/integrations?error=db_error', request.url)
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('email_integrations')
        .insert(integrationData)

      if (insertError) {
        console.error('Error creating email integration:', insertError)
        return NextResponse.redirect(
          new URL('/dashboard/integrations?error=db_error', request.url)
        )
      }
    }

    // Setup Gmail Push Notifications (watch)
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Setup watch on inbox
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: process.env.GOOGLE_PUBSUB_TOPIC,
          labelIds: ['INBOX'],
        },
      })

      // Store watch expiration and historyId
      if (watchResponse.data) {
        await supabase
          .from('email_integrations')
          .update({
            history_id: watchResponse.data.historyId,
            watch_expiration: watchResponse.data.expiration
              ? new Date(parseInt(watchResponse.data.expiration)).toISOString()
              : null,
          })
          .eq('organization_id', stateData.organizationId)

        console.log(`Gmail watch setup for ${googleUser.email}, expires: ${watchResponse.data.expiration}`)
      }
    } catch (watchError: any) {
      // Log but don't fail - watch can be setup later
      console.error('Gmail watch setup error:', watchError.message)
    }

    // Success - redirect back to integrations page
    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=gmail_connected', request.url)
    )
  } catch (error: any) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=callback_failed', request.url)
    )
  }
}
