import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// GET - Start OAuth flow (redirect to Meta)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const appId = process.env.META_APP_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`

    if (!appId) {
      return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
    }

    // Permissions needed:
    // - pages_messaging: Send/receive Messenger messages
    // - pages_manage_metadata: Get page info
    // - instagram_basic: Basic Instagram info
    // - instagram_manage_messages: Instagram DMs
    // - whatsapp_business_management: WhatsApp (optional)
    // - whatsapp_business_messaging: WhatsApp messages (optional)
    const permissions = [
      'pages_messaging',
      'pages_manage_metadata',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_manage_messages',
    ].join(',')

    // Generate state for CSRF protection
    const state = randomBytes(32).toString('hex')

    // Store state in cookie for verification
    const response = NextResponse.redirect(
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${permissions}` +
      `&state=${state}` +
      `&response_type=code`
    )

    response.cookies.set('meta_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error: any) {
    console.error('Meta auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
