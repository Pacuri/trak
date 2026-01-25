import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { getConfirmationEmailTemplate } from '@/lib/email-templates/confirmation'

interface SendConfirmationRequest {
  organization_id: string
  to: string
  customer_name: string
  reservation_code: string
  package_name: string
  total_price: number
  deposit_amount: number
  currency: string
  expires_at: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendConfirmationRequest = await request.json()
    const {
      organization_id,
      to,
      customer_name,
      reservation_code,
      package_name,
      total_price,
      deposit_amount,
      currency,
      expires_at
    } = body

    if (!organization_id || !to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, phone, email')
      .eq('id', organization_id)
      .single()

    // Get email integration for the organization
    const { data: emailIntegration } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single()

    if (!emailIntegration) {
      console.log('No email integration found for organization:', organization_id)
      return NextResponse.json({ error: 'Email integration not configured' }, { status: 400 })
    }

    // Format currency
    const currencySymbol = currency === 'EUR' ? '€' : currency
    const formattedTotal = `${total_price.toFixed(2)} ${currencySymbol}`
    const formattedDeposit = `${deposit_amount.toFixed(2)} ${currencySymbol}`

    // Format expiry date
    const expiryDate = new Date(expires_at)
    const formattedExpiry = expiryDate.toLocaleDateString('sr-RS', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Get email template
    const { subject, body: emailBody } = getConfirmationEmailTemplate({
      customerName: customer_name,
      reservationCode: reservation_code,
      packageName: package_name,
      totalPrice: formattedTotal,
      depositAmount: formattedDeposit,
      expiresAt: formattedExpiry,
      agencyName: organization?.name || 'Agencija',
      agencyPhone: organization?.phone || '',
      agencyEmail: organization?.email || emailIntegration.email_address,
    })

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    // Set credentials
    oauth2Client.setCredentials({
      access_token: emailIntegration.access_token,
      refresh_token: emailIntegration.refresh_token,
    })

    // If token is expired, refresh it
    if (emailIntegration.token_expires_at && new Date(emailIntegration.token_expires_at) < new Date()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken()

        // Update tokens in database
        await supabase
          .from('email_integrations')
          .update({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || emailIntegration.refresh_token,
            token_expires_at: credentials.expiry_date
              ? new Date(credentials.expiry_date).toISOString()
              : null,
          })
          .eq('id', emailIntegration.id)

        oauth2Client.setCredentials(credentials)
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        return NextResponse.json({ error: 'Failed to refresh email token' }, { status: 500 })
      }
    }

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Build email
    const fromName = emailIntegration.display_name || organization?.name || ''
    const fromEmail = emailIntegration.email_address
    const toFormatted = customer_name ? `${customer_name} <${to}>` : to

    // Create raw email message
    const messageParts = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toFormatted}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailBody).toString('base64'),
    ]

    const rawMessage = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    })

    // Update last_used_at
    await supabase
      .from('email_integrations')
      .update({
        last_used_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', emailIntegration.id)

    return NextResponse.json({
      success: true,
      message_id: response.data.id,
    })

  } catch (error: unknown) {
    console.error('Error sending confirmation email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
