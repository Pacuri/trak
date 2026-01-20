import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

// POST - Sync messages from Gmail for this lead
export async function POST(
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

    // Get lead
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
        { error: 'Email nije povezan' },
        { status: 400 }
      )
    }

    // Setup Gmail API
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

    // Search for emails from/to this contact - limit to last 30 days and max 20 messages
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const afterDate = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/')

    const query = `(from:${lead.email} OR to:${lead.email}) after:${afterDate}`

    const { data: searchResult } = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
    })

    if (!searchResult.messages || searchResult.messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nema email poruka sa ovim kontaktom',
        synced: 0
      })
    }

    // Get existing external IDs to avoid duplicates
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('external_id')
      .eq('lead_id', leadId)
      .not('external_id', 'is', null)

    const existingIds = new Set(existingMessages?.map(m => m.external_id) || [])

    // Fetch and store new messages
    let syncedCount = 0
    const messagesToInsert: any[] = []

    for (const msg of searchResult.messages) {
      if (existingIds.has(msg.id)) continue

      try {
        const { data: fullMessage } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        })

        const headers = fullMessage.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

        const from = getHeader('From')
        const to = getHeader('To')
        const subject = getHeader('Subject')
        const date = getHeader('Date')

        // Determine direction
        const isFromLead = from.toLowerCase().includes(lead.email!.toLowerCase())
        const direction = isFromLead ? 'inbound' : 'outbound'

        // Extract email and name from "Name <email>" format
        const parseEmailField = (field: string) => {
          const match = field.match(/^(.+?)\s*<(.+?)>$/)
          if (match) {
            return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() }
          }
          return { name: '', email: field.trim() }
        }

        const fromParsed = parseEmailField(from)
        const toParsed = parseEmailField(to)

        // Get message body
        let body = ''
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

        if (fullMessage.payload?.body?.data) {
          body = Buffer.from(fullMessage.payload.body.data, 'base64').toString('utf-8')
        } else if (fullMessage.payload?.parts) {
          body = extractBody(fullMessage.payload)
        }

        // Clean up body
        let cleanBody = body
          // Remove quoted replies
          .split(/\n\s*On .+ wrote:|\n-{2,}\s*Forwarded|\n\s*--\s*\n/)[0]
          // Remove long URLs (over 100 chars)
          .replace(/https?:\/\/[^\s]{100,}/g, '[link]')
          // Remove excessive whitespace
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        // Limit content length to 2000 chars
        if (cleanBody.length > 2000) {
          cleanBody = cleanBody.substring(0, 2000) + '...'
        }

        // Skip if body is too short (likely just signatures or empty)
        if (cleanBody.length < 5) {
          continue
        }

        messagesToInsert.push({
          lead_id: leadId,
          organization_id: userData.organization_id,
          direction,
          channel: 'email',
          subject: subject || '(Bez naslova)',
          content: cleanBody || body,
          from_email: fromParsed.email,
          from_name: fromParsed.name,
          to_email: toParsed.email,
          to_name: toParsed.name,
          external_id: msg.id,
          thread_id: fullMessage.threadId,
          status: 'sent',
          sent_at: date ? new Date(date).toISOString() : new Date().toISOString(),
        })

        syncedCount++
      } catch (err) {
        console.error(`Error fetching message ${msg.id}:`, err)
      }
    }

    // Insert all messages
    if (messagesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert)

      if (insertError) {
        console.error('Error inserting messages:', insertError)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Sinhronizovano ${syncedCount} poruka`,
    })

  } catch (error: any) {
    console.error('Messages sync error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
