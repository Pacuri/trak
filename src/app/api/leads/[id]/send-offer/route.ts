import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

interface SendOfferRequest {
  package_id: string
  package_name: string
  destination: string
  room_type_id?: string
  room_type_name?: string
  meal_plan?: string
  selected_date?: string
  duration_nights?: number
  guests_adults?: number
  guests_children?: number
  guest_child_ages?: number[]
  price_total?: number
  currency?: string
  link_url: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Get current user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 403 })
    }

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, organization_id')
      .eq('id', leadId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const body: SendOfferRequest = await request.json()

    // Validate required fields
    if (!body.package_id || !body.package_name || !body.destination || !body.link_url) {
      return NextResponse.json(
        { error: 'Missing required fields: package_id, package_name, destination, link_url' },
        { status: 400 }
      )
    }

    // Generate unique tracking ID (8 chars, URL-safe)
    const trackingId = nanoid(8)

    // Create the sent offer record
    const { data: sentOffer, error: insertError } = await supabase
      .from('lead_sent_offers')
      .insert({
        lead_id: leadId,
        organization_id: userData.organization_id,
        package_id: body.package_id,
        package_name: body.package_name,
        destination: body.destination,
        room_type_id: body.room_type_id || null,
        room_type_name: body.room_type_name || null,
        meal_plan: body.meal_plan || null,
        selected_date: body.selected_date || null,
        duration_nights: body.duration_nights || null,
        guests_adults: body.guests_adults || null,
        guests_children: body.guests_children || null,
        guest_child_ages: body.guest_child_ages || null,
        price_total: body.price_total || null,
        currency: body.currency || 'EUR',
        tracking_id: trackingId,
        link_url: body.link_url,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Send Offer] Error creating record:', insertError)
      return NextResponse.json({ error: 'Failed to record sent offer' }, { status: 500 })
    }

    // Generate the tracking URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
    const trackingUrl = `${baseUrl}/api/t/${trackingId}`

    return NextResponse.json({
      success: true,
      sent_offer: sentOffer,
      tracking_url: trackingUrl,
      tracking_id: trackingId,
    })
  } catch (err) {
    console.error('[Send Offer] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Retrieve sent offers for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 403 })
    }

    // Get all sent offers for this lead
    const { data: offers, error: offersError } = await supabase
      .from('lead_sent_offers')
      .select('*')
      .eq('lead_id', leadId)
      .eq('organization_id', userData.organization_id)
      .order('sent_at', { ascending: false })

    if (offersError) {
      console.error('[Send Offer] Error fetching offers:', offersError)
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
    }

    return NextResponse.json({ offers: offers || [] })
  } catch (err) {
    console.error('[Send Offer] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
