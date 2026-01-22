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
        source_type,
        destination,
        guests,
        notes,
        stage:pipeline_stages(id, name, color)
      `)
      .eq('organization_id', userData.organization_id)
      .eq('awaiting_response', true)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('last_customer_message_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }) // Fallback for NULL last_customer_message_at
      .limit(20)

    console.log('[Inbox API] Found leads:', leads?.length, 'for org:', userData.organization_id)

    if (leadsError) {
      console.error('Error fetching inbox:', leadsError)
      return NextResponse.json({ error: 'Greška pri učitavanju' }, { status: 500 })
    }

    // Helper to strip email quotes from content
    const stripEmailQuote = (content: string): string => {
      if (!content) return content
      return content
        .split(/\nOn [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2}\s*[AP]M\s+[^<]*<[^>]+>\s*wrote:/i)[0]
        .split(/\n\s*On .+ wrote:/)[0]
        .split(/\n-{2,}\s*Forwarded/)[0]
        .trim()
    }

    // For each lead, get the last message preview, unread count, and package name for trak leads
    const leadsWithLastMessage = await Promise.all(
      (leads || []).map(async (lead) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, content, subject, sent_at, direction, channel')
          .eq('lead_id', lead.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        // Find the last outbound message (our reply)
        const { data: lastOutbound } = await supabase
          .from('messages')
          .select('sent_at')
          .eq('lead_id', lead.id)
          .eq('direction', 'outbound')
          .order('sent_at', { ascending: false })
          .limit(1)
          .single()

        // Count inbound messages since our last reply (or all if we never replied)
        let unreadQuery = supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('direction', 'inbound')

        if (lastOutbound?.sent_at) {
          unreadQuery = unreadQuery.gt('sent_at', lastOutbound.sent_at)
        }

        const { count: unreadCount } = await unreadQuery

        // For trak leads, get package name from custom_inquiry
        let packageName: string | null = null
        if (lead.source_type === 'trak') {
          const { data: inquiry } = await supabase
            .from('custom_inquiries')
            .select('qualification_data')
            .eq('lead_id', lead.id)
            .single()

          if (inquiry?.qualification_data?.package_name) {
            packageName = inquiry.qualification_data.package_name
          }
        }

        return {
          ...lead,
          last_message: lastMessage ? {
            ...lastMessage,
            content: stripEmailQuote(lastMessage.content),
          } : null,
          unread_count: unreadCount || 0,
          package_name: packageName,
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Inbox GET error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
