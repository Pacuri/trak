import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      lead_id,
      inquiry_id,
      package_id,
      package_snapshot: providedSnapshot,
      customer_name,
      customer_email,
      travel_dates,
      guests,
      destination,
      price_breakdown,
      total_amount,
      agent_message,
      valid_days = 7 // Default 7 days validity
    } = body

    // Use provided snapshot or build from package_id
    let package_snapshot: Record<string, unknown> = providedSnapshot || {}
    if (package_id && !providedSnapshot) {
      const { data: pkg } = await supabase
        .from('packages')
        .select(`
          id,
          name,
          description,
          star_rating,
          accommodation_type,
          board_type,
          transport_type,
          country,
          city
        `)
        .eq('id', package_id)
        .single()

      if (pkg) {
        // Get package images
        const { data: images } = await supabase
          .from('package_images')
          .select('url')
          .eq('package_id', package_id)
          .order('position', { ascending: true })

        package_snapshot = {
          ...pkg,
          images: images?.map(i => i.url) || []
        }
      }
    }

    // If lead_id provided but no customer info, get from lead
    let finalCustomerName = customer_name
    let finalCustomerEmail = customer_email
    if (lead_id && (!customer_name || !customer_email)) {
      const { data: lead } = await supabase
        .from('leads')
        .select('name, email')
        .eq('id', lead_id)
        .single()

      if (lead) {
        finalCustomerName = customer_name || lead.name
        finalCustomerEmail = customer_email || lead.email
      }
    }

    // Create offer quote
    const { data: offer, error: createError } = await supabase
      .from('offer_quotes')
      .insert({
        organization_id: userData.organization_id,
        lead_id,
        inquiry_id,
        package_id,
        package_snapshot,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail,
        travel_dates,
        guests,
        destination,
        price_breakdown: price_breakdown || { total: total_amount },
        total_amount: total_amount || 0,
        agent_message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + valid_days * 24 * 60 * 60 * 1000).toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating offer:', createError)
      return NextResponse.json({ error: 'Greška pri kreiranju ponude' }, { status: 500 })
    }

    // Update lead stage to "Ponuda poslata" if lead exists
    if (lead_id) {
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('organization_id', userData.organization_id)
        .eq('is_won', false)
        .eq('is_lost', false)
        .order('position', { ascending: true })

      const ponudaStage = stages?.find(s =>
        s.name.toLowerCase().includes('ponuda') ||
        s.name.toLowerCase().includes('poslat')
      ) || stages?.[2]

      if (ponudaStage) {
        await supabase
          .from('leads')
          .update({
            stage_id: ponudaStage.id,
            awaiting_response: false,
            last_response_at: new Date().toISOString()
          })
          .eq('id', lead_id)
      }
    }

    // Update inquiry status if provided
    if (inquiry_id) {
      await supabase
        .from('custom_inquiries')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('id', inquiry_id)
    }

    // Generate offer URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
    const offerUrl = `${baseUrl}/ponuda/${offer.id}`

    return NextResponse.json({
      offer,
      offer_url: offerUrl
    })

  } catch (error) {
    console.error('Error creating offer:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}

// GET - list offer quotes for an organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Niste prijavljeni' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organizacija nije pronađena' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('lead_id')

    let query = supabase
      .from('offer_quotes')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    const { data: offers, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Greška pri učitavanju ponuda' }, { status: 500 })
    }

    return NextResponse.json(offers)

  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
