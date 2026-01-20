import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Accept email candidate and create lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
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

    // Get the candidate
    const { data: candidate, error: candidateError } = await supabase
      .from('email_candidates')
      .select('*')
      .eq('id', candidateId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Email nije pronađen' }, { status: 404 })
    }

    if (candidate.status !== 'pending') {
      return NextResponse.json({ error: 'Email je već obrađen' }, { status: 400 })
    }

    // Get the first pipeline stage
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .eq('is_won', false)
      .eq('is_lost', false)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    // Create lead from candidate with awaiting_response = true
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: userData.organization_id,
        name: candidate.from_name || candidate.from_email.split('@')[0],
        email: candidate.from_email,
        source_type: 'email',
        stage_id: firstStage?.id || null,
        original_message: candidate.content || candidate.snippet,
        notes: `Email: ${candidate.subject}\n\n${candidate.content || candidate.snippet}`,
        awaiting_response: true,
        last_customer_message_at: candidate.email_date || new Date().toISOString(),
      })
      .select()
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return NextResponse.json({ error: 'Greška pri kreiranju upita' }, { status: 500 })
    }

    // Update candidate status
    await supabase
      .from('email_candidates')
      .update({
        status: 'accepted',
        lead_id: lead.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', candidateId)

    // Also create initial message in messages table
    const now = new Date().toISOString()
    const messageContent = candidate.content || candidate.snippet || '(Bez sadržaja)'

    console.log('[Accept] Creating message with:', {
      subject: candidate.subject,
      content: messageContent,
      contentLength: messageContent?.length,
      candidateContent: candidate.content,
      candidateSnippet: candidate.snippet,
    })

    const { data: createdMessage, error: messageError } = await supabase.from('messages').insert({
      lead_id: lead.id,
      organization_id: userData.organization_id,
      direction: 'inbound',
      channel: 'email',
      subject: candidate.subject || '(Bez naslova)',
      content: messageContent,
      from_email: candidate.from_email,
      from_name: candidate.from_name,
      to_email: candidate.to_email,
      external_id: candidate.gmail_message_id,
      thread_id: candidate.gmail_thread_id,
      status: 'sent',
      sent_at: candidate.email_date || now,
    }).select().single()

    if (messageError) {
      console.error('[Accept] Error creating initial message:', messageError)
    } else {
      console.log('[Accept] Message created successfully:', createdMessage?.id, 'content:', createdMessage?.content?.substring(0, 50))
    }

    return NextResponse.json({
      success: true,
      lead: lead,
    })
  } catch (error: any) {
    console.error('Accept candidate error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
