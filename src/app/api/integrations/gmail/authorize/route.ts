import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
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
      return NextResponse.redirect(new URL('/dashboard/integrations?error=no_org', request.url))
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
    )

    // Generate state parameter with organization ID for security
    const state = Buffer.from(JSON.stringify({
      organizationId: userData.organization_id,
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
      state,
    })

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Gmail OAuth authorize error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=oauth_failed', request.url)
    )
  }
}
