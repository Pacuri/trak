import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createServiceClient()

    // Get reservation with organization details
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        id,
        code,
        customer_name,
        customer_email,
        customer_phone,
        adults,
        children,
        total_price,
        deposit_amount,
        amount_paid,
        currency,
        status,
        expires_at,
        created_at,
        qualification_data,
        organization:organizations(id, name, phone, email)
      `)
      .eq('id', id)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: 'Rezervacija nije pronađena' }, { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error('Error fetching reservation:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
