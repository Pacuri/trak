import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface UpdateCapacityBody {
  available_spots: number
}

// PATCH /api/offers/[id]/capacity
// Quick capacity update
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

    // Verify offer belongs to user's organization and get current data
    const { data: existingOffer, error: existingError } = await supabase
      .from('offers')
      .select('id, organization_id, total_spots, available_spots, status')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (existingError || !existingOffer) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    const body: UpdateCapacityBody = await request.json()
    const { available_spots } = body

    // Validate capacity
    if (available_spots === undefined || available_spots < 0) {
      return NextResponse.json({ error: 'Nevalidna vrednost za kapacitet' }, { status: 400 })
    }

    if (available_spots > existingOffer.total_spots) {
      return NextResponse.json(
        { error: `Kapacitet ne može biti veći od ukupnog broja mesta (${existingOffer.total_spots})` },
        { status: 400 }
      )
    }

    // Determine new status
    let newStatus = existingOffer.status
    if (available_spots === 0 && existingOffer.status !== 'archived') {
      newStatus = 'sold_out'
    } else if (available_spots > 0 && existingOffer.status === 'sold_out') {
      newStatus = 'active'
    }

    // Update capacity
    const { data: updatedOffer, error: updateError } = await supabase
      .from('offers')
      .update({
        available_spots,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, available_spots, total_spots, status')
      .single()

    if (updateError) {
      console.error('Error updating capacity:', updateError)
      return NextResponse.json({ error: 'Greška pri ažuriranju kapaciteta' }, { status: 500 })
    }

    return NextResponse.json(updatedOffer)
  } catch (error) {
    console.error('Error updating capacity:', error)
    return NextResponse.json({ error: 'Greška pri ažuriranju kapaciteta' }, { status: 500 })
  }
}
