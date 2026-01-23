import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find leads with the specified email
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, email')
    .eq('email', email)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ message: 'No leads found' })
  }

  const deletedLeads = []
  for (const lead of leads) {
    // Delete related records first
    await supabase.from('lead_activities').delete().eq('lead_id', lead.id)
    await supabase.from('messages').delete().eq('lead_id', lead.id)
    await supabase.from('offer_quotes').delete().eq('lead_id', lead.id)
    await supabase.from('lead_sent_offers').delete().eq('lead_id', lead.id)
    await supabase.from('bookings').delete().eq('lead_id', lead.id)

    // Finally delete the lead
    const { error: deleteError } = await supabase.from('leads').delete().eq('id', lead.id)
    if (!deleteError) {
      deletedLeads.push(lead)
    }
  }

  return NextResponse.json({ deleted: deletedLeads, count: deletedLeads.length })
}
