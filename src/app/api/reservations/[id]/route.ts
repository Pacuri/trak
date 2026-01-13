import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ReservationStatus } from '@/types'

// GET /api/reservations/[id]
// Get a single reservation by ID
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

    // Fetch reservation
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        offer:offers(*,
          images:offer_images(id, url, alt_text, position, is_primary)
        ),
        lead:leads(id, name, phone, email)
      `)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: 'Rezervacija nije pronađena' }, { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju rezervacije' }, { status: 500 })
  }
}

interface UpdateReservationBody {
  status?: ReservationStatus
  amount_paid?: number
  extend_hours?: number // Extend expiry by X hours
}

// PATCH /api/reservations/[id]
// Update reservation status or extend expiry
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

    // Verify reservation belongs to user's organization
    const { data: existingReservation, error: existingError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (existingError || !existingReservation) {
      return NextResponse.json({ error: 'Rezervacija nije pronađena' }, { status: 404 })
    }

    const body: UpdateReservationBody = await request.json()
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Handle status change
    if (body.status && body.status !== existingReservation.status) {
      updates.status = body.status

      // Set appropriate timestamps
      if (body.status === 'paid') {
        updates.paid_at = new Date().toISOString()
      } else if (body.status === 'expired') {
        updates.expired_at = new Date().toISOString()
      } else if (body.status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
      }
    }

    // Handle payment update
    if (body.amount_paid !== undefined) {
      updates.amount_paid = body.amount_paid

      // Auto-mark as paid if full amount
      if (body.amount_paid >= existingReservation.total_price) {
        updates.status = 'paid'
        updates.paid_at = new Date().toISOString()
      }
    }

    // Handle expiry extension
    if (body.extend_hours && body.extend_hours > 0) {
      const currentExpiry = new Date(existingReservation.expires_at)
      const newExpiry = new Date(currentExpiry.getTime() + body.extend_hours * 60 * 60 * 1000)
      updates.expires_at = newExpiry.toISOString()

      // Reset reminder flags if extending
      updates.reminder_24h_sent = false
      updates.reminder_48h_sent = false
    }

    // Update reservation
    const { data: updatedReservation, error: updateError } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        offer:offers(id, name, star_rating, country, city),
        lead:leads(id, name, phone)
      `)
      .single()

    if (updateError) {
      console.error('Error updating reservation:', updateError)
      return NextResponse.json({ error: 'Greška pri ažuriranju rezervacije' }, { status: 500 })
    }

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error('Error updating reservation:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju rezervacije' }, { status: 500 })
  }
}
