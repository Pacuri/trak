import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { InquiryStatus } from '@/types'

// GET /api/inquiries/[id]
// Get a single inquiry by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    // Fetch inquiry
    const { data: inquiry, error } = await supabase
      .from('offer_inquiries')
      .select(`
        *,
        offer:offers(*,
          images:offer_images(id, url, alt_text, position, is_primary)
        ),
        responder:users!offer_inquiries_responded_by_fkey(id, full_name, email),
        alternative_offer:offers!offer_inquiries_alternative_offer_id_fkey(*),
        reservation:reservations(id, code, status, total_price)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !inquiry) {
      return NextResponse.json({ error: 'Upit nije pronađen' }, { status: 404 })
    }

    return NextResponse.json(inquiry)
  } catch (error) {
    console.error('Error fetching inquiry:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju upita' }, { status: 500 })
  }
}

interface RespondToInquiryBody {
  status: 'available' | 'unavailable' | 'alternative' | 'checking'
  response_note?: string
  alternative_offer_id?: string
  // For creating reservation when available
  create_reservation?: boolean
}

// PATCH /api/inquiries/[id]
// Respond to an inquiry (available, unavailable, or alternative)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    // Verify inquiry belongs to user's organization
    const { data: existingInquiry, error: existingError } = await supabase
      .from('offer_inquiries')
      .select(`
        *,
        offer:offers(id, name, organization_id, price_per_person, departure_date, return_date)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (existingError || !existingInquiry) {
      return NextResponse.json({ error: 'Upit nije pronađen' }, { status: 404 })
    }

    const body: RespondToInquiryBody = await request.json()

    // Validate status
    const validStatuses: InquiryStatus[] = ['available', 'unavailable', 'alternative', 'checking']
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Nevažeći status' }, { status: 400 })
    }

    // If alternative, require alternative_offer_id
    if (body.status === 'alternative' && !body.alternative_offer_id) {
      return NextResponse.json({ error: 'Morate izabrati alternativnu ponudu' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      status: body.status,
      response_note: body.response_note || null,
      updated_at: new Date().toISOString(),
    }

    // Only set responded fields for final statuses
    if (['available', 'unavailable', 'alternative'].includes(body.status)) {
      updates.responded_by = user.id
      updates.responded_at = new Date().toISOString()
    }

    if (body.alternative_offer_id) {
      updates.alternative_offer_id = body.alternative_offer_id
    }

    // Create reservation if marking as available and requested
    let reservationData = null
    if (body.status === 'available' && body.create_reservation && existingInquiry.offer) {
      const offer = existingInquiry.offer
      const qualification = existingInquiry.qualification_data || {}
      const adults = qualification.guests?.adults || 2
      const children = qualification.guests?.children || 0
      const totalGuests = adults + children

      // Get agency settings for hold time
      const { data: settings } = await supabase
        .from('agency_booking_settings')
        .select('reservation_hold_hours, deposit_percent')
        .eq('organization_id', userData.organization_id)
        .single()

      const holdHours = settings?.reservation_hold_hours || 72
      const depositPercent = settings?.deposit_percent || 20

      const totalPrice = offer.price_per_person * totalGuests
      const depositAmount = Math.round(totalPrice * (depositPercent / 100))

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + holdHours)

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          organization_id: userData.organization_id,
          offer_id: offer.id,
          customer_name: existingInquiry.customer_name,
          customer_phone: existingInquiry.customer_phone,
          customer_email: existingInquiry.customer_email,
          adults,
          children,
          child_ages: qualification.guests?.childAges || null,
          total_price: totalPrice,
          deposit_amount: depositAmount,
          amount_paid: 0,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          qualification_data: qualification,
        })
        .select('id, code')
        .single()

      if (!reservationError && reservation) {
        updates.reservation_id = reservation.id
        reservationData = reservation
      }
    }

    // Update inquiry
    const { data: updatedInquiry, error: updateError } = await supabase
      .from('offer_inquiries')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        offer:offers(id, name, star_rating, price_per_person),
        responder:users!offer_inquiries_responded_by_fkey(id, full_name),
        alternative_offer:offers!offer_inquiries_alternative_offer_id_fkey(id, name, price_per_person),
        reservation:reservations(id, code, status, expires_at)
      `)
      .single()

    if (updateError) {
      console.error('Error updating inquiry:', updateError)
      return NextResponse.json({ error: 'Greška pri ažuriranju upita' }, { status: 500 })
    }

    // TODO: Send email notification to customer based on response

    return NextResponse.json({
      ...updatedInquiry,
      reservation_created: reservationData,
    })
  } catch (error) {
    console.error('Error updating inquiry:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju upita' }, { status: 500 })
  }
}
