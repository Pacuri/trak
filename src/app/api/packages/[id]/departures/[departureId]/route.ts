import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { PackageDepartureFormData } from '@/types/packages'

// PATCH /api/packages/[id]/departures/[departureId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; departureId: string }> }
) {
  try {
    const { id: packageId, departureId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<PackageDepartureFormData> & { available_slots?: number }

    const update: Record<string, unknown> = {}
    if (body.departure_date != null) update.departure_date = body.departure_date
    if (body.return_date != null) update.return_date = body.return_date
    if (body.duration_nights != null) update.duration_nights = body.duration_nights
    if (body.status != null) update.status = body.status
    if (body.available_slots != null) update.available_slots = body.available_slots
    if (body.min_travelers !== undefined) update.min_travelers = body.min_travelers ?? null
    if (body.booking_deadline !== undefined) update.booking_deadline = body.booking_deadline || null
    if (body.departure_time !== undefined) update.departure_time = body.departure_time || null
    if (body.departure_point !== undefined) update.departure_point = body.departure_point || null
    if (body.return_time !== undefined) update.return_time = body.return_time || null
    if (body.transport_notes !== undefined) update.transport_notes = body.transport_notes || null
    if (body.price_adjustment_percent !== undefined) update.price_adjustment_percent = body.price_adjustment_percent ?? null
    if (body.price_adjustment_type !== undefined) update.price_adjustment_type = body.price_adjustment_type ?? null
    if (body.internal_notes !== undefined) update.internal_notes = body.internal_notes || null
    if (body.supplier_confirmation !== undefined) update.supplier_confirmation = body.supplier_confirmation || null

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nema polja za ažuriranje' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('package_departures')
      .update(update)
      .eq('id', departureId)
      .eq('package_id', packageId)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating package_departure:', error)
      return NextResponse.json({ error: 'Greška pri ažuriranju polaska' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Polazak nije pronađen' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in departures PATCH:', err)
    return NextResponse.json({ error: 'Greška pri ažuriranju polaska' }, { status: 500 })
  }
}

// DELETE /api/packages/[id]/departures/[departureId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; departureId: string }> }
) {
  try {
    const { id: packageId, departureId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovan pristup' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 })
    }

    const { error } = await supabase
      .from('package_departures')
      .delete()
      .eq('id', departureId)
      .eq('package_id', packageId)
      .eq('organization_id', userData.organization_id)

    if (error) {
      console.error('Error deleting package_departure:', error)
      return NextResponse.json({ error: 'Greška pri brisanju polaska' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in departures DELETE:', err)
    return NextResponse.json({ error: 'Greška pri brisanju polaska' }, { status: 500 })
  }
}
