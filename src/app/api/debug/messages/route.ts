import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Debug endpoint to check messages for a lead
// GET /api/debug/messages?leadId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      // Return all recent messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, lead_id, direction, channel, subject, content, external_id, thread_id, status, sent_at, from_email, to_email')
        .order('sent_at', { ascending: false })
        .limit(20)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        count: messages?.length,
        messages: messages?.map(m => ({
          ...m,
          content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
        }))
      })
    }

    // Get messages for specific lead
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get the lead
    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, email, awaiting_response, last_customer_message_at')
      .eq('id', leadId)
      .single()

    return NextResponse.json({
      lead,
      messageCount: messages?.length,
      messages: messages?.map(m => ({
        ...m,
        content: m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
