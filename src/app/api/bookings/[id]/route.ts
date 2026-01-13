import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/bookings/[id]
// Get a single booking by ID
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

    // Fetch booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        offer:offers(*,
          images:offer_images(id, url, alt_text, position, is_primary)
        ),
        lead:leads(id, name, phone, email, destination),
        reservation:reservations(id, code, created_at),
        closer:users!bookings_closed_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Prodaja nije pronađena' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju prodaje' }, { status: 500 })
  }
}

interface CancelBookingBody {
  cancellation_reason?: string
  refund_amount?: number
}

// POST /api/bookings/[id] (with action=cancel in body)
// Cancel a booking
export async function POST(
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

    const body: CancelBookingBody & { action?: string } = await request.json()

    if (body.action !== 'cancel') {
      return NextResponse.json({ error: 'Nepoznata akcija' }, { status: 400 })
    }

    // Verify booking belongs to user's organization and get current data
    const { data: existingBooking, error: existingError } = await supabase
      .from('bookings')
      .select('id, organization_id, status, offer_id, adults, children')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (existingError || !existingBooking) {
      return NextResponse.json({ error: 'Prodaja nije pronađena' }, { status: 404 })
    }

    if (existingBooking.status === 'cancelled') {
      return NextResponse.json({ error: 'Prodaja je već otkazana' }, { status: 400 })
    }

    // Cancel booking
    const { data: cancelledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: body.cancellation_reason || null,
        refund_amount: body.refund_amount || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        offer:offers(id, name),
        lead:leads(id, name)
      `)
      .single()

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError)
      return NextResponse.json({ error: 'Greška pri otkazivanju prodaje' }, { status: 500 })
    }

    // Capacity is restored automatically by database trigger

    // Update lead status if linked
    if (cancelledBooking.lead_id) {
      // Could move lead back to pipeline or mark as "cancelled"
      // For now, just update the value to 0
      await supabase
        .from('leads')
        .update({
          value: 0,
          notes: (cancelledBooking.notes || '') + '\n[OTKAZANO]',
        })
        .eq('id', cancelledBooking.lead_id)
    }

    return NextResponse.json(cancelledBooking)
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json({ error: 'Greška pri otkazivanju prodaje' }, { status: 500 })
  }
}
