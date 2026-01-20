import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Test endpoint to verify message inserts work
// POST /api/debug/test-insert
export async function POST(request: NextRequest) {
  try {
    // Use service role key like the webhook does
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { lead_id, organization_id, content } = body

    if (!lead_id || !organization_id) {
      return NextResponse.json({ error: 'Missing lead_id or organization_id' }, { status: 400 })
    }

    console.log('[Test Insert] Attempting insert with:', { lead_id, organization_id, content })

    // Try the exact same insert as the webhook
    const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert({
      lead_id,
      organization_id,
      direction: 'inbound',
      channel: 'email',
      subject: 'Test Message',
      content: content || 'Test content from debug endpoint',
      from_email: 'test@example.com',
      from_name: 'Test User',
      to_email: 'your@email.com',
      external_id: 'test-' + Date.now(),
      thread_id: 'test-thread-' + Date.now(),
      status: 'sent',
      sent_at: new Date().toISOString(),
    }).select().single()

    if (insertError) {
      console.error('[Test Insert] Error:', insertError)
      return NextResponse.json({
        success: false,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      }, { status: 500 })
    }

    console.log('[Test Insert] Success:', insertedMessage)
    return NextResponse.json({
      success: true,
      message: insertedMessage,
    })
  } catch (error: any) {
    console.error('[Test Insert] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
