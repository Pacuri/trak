import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { DepartureStatus } from '@/types/packages'

interface DepartureUpdateData {
  departure_date?: string
  return_date?: string
  departure_time?: string
  available_spots?: number
  total_spots?: number
  price_override?: number
  original_price?: number
  child_price?: number
  status?: DepartureStatus
  is_visible?: boolean
}

// GET /api/departures/[id]
// Get a single departure
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

    // Get departure with package info using the view
    const { data: departure, error } = await supabase
      .from('departures_with_package')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (error || !departure) {
      return NextResponse.json({ error: 'Polazak nije pronađen' }, { status: 404 })
    }

    return NextResponse.json(departure)
  } catch (error) {
    console.error('Error in departure GET:', error)
    return NextResponse.json({ error: 'Greška pri učitavanju polaska' }, { status: 500 })
  }
}

// PATCH /api/departures/[id]
// Quick update for departure (capacity, price, status)
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

    const body: DepartureUpdateData = await request.json()
    
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.departure_date !== undefined) updateData.departure_date = body.departure_date
    if (body.return_date !== undefined) updateData.return_date = body.return_date
    if (body.departure_time !== undefined) updateData.departure_time = body.departure_time
    if (body.available_spots !== undefined) updateData.available_spots = body.available_spots
    if (body.total_spots !== undefined) updateData.total_spots = body.total_spots
    if (body.price_override !== undefined) updateData.price_override = body.price_override
    if (body.original_price !== undefined) updateData.original_price = body.original_price
    if (body.child_price !== undefined) updateData.child_price = body.child_price
    if (body.status !== undefined) updateData.status = body.status
    if (body.is_visible !== undefined) updateData.is_visible = body.is_visible

    const { data: departure, error } = await supabase
      .from('departures')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating departure:', error)
      return NextResponse.json({ error: 'Greška pri ažuriranju polaska' }, { status: 500 })
    }

    return NextResponse.json(departure)
  } catch (error) {
    console.error('Error in departure PATCH:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju polaska' }, { status: 500 })
  }
}

// DELETE /api/departures/[id]
// Delete a departure
export async function DELETE(
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

    const { error } = await supabase
      .from('departures')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      console.error('Error deleting departure:', error)
      return NextResponse.json({ error: 'Greška pri brisanju polaska' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in departure DELETE:', error)
    return NextResponse.json({ error: 'Greška pri brisanju polaska' }, { status: 500 })
  }
}
