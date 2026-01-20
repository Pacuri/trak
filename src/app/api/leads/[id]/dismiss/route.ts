import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Dismiss a lead from the inbox (mark as not awaiting response)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Verify the lead belongs to this organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead nije pronađen' }, { status: 404 })
    }

    // Update the lead to mark as not awaiting response
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        awaiting_response: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error dismissing lead:', updateError)
      return NextResponse.json({ error: 'Greška pri odbacivanju' }, { status: 500 })
    }

    console.log(`[Dismiss] Lead ${id} dismissed from inbox by user ${user.id}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dismiss lead error:', error)
    return NextResponse.json({ error: error.message || 'Interna greška' }, { status: 500 })
  }
}
