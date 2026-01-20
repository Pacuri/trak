import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// GET - Handle OAuth callback from Meta
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Check for errors from Meta
    if (error) {
      console.error('Meta OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    // Verify state
    const storedState = request.cookies.get('meta_oauth_state')?.value
    if (!state || state !== storedState) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=Invalid+state', request.url)
      )
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=Organization+not+found', request.url)
      )
    }

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    )

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json()
      console.error('Token exchange error:', tokenError)
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(tokenError.error?.message || 'Token exchange failed')}`, request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const shortLivedToken = tokenData.access_token

    // Exchange for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedToken}`
    )

    const longLivedData = await longLivedResponse.json()
    const longLivedUserToken = longLivedData.access_token

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedUserToken}`
    )

    const pagesData = await pagesResponse.json()
    const pages = pagesData.data || []

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/integrations?error=No+Facebook+pages+found', request.url)
      )
    }

    // For now, use the first page (could show selector UI later)
    const page = pages[0]
    const pageAccessToken = page.access_token
    const pageId = page.id
    const pageName = page.name

    // Get long-lived page access token
    const longLivedPageResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${longLivedUserToken}`
    )
    const longLivedPageData = await longLivedPageResponse.json()
    const longLivedPageToken = longLivedPageData.access_token || pageAccessToken

    // Try to get connected Instagram account
    let instagramAccountId = null
    let instagramUsername = null

    try {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${longLivedPageToken}`
      )
      const igData = await igResponse.json()
      if (igData.instagram_business_account) {
        instagramAccountId = igData.instagram_business_account.id
        instagramUsername = igData.instagram_business_account.username
      }
    } catch (e) {
      console.log('No Instagram account linked to page')
    }

    // Generate webhook verify token
    const webhookVerifyToken = randomBytes(32).toString('hex')

    // Save integration (upsert)
    const { error: upsertError } = await supabase
      .from('meta_integrations')
      .upsert({
        organization_id: userData.organization_id,
        page_id: pageId,
        page_name: pageName,
        page_access_token: longLivedPageToken,
        instagram_account_id: instagramAccountId,
        instagram_username: instagramUsername,
        webhook_verify_token: webhookVerifyToken,
        messenger_enabled: true,
        instagram_enabled: !!instagramAccountId,
        is_active: true,
        connected_at: new Date().toISOString(),
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id'
      })

    if (upsertError) {
      console.error('Error saving Meta integration:', upsertError)
      return NextResponse.redirect(
        new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(upsertError.message)}`, request.url)
      )
    }

    // Subscribe to webhooks (Messenger)
    try {
      await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?` +
        `subscribed_fields=messages,messaging_postbacks,messaging_optins&` +
        `access_token=${longLivedPageToken}`,
        { method: 'POST' }
      )
      console.log('Subscribed to Messenger webhooks')
    } catch (e) {
      console.error('Failed to subscribe to webhooks:', e)
    }

    // Clear state cookie
    const response = NextResponse.redirect(
      new URL('/dashboard/settings/integrations?success=meta', request.url)
    )
    response.cookies.delete('meta_oauth_state')

    return response
  } catch (error: any) {
    console.error('Meta callback error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
