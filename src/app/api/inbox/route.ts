import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch leads awaiting response (for inbox widget)
export async function GET(request: NextRequest) {
  try {
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

    // Fetch leads awaiting response, ordered by longest waiting first
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        stage_id,
        value,
        awaiting_response,
        last_customer_message_at,
        created_at,
        stage:pipeline_stages(id, name, color)
      `)
      .eq('organization_id', userData.organization_id)
      .eq('awaiting_response', true)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('last_customer_message_at', { ascending: true }) // Longest waiting first
      .limit(20)

    if (leadsError) {
      console.error('Error fetching inbox:', leadsError)
      return NextResponse.json({ error: 'Greška pri učitavanju' }, { status: 500 })
    }

    // For each lead, get the last message preview
    const leadsWithLastMessage = await Promise.all(
      (leads || []).map(async (lead) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, content, subject, sent_at, direction')
          .eq('lead_id', lead.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...lead,
          last_message: lastMessage || null,
        }
      })
    )

    // Get count
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .eq('awaiting_response', true)
      .or('is_archived.is.null,is_archived.eq.false')

    return NextResponse.json({
      leads: leadsWithLastMessage,
      count: count || 0,
    })
  } catch (error: any) {
    console.error('Inbox GET error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
