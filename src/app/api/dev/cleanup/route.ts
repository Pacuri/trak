import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/dev/cleanup?email=xxx - Delete leads by email (for easy browser access)
export async function GET(request: Request) {
  return handleCleanup(request)
}

// DELETE /api/dev/cleanup?email=xxx - Delete leads by email
export async function DELETE(request: Request) {
  return handleCleanup(request)
}

async function handleCleanup(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const all = searchParams.get('all')
  const userEmail = searchParams.get('user') // Delete all data for a user's organization

  if (!email && !name && !all && !userEmail) {
    return NextResponse.json({ error: 'Email, name, all=true, or user=email required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // If user email provided, find their organization and delete all leads for it
  let organizationId: string | null = null
  if (userEmail) {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', userEmail)
      .single()

    if (userData?.organization_id) {
      organizationId = userData.organization_id
    } else {
      return NextResponse.json({ error: 'User not found or has no organization' }, { status: 404 })
    }
  }

  // Find leads with the specified email, name, or all
  let query = supabase.from('leads').select('id, name, email')

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  } else if (email) {
    query = query.eq('email', email)
  } else if (name) {
    query = query.ilike('name', `%${name}%`)
  }
  // If all=true, no filter - get all leads

  const { data: leads, error } = await query

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
