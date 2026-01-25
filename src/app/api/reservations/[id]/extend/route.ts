import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
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

    // Parse request body
    const body = await request.json()
    const { hours = 24 } = body // Default extend by 24 hours

    // Get current reservation
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, status, expires_at')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Rezervacija nije pronađena' }, { status: 404 })
    }

    // Can only extend pending reservations
    if (reservation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Samo rezervacije koje čekaju uplatu mogu biti produžene' },
        { status: 400 }
      )
    }

    // Calculate new expiry
    const currentExpiry = new Date(reservation.expires_at)
    const now = new Date()

    // If already expired, extend from now; otherwise extend from current expiry
    const baseTime = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseTime.getTime() + hours * 60 * 60 * 1000)

    // Update reservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        expires_at: newExpiry.toISOString(),
        // If was expired, reset status to pending
        status: 'pending',
        expired_at: null,
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('Error extending reservation:', updateError)
      return NextResponse.json({ error: 'Greška pri produženju rezervacije' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      new_expires_at: newExpiry.toISOString(),
    })
  } catch (error) {
    console.error('Error extending reservation:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
