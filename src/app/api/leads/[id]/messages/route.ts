import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// GET - Fetch messages for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params
    const supabase = await createClient()

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organizacija nije pronađena' }, { status: 400 })
    }

    // Verify lead belongs to organization
    const { data: lead } = await supabase
      .from('leads')
      .select('id, email, name')
      .eq('id', leadId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Upit nije pronađen' }, { status: 404 })
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Greška pri učitavanju poruka' }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}

// POST - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { content, subject } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Poruka je obavezna' }, { status: 400 })
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 })
    }

    // Get user's organization and name
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
      .select('name')
      .eq('id', userData.organization_id)
      .single()

    // Get lead with email
    const { data: lead } = await supabase
      .from('leads')
      .select('id, email, name')
      .eq('id', leadId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Upit nije pronađen' }, { status: 404 })
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'Klijent nema email adresu' }, { status: 400 })
    }

    // Get email integration
    const { data: emailIntegration } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .single()

    if (!emailIntegration) {
      return NextResponse.json(
        { error: 'Email nije povezan. Idite na Podešavanja > Integracije.' },
        { status: 400 }
      )
    }

    // Check if there's an existing thread - get thread_id and the original message's external_id
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('thread_id, external_id, subject')
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .not('thread_id', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    // Also get the FIRST inbound message to get the original Message-ID for proper threading
    const { data: firstInboundMessage } = await supabase
      .from('messages')
      .select('external_id, subject')
      .eq('lead_id', leadId)
      .eq('channel', 'email')
      .eq('direction', 'inbound')
      .order('sent_at', { ascending: true })
      .limit(1)
      .single()

    // Send via Gmail API
    let emailSent = false
    let externalId: string | null = null
    let threadId: string | null = lastMessage?.thread_id || null

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )

      oauth2Client.setCredentials({
        access_token: emailIntegration.access_token,
        refresh_token: emailIntegration.refresh_token,
      })

      // Refresh token if expired
      if (emailIntegration.token_expires_at && new Date(emailIntegration.token_expires_at) < new Date()) {
        const { credentials } = await oauth2Client.refreshAccessToken()
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

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Get the original email's Message-ID header for proper threading
      let originalMessageId: string | null = null
      const messageIdToFetch = firstInboundMessage?.external_id || lastMessage?.external_id

      if (messageIdToFetch && threadId) {
        try {
          const originalEmail = await gmail.users.messages.get({
            userId: 'me',
            id: messageIdToFetch,
            format: 'metadata',
            metadataHeaders: ['Message-ID'],
          })

          const messageIdHeader = originalEmail.data.payload?.headers?.find(
            (h: any) => h.name?.toLowerCase() === 'message-id'
          )
          originalMessageId = messageIdHeader?.value || null
        } catch (e) {
          console.error('Could not fetch original message ID:', e)
        }
      }

      // Build email
      const fromName = emailIntegration.display_name || organization?.name || ''
      const fromEmail = emailIntegration.email_address
      const toName = lead.name || ''
      const toEmail = lead.email

      // Use original subject with Re: prefix if replying
      const originalSubject = firstInboundMessage?.subject || lastMessage?.subject
      const emailSubject = subject || (originalSubject
        ? (originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`)
        : 'Re: Upit za putovanje')

      // Create raw email message
      const messageParts = [
        `From: ${fromName} <${fromEmail}>`,
        `To: ${toName ? `${toName} <${toEmail}>` : toEmail}`,
        `Subject: =?UTF-8?B?${Buffer.from(emailSubject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
      ]

      // Add thread reference headers using the actual Message-ID (not Gmail's internal thread ID)
      // This is required for proper email threading on the recipient's side
      if (originalMessageId) {
        messageParts.splice(3, 0, `References: ${originalMessageId}`)
        messageParts.splice(4, 0, `In-Reply-To: ${originalMessageId}`)
      }

      messageParts.push('', Buffer.from(content).toString('base64'))

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
          threadId: threadId || undefined,
        },
      })

      emailSent = true
      externalId = response.data.id || null
      threadId = response.data.threadId || threadId

      // Update last_used_at
      await supabase
        .from('email_integrations')
        .update({ last_used_at: new Date().toISOString(), last_error: null })
        .eq('id', emailIntegration.id)

    } catch (gmailError: any) {
      console.error('Gmail API error:', gmailError)

      await supabase
        .from('email_integrations')
        .update({ last_error: gmailError.message })
        .eq('id', emailIntegration.id)

      return NextResponse.json(
        { error: 'Greška pri slanju email-a: ' + gmailError.message },
        { status: 500 }
      )
    }

    // Store message in database
    const now = new Date().toISOString()
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        lead_id: leadId,
        organization_id: userData.organization_id,
        direction: 'outbound',
        channel: 'email',
        subject: subject || 'Re: Upit za putovanje',
        content: content,
        from_email: emailIntegration.email_address,
        from_name: emailIntegration.display_name || organization?.name,
        to_email: lead.email,
        to_name: lead.name,
        external_id: externalId,
        thread_id: threadId,
        status: 'sent',
        sent_at: now,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing message:', insertError)
    }

    // Get current lead stage to check if we need to auto-progress
    const { data: currentLead } = await supabase
      .from('leads')
      .select('stage_id')
      .eq('id', leadId)
      .single()

    // Get pipeline stages to determine if we should auto-progress to "Kontaktiran"
    let newStageId = currentLead?.stage_id
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, position, name')
      .eq('organization_id', userData.organization_id)
      .eq('is_won', false)
      .eq('is_lost', false)
      .order('position', { ascending: true })

    if (stages && stages.length >= 2) {
      const firstStage = stages[0]
      const kontaktiranStage = stages[1] // Second stage = "Kontaktiran"

      // If lead is in first stage (or no stage), move to "Kontaktiran"
      if (currentLead?.stage_id === firstStage.id || currentLead?.stage_id === null) {
        newStageId = kontaktiranStage.id
      }
    }

    // Update lead's last contact, mark as responded, and optionally update stage
    console.log('[Messages API] Updating lead:', leadId, 'setting awaiting_response: false')

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        last_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        awaiting_response: false,
        ...(newStageId !== currentLead?.stage_id ? { stage_id: newStageId } : {}),
      })
      .eq('id', leadId)
      .select('awaiting_response, stage_id')
      .single()

    console.log('[Messages API] Update result - updatedLead:', updatedLead, 'error:', updateError)

    if (updateError) {
      console.error('[Messages API] Error updating lead:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: message,
      leadUpdated: !updateError,
      awaiting_response: updatedLead?.awaiting_response ?? false,
      stage_id: updatedLead?.stage_id,
    })

  } catch (error: any) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
