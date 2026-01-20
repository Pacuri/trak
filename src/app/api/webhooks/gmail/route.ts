import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Create Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Gmail Push Notification webhook
// Called by Google Pub/Sub when new email arrives
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient()

  try {
    const body = await request.json()

    // Pub/Sub sends base64 encoded data
    if (!body.message?.data) {
      return NextResponse.json({ error: 'No message data' }, { status: 400 })
    }

    // Decode the Pub/Sub message
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const notification = JSON.parse(decodedData)

    // notification contains: { emailAddress, historyId }
    const { emailAddress, historyId } = notification

    if (!emailAddress || !historyId) {
      console.log('Invalid notification:', notification)
      return NextResponse.json({ received: true })
    }

    console.log(`Gmail notification for ${emailAddress}, historyId: ${historyId}`)

    // Find the email integration for this email address
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('email_address', emailAddress)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      console.log(`No active integration for ${emailAddress}`)
      return NextResponse.json({ received: true })
    }

    // Setup Gmail API
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
        return NextResponse.json({ received: true })
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get history since last known historyId
    const startHistoryId = integration.history_id || historyId

    try {
      const { data: historyData } = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      })

      if (!historyData.history) {
        // No new messages
        await supabase
          .from('email_integrations')
          .update({ history_id: historyId })
          .eq('id', integration.id)
        return NextResponse.json({ received: true })
      }

      // Collect new message IDs
      const newMessageIds = new Set<string>()
      for (const item of historyData.history) {
        if (item.messagesAdded) {
          for (const msg of item.messagesAdded) {
            if (msg.message?.id) {
              newMessageIds.add(msg.message.id)
            }
          }
        }
      }

      // Process each new message
      for (const messageId of newMessageIds) {
        await processNewEmail(gmail, messageId, integration.organization_id, supabase)
      }

      // Update history_id
      await supabase
        .from('email_integrations')
        .update({ history_id: historyId })
        .eq('id', integration.id)

    } catch (historyError: any) {
      console.error('History fetch error:', historyError)

      // If history is too old, just update the historyId and continue
      if (historyError.code === 404) {
        await supabase
          .from('email_integrations')
          .update({ history_id: historyId })
          .eq('id', integration.id)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Gmail webhook error:', error)
    // Always return 200 to prevent Pub/Sub retries
    return NextResponse.json({ received: true, error: error.message })
  }
}

async function processNewEmail(
  gmail: any,
  messageId: string,
  organizationId: string,
  supabase: any
) {
  try {
    // Check if already processed in email_candidates
    const { data: existingCandidate } = await supabase
      .from('email_candidates')
      .select('id')
      .eq('gmail_message_id', messageId)
      .eq('organization_id', organizationId)
      .single()

    if (existingCandidate) {
      return // Already processed
    }

    // Check if already processed in messages
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', messageId)
      .eq('organization_id', organizationId)
      .single()

    if (existingMessage) {
      return // Already processed
    }

    // Fetch message details
    const { data: message } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })

    const headers = message.payload?.headers || []
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

    const from = getHeader('From')
    const to = getHeader('To')
    const subject = getHeader('Subject')
    const date = getHeader('Date')

    // Skip if from noreply or obvious junk
    const fromLower = from.toLowerCase()
    if (
      fromLower.includes('noreply') ||
      fromLower.includes('no-reply') ||
      fromLower.includes('mailer-daemon') ||
      fromLower.includes('postmaster') ||
      fromLower.includes('newsletter') ||
      fromLower.includes('notifications@')
    ) {
      return
    }

    // Check labels - skip promotions, social, updates
    const labelIds = message.labelIds || []
    if (
      labelIds.includes('CATEGORY_PROMOTIONS') ||
      labelIds.includes('CATEGORY_SOCIAL') ||
      labelIds.includes('CATEGORY_UPDATES') ||
      labelIds.includes('SPAM')
    ) {
      return
    }

    // Only process INBOX emails
    if (!labelIds.includes('INBOX')) {
      return
    }

    // Parse from field
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
    const fromName = fromMatch ? fromMatch[1].trim().replace(/"/g, '') : ''
    const fromEmail = fromMatch ? fromMatch[2].trim() : from.trim()

    // Get snippet (short preview)
    const snippet = message.snippet || ''

    // Get body content
    let content = ''
    const extractBody = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
      if (part.parts) {
        for (const p of part.parts) {
          const result = extractBody(p)
          if (result) return result
        }
      }
      return ''
    }

    if (message.payload?.body?.data) {
      content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
    } else if (message.payload?.parts) {
      content = extractBody(message.payload)
    }

    // Clean content
    content = content
      .split(/\n\s*On .+ wrote:|\n-{2,}\s*Forwarded|\n\s*--\s*\n/)[0]
      .replace(/https?:\/\/[^\s]{100,}/g, '[link]')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...'
    }

    const emailDate = date ? new Date(date).toISOString() : new Date().toISOString()

    // CHECK: Is this email from an existing lead?
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('email', fromEmail)
      .eq('is_archived', false)
      .single()

    if (existingLead) {
      // This is a reply from an existing lead - add to messages table directly
      await supabase.from('messages').insert({
        lead_id: existingLead.id,
        organization_id: organizationId,
        direction: 'inbound',
        channel: 'email',
        subject: subject || '(Bez naslova)',
        content: content || snippet,
        from_email: fromEmail,
        from_name: fromName,
        to_email: to,
        external_id: messageId,
        thread_id: message.threadId,
        status: 'received',
        sent_at: emailDate,
      })

      // Update lead: set awaiting_response = true and update last_customer_message_at
      await supabase
        .from('leads')
        .update({
          awaiting_response: true,
          last_customer_message_at: emailDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)

      console.log(`New message added to lead ${existingLead.name} (${existingLead.id}) from ${fromEmail}`)
    } else {
      // New sender - add to email_candidates for review
      await supabase.from('email_candidates').insert({
        organization_id: organizationId,
        gmail_message_id: messageId,
        gmail_thread_id: message.threadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: to,
        subject: subject || '(Bez naslova)',
        snippet: snippet,
        content: content,
        status: 'pending',
        email_date: emailDate,
      })

      console.log(`New email candidate created: ${fromEmail} - ${subject}`)
    }
  } catch (error) {
    console.error(`Error processing message ${messageId}:`, error)
  }
}
