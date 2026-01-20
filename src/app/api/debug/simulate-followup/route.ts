import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simulate what happens when a follow-up email arrives for an existing lead
// POST /api/debug/simulate-followup
// Body: { lead_id, thread_id, content }
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { lead_id, content } = body

    if (!lead_id) {
      return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 })
    }

    // Get the lead to find organization_id and thread_id
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, email, organization_id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found', details: leadError }, { status: 404 })
    }

    console.log('[Simulate] Found lead:', lead)

    // Find existing message with thread_id for this lead
    const { data: existingMessage, error: messageError } = await supabase
      .from('messages')
      .select('thread_id, subject')
      .eq('lead_id', lead_id)
      .not('thread_id', 'is', null)
      .limit(1)
      .single()

    console.log('[Simulate] Existing message:', existingMessage, 'error:', messageError)

    const threadId = existingMessage?.thread_id || 'simulated-thread-' + Date.now()
    const subject = existingMessage?.subject || 'Test Subject'

    // Simulate the exact insert that the webhook does
    const messageData = {
      lead_id: lead.id,
      organization_id: lead.organization_id,
      direction: 'inbound',
      channel: 'email',
      subject: subject,
      content: content || 'Simulated follow-up message content',
      from_email: lead.email || 'customer@example.com',
      from_name: lead.name || 'Customer',
      to_email: 'test@agency.com',
      external_id: 'simulated-' + Date.now(),
      thread_id: threadId,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }

    console.log('[Simulate] Inserting message with data:', messageData)

    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (insertError) {
      console.error('[Simulate] Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        messageData,
      }, { status: 500 })
    }

    console.log('[Simulate] Message inserted:', insertedMessage)

    // Update lead's awaiting_response
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        awaiting_response: true,
        last_customer_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)
      .select('awaiting_response, last_customer_message_at')
      .single()

    console.log('[Simulate] Lead updated:', updatedLead, 'error:', updateError)

    return NextResponse.json({
      success: true,
      message: insertedMessage,
      lead: updatedLead,
      threadId,
    })
  } catch (error: any) {
    console.error('[Simulate] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
