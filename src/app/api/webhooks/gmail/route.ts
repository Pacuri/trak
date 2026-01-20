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

      console.log(`[Gmail Webhook] Found ${newMessageIds.size} new messages to process:`, Array.from(newMessageIds))

      // Process each new message
      for (const messageId of newMessageIds) {
        console.log(`[Gmail Webhook] Processing message ID: ${messageId}`)
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
    console.log(`[Gmail Webhook] processNewEmail called for messageId: ${messageId}, orgId: ${organizationId}`)

    // Check if already processed in email_candidates
    const { data: existingCandidate } = await supabase
      .from('email_candidates')
      .select('id')
      .eq('gmail_message_id', messageId)
      .eq('organization_id', organizationId)
      .single()

    if (existingCandidate) {
      console.log(`[Gmail Webhook] Message ${messageId} already in email_candidates, skipping`)
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
      console.log(`[Gmail Webhook] Message ${messageId} already in messages, skipping`)
      return // Already processed
    }

    console.log(`[Gmail Webhook] Message ${messageId} passed duplicate checks, proceeding...`)

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

    console.log(`[Gmail Webhook] Processing message ${messageId}:`)
    console.log(`[Gmail Webhook]   From: ${from}`)
    console.log(`[Gmail Webhook]   Subject: ${subject}`)
    console.log(`[Gmail Webhook]   Labels: ${labelIds.join(', ')}`)
    console.log(`[Gmail Webhook]   Thread ID: ${message.threadId}`)

    if (
      labelIds.includes('CATEGORY_PROMOTIONS') ||
      labelIds.includes('CATEGORY_SOCIAL') ||
      labelIds.includes('CATEGORY_UPDATES') ||
      labelIds.includes('SPAM')
    ) {
      console.log(`[Gmail Webhook] Skipping - promotional/social/updates/spam`)
      return
    }

    // Only process INBOX emails
    if (!labelIds.includes('INBOX')) {
      console.log(`[Gmail Webhook] Skipping - not in INBOX`)
      return
    }

    // Skip SENT emails - these are outbound messages sent by us, not inbound
    if (labelIds.includes('SENT')) {
      console.log(`[Gmail Webhook] Skipping - SENT label (our own outbound message)`)
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

    // Clean content - strip email reply quotes
    // Gmail format: "On Mon, Jan 20, 2026 at 8:51 PM Someone <email@example.com> wrote:"
    content = content
      .split(/\nOn [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2}\s*[AP]M\s+[^<]*<[^>]+>\s*wrote:/i)[0]
      .split(/\n\s*On .+ wrote:/)[0]
      .split(/\n-{2,}\s*Forwarded/)[0]
      .split(/\n\s*--\s*\n/)[0]
      .replace(/https?:\/\/[^\s]{100,}/g, '[link]')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...'
    }

    const emailDate = date ? new Date(date).toISOString() : new Date().toISOString()

    // STEP 1: Check if this is part of an existing thread (same gmail thread_id)
    console.log(`[Gmail Webhook] Looking for existing thread with thread_id: ${message.threadId}`)

    const { data: existingThreadMessage, error: threadError } = await supabase
      .from('messages')
      .select('lead_id, lead:leads(id, name)')
      .eq('organization_id', organizationId)
      .eq('thread_id', message.threadId)
      .not('lead_id', 'is', null)
      .limit(1)
      .single()

    console.log(`[Gmail Webhook] Thread lookup result:`, JSON.stringify(existingThreadMessage), 'error:', threadError?.message)

    if (existingThreadMessage?.lead_id) {
      console.log(`[Gmail Webhook] Found existing thread! lead_id:`, existingThreadMessage.lead_id)
      // Same thread - add message to existing lead
      const leadId = existingThreadMessage.lead_id
      const leadName = (existingThreadMessage.lead as any)?.name || 'Unknown'

      console.log(`[Gmail Webhook] Adding message to existing thread for lead ${leadName} (${leadId})`)
      console.log(`[Gmail Webhook] Message details: from=${fromEmail}, subject=${subject}, content length=${content?.length}`)
      console.log(`[Gmail Webhook] Full insert data:`, {
        lead_id: leadId,
        organization_id: organizationId,
        direction: 'inbound',
        channel: 'email',
        subject: subject || '(Bez naslova)',
        content: (content || snippet || '').substring(0, 100),
        from_email: fromEmail,
        from_name: fromName,
        to_email: to,
        external_id: messageId,
        thread_id: message.threadId,
        status: 'sent',
        sent_at: emailDate,
      })

      // Insert the message
      const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert({
        lead_id: leadId,
        organization_id: organizationId,
        direction: 'inbound',
        channel: 'email',
        subject: subject || '(Bez naslova)',
        content: content || snippet || '',
        from_email: fromEmail,
        from_name: fromName,
        to_email: to,
        external_id: messageId,
        thread_id: message.threadId,
        status: 'sent',
        sent_at: emailDate,
      }).select().single()

      if (insertError) {
        console.error(`[Gmail Webhook] ERROR inserting message:`, insertError)
        console.error(`[Gmail Webhook] Insert error code:`, insertError.code)
        console.error(`[Gmail Webhook] Insert error message:`, insertError.message)
        console.error(`[Gmail Webhook] Insert error details:`, insertError.details)
        console.error(`[Gmail Webhook] Insert error hint:`, insertError.hint)

        // Try without .select().single() to see if that's the issue
        console.log(`[Gmail Webhook] Retrying insert without .select().single()...`)
        const { error: retryError } = await supabase.from('messages').insert({
          lead_id: leadId,
          organization_id: organizationId,
          direction: 'inbound',
          channel: 'email',
          subject: subject || '(Bez naslova)',
          content: content || snippet || '',
          from_email: fromEmail,
          from_name: fromName,
          to_email: to,
          external_id: messageId,
          thread_id: message.threadId,
          status: 'sent',
          sent_at: emailDate,
        })

        if (retryError) {
          console.error(`[Gmail Webhook] Retry also failed:`, retryError)
        } else {
          console.log(`[Gmail Webhook] Retry succeeded!`)
        }
      } else {
        console.log(`[Gmail Webhook] Message inserted successfully:`, insertedMessage?.id)
      }

      // Update lead: set awaiting_response = true and update last_customer_message_at
      await supabase
        .from('leads')
        .update({
          awaiting_response: true,
          last_customer_message_at: emailDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)

      console.log(`New message added to existing thread for lead ${leadName} (${leadId}) from ${fromEmail}`)
      return
    }

    // STEP 2: Check if we've had this email address before (returning customer)
    const { data: previousLeads } = await supabase
      .from('leads')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('email', fromEmail)
      .order('created_at', { ascending: false })
      .limit(1)

    const isReturningCustomer = previousLeads && previousLeads.length > 0

    // STEP 3: New thread - add to email_candidates for review
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
      is_returning_customer: isReturningCustomer,
    })

    console.log(`New email candidate created: ${fromEmail} - ${subject}${isReturningCustomer ? ' (Postojeći klijent)' : ''}`)
  } catch (error: any) {
    console.error(`[Gmail Webhook] FATAL Error processing message ${messageId}:`, error)
    console.error(`[Gmail Webhook] Error name:`, error?.name)
    console.error(`[Gmail Webhook] Error message:`, error?.message)
    console.error(`[Gmail Webhook] Error stack:`, error?.stack)
  }
}
