import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// Types
interface SendEmailRequest {
  inquiryId: string
  templateId?: string
  subject: string
  body: string
  recipientEmail: string
  recipientName: string
  responseType: 'can_organize' | 'cannot_organize' | 'need_more_info' | 'custom'
}

// Replace template variables
function replaceVariables(
  text: string,
  variables: Record<string, string | number | null | undefined>
): string {
  let result = text
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), String(value || ''))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user and org
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organizacija nije pronađena' }, { status: 400 })
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, phone, email')
      .eq('id', userData.organization_id)
      .single()

    // Get email integration
    const { data: emailIntegration } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .single()

    if (!emailIntegration) {
      return NextResponse.json(
        { error: 'Email nije povezan. Idite na Podešavanja > Integracije da povežete email.' },
        { status: 400 }
      )
    }

    // Parse request body
    const body: SendEmailRequest = await request.json()
    const { inquiryId, templateId, subject, body: emailBody, recipientEmail, recipientName, responseType } = body

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Klijent nema email adresu. Kontaktirajte ga telefonom.' },
        { status: 400 }
      )
    }

    // Prepare variables for template replacement
    const { data: inquiry } = await supabase
      .from('custom_inquiries')
      .select('*, qualification_data')
      .eq('id', inquiryId)
      .single()

    const variables = {
      ime: recipientName?.split(' ')[0] || recipientName || 'klijent',
      prezime: recipientName?.split(' ').slice(1).join(' ') || '',
      destinacija: inquiry?.qualification_data?.destination?.country ||
        inquiry?.qualification_data?.destination?.city ||
        inquiry?.qualification_data?.package_name ||
        'vaše putovanje',
      datum_polaska: inquiry?.qualification_data?.selected_date ||
        inquiry?.qualification_data?.dates?.exactStart ||
        '',
      paket: inquiry?.qualification_data?.package_name || '',
      broj_putnika: inquiry?.qualification_data?.guests?.adults
        ? `${inquiry.qualification_data.guests.adults} odraslih${inquiry.qualification_data.guests.children ? ` + ${inquiry.qualification_data.guests.children} dece` : ''}`
        : '',
      agencija: organization?.name || '',
      agent: userData?.full_name || user.email?.split('@')[0] || '',
      telefon_agencije: organization?.phone || '',
      email_agencije: organization?.email || emailIntegration.email_address,
    }

    // Replace variables in subject and body
    const finalSubject = replaceVariables(subject, variables)
    const finalBody = replaceVariables(emailBody, variables)

    // Send email via Gmail API
    let emailSent = false
    let externalId: string | null = null
    let errorMessage: string | null = null

    try {
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
      }

      // Create Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Build email
      const fromName = emailIntegration.display_name || organization?.name || ''
      const fromEmail = emailIntegration.email_address
      const to = recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail

      // Create raw email message
      const messageParts = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(finalSubject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(finalBody).toString('base64'),
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

      emailSent = true
      externalId = response.data.id || null

      // Update last_used_at
      await supabase
        .from('email_integrations')
        .update({
          last_used_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', emailIntegration.id)

    } catch (gmailError: any) {
      console.error('Gmail API error:', gmailError)
      errorMessage = gmailError.message || 'Greška pri slanju email-a'

      // Update last_error
      await supabase
        .from('email_integrations')
        .update({
          last_error: errorMessage,
        })
        .eq('id', emailIntegration.id)
    }

    // Record the response in lead_responses table
    const { data: leadResponse, error: responseError } = await supabase
      .from('lead_responses')
      .insert({
        lead_id: inquiryId,
        organization_id: userData.organization_id,
        response_type: responseType,
        channel: 'email',
        template_id: templateId || null,
        subject: finalSubject,
        body: finalBody,
        recipient_email: recipientEmail,
        status: emailSent ? 'sent' : 'failed',
        sent_at: emailSent ? new Date().toISOString() : null,
        error_message: errorMessage,
        external_id: externalId,
        sent_by: user.id,
      })
      .select('id')
      .single()

    // Update leads table if applicable
    if (inquiry) {
      await supabase
        .from('leads')
        .update({
          last_response_at: new Date().toISOString(),
          last_response_type: responseType,
          response_count: (inquiry.response_count || 0) + 1,
        })
        .eq('id', inquiryId)
    }

    if (!emailSent) {
      return NextResponse.json(
        {
          error: errorMessage || 'Greška pri slanju email-a',
          responseId: leadResponse?.id,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email uspešno poslat',
      responseId: leadResponse?.id,
      externalId,
    })

  } catch (error: any) {
    console.error('Error in send-response:', error)
    return NextResponse.json(
      { error: error.message || 'Interna greška servera' },
      { status: 500 }
    )
  }
}
