import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { BookingStatus, PaymentMethod, PaymentStatus } from '@/types'

// GET /api/bookings
// List bookings for the authenticated user's organization
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as BookingStatus | null
    const offerId = searchParams.get('offer_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city, departure_date, return_date),
        lead:leads(id, name, phone, email),
        closer:users!bookings_closed_by_fkey(id, full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('booked_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (offerId) {
      query = query.eq('offer_id', offerId)
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }

    const { data: bookings, error, count } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Greška pri učitavanju prodaja' }, { status: 500 })
    }

    // Calculate summary stats
    let totalRevenue = 0
    let totalPaid = 0
    let confirmedCount = 0

    bookings?.forEach(booking => {
      if (booking.status === 'confirmed') {
        confirmedCount++
        totalRevenue += booking.total_amount || 0
        totalPaid += booking.amount_paid || 0
      }
    })

    return NextResponse.json({
      bookings: bookings || [],
      total: count || 0,
      stats: {
        confirmed: confirmedCount,
        total_revenue: totalRevenue,
        total_paid: totalPaid,
      },
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in bookings GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju prodaja' }, { status: 500 })
  }
}

interface CreateBookingBody {
  lead_id?: string
  offer_id?: string
  reservation_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  adults: number
  children?: number
  child_ages?: number[]
  total_amount: number
  amount_paid?: number
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  // For external bookings
  is_external?: boolean
  external_destination?: string
  external_accommodation?: string
  external_dates?: string
  // Travel dates
  travel_date?: string
  return_date?: string
}

// POST /api/bookings
// Create a new booking (close a sale)
export async function POST(request: NextRequest) {
  try {
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

    const body: CreateBookingBody = await request.json()

    // Validate required fields
    if (!body.customer_name || !body.adults || !body.total_amount) {
      return NextResponse.json({ error: 'Nedostaju obavezna polja' }, { status: 400 })
    }

    // If offer_id provided, verify it belongs to org and has capacity
    let offerData = null
    if (body.offer_id) {
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('id, organization_id, available_spots, departure_date, return_date')
        .eq('id', body.offer_id)
        .eq('organization_id', userData.organization_id)
        .single()

      if (offerError || !offer) {
        return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
      }

      const totalGuests = body.adults + (body.children || 0)
      if (offer.available_spots < totalGuests) {
        return NextResponse.json(
          { error: `Nema dovoljno mesta. Dostupno: ${offer.available_spots}` },
          { status: 400 }
        )
      }

      offerData = offer
    }

    // Determine payment status
    let paymentStatus: PaymentStatus = 'unpaid'
    if (body.amount_paid && body.amount_paid >= body.total_amount) {
      paymentStatus = 'paid'
    } else if (body.amount_paid && body.amount_paid > 0) {
      paymentStatus = 'partial'
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        organization_id: userData.organization_id,
        lead_id: body.lead_id || null,
        offer_id: body.offer_id || null,
        reservation_id: body.reservation_id || null,
        closed_by: user.id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone || null,
        customer_email: body.customer_email || null,
        adults: body.adults,
        children: body.children || 0,
        child_ages: body.child_ages || null,
        total_amount: body.total_amount,
        amount_paid: body.amount_paid || 0,
        payment_method: body.payment_method || null,
        payment_status: body.payment_status || paymentStatus,
        is_external: body.is_external || false,
        external_destination: body.external_destination || null,
        external_accommodation: body.external_accommodation || null,
        external_dates: body.external_dates || null,
        status: 'confirmed',
        travel_date: body.travel_date || offerData?.departure_date || null,
        return_date: body.return_date || offerData?.return_date || null,
      })
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city),
        lead:leads(id, name, phone)
      `)
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ error: 'Greška pri kreiranju prodaje' }, { status: 500 })
    }

    // Update lead status if linked
    if (body.lead_id) {
      // Get the "won" stage
      const { data: wonStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('organization_id', userData.organization_id)
        .eq('is_won', true)
        .single()

      if (wonStage) {
        await supabase
          .from('leads')
          .update({
            stage_id: wonStage.id,
            closed_at: new Date().toISOString(),
            value: body.total_amount,
          })
          .eq('id', body.lead_id)
      }
    }

    // Mark reservation as converted if linked
    if (body.reservation_id) {
      await supabase
        .from('reservations')
        .update({ status: 'converted' })
        .eq('id', body.reservation_id)
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error in bookings POST:', error)
    return NextResponse.json({ error: 'Greška pri kreiranju prodaje' }, { status: 500 })
  }
}
