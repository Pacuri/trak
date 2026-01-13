import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { QualificationData, PaymentOption } from '@/types'

interface CreateReservationBody {
  slug: string
  offer_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  adults: number
  children?: number
  child_ages?: number[]
  payment_option: PaymentOption
  qualification_data?: QualificationData
}

// POST /api/public/reservations
// Create a new reservation (72h hold)
export async function POST(request: NextRequest) {
  try {
    const body: CreateReservationBody = await request.json()

    const {
      slug,
      offer_id,
      customer_name,
      customer_phone,
      customer_email,
      adults,
      children = 0,
      child_ages,
      payment_option,
      qualification_data,
    } = body

    // Validate required fields
    if (!slug || !offer_id || !customer_name || !customer_phone || !adults) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get agency settings
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, reservation_hold_hours, deposit_percent')
      .eq('slug', slug)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Get offer details
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offer_id)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Ponuda nije pronađena' },
        { status: 404 }
      )
    }

    // Check capacity
    const totalGuests = adults + children
    if (offer.available_spots < totalGuests) {
      return NextResponse.json(
        { error: `Nema dovoljno mesta. Dostupno: ${offer.available_spots}` },
        { status: 400 }
      )
    }

    // Calculate pricing
    const totalPrice = offer.price_per_person * totalGuests
    const depositAmount = Math.round(totalPrice * (settings.deposit_percent / 100))

    // Calculate expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + settings.reservation_hold_hours)

    // Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        organization_id: settings.organization_id,
        offer_id,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        adults,
        children,
        child_ages: child_ages || null,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        amount_paid: 0,
        currency: offer.currency || 'EUR',
        payment_option,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        qualification_data: qualification_data || null,
      })
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city, departure_date, return_date, board_type, transport_type)
      `)
      .single()

    if (reservationError) {
      console.error('Error creating reservation:', reservationError)
      return NextResponse.json(
        { error: 'Greška pri kreiranju rezervacije' },
        { status: 500 }
      )
    }

    // Create lead for CRM tracking
    const { data: lead } = await supabase
      .from('leads')
      .insert({
        organization_id: settings.organization_id,
        name: customer_name,
        phone: customer_phone,
        email: customer_email || null,
        destination: `${offer.country}${offer.city ? `, ${offer.city}` : ''}`,
        travel_date: offer.departure_date,
        guests: totalGuests,
        value: totalPrice,
        source_type: 'trak_form',
        notes: `Rezervacija: ${reservation.code}`,
      })
      .select()
      .single()

    // Link lead to reservation
    if (lead) {
      await supabase
        .from('reservations')
        .update({ lead_id: lead.id })
        .eq('id', reservation.id)
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        code: reservation.code,
        expires_at: reservation.expires_at,
        total_price: reservation.total_price,
        deposit_amount: reservation.deposit_amount,
        offer: reservation.offer,
      },
    })
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Greška pri kreiranju rezervacije' },
      { status: 500 }
    )
  }
}

// GET /api/public/reservations?code=XXX
// Get reservation by code (public lookup)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Kod rezervacije je obavezan' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        id, code, customer_name, customer_phone, customer_email,
        adults, children, total_price, deposit_amount, amount_paid,
        status, expires_at, created_at,
        offer:offers(id, name, star_rating, country, city, departure_date, return_date, board_type, transport_type,
          images:offer_images(url, is_primary)
        )
      `)
      .eq('code', code.toUpperCase())
      .single()

    if (error || !reservation) {
      return NextResponse.json(
        { error: 'Rezervacija nije pronađena' },
        { status: 404 }
      )
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju rezervacije' },
      { status: 500 }
    )
  }
}
