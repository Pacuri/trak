import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * MOCK Payment Checkout API
 *
 * In production, this would create a Stripe Checkout session.
 * For now, it returns a URL to a mock checkout page.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservation_id } = body

    if (!reservation_id) {
      return NextResponse.json({ error: 'reservation_id is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, code, customer_name, deposit_amount, currency, status, organization_id')
      .eq('id', reservation_id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Rezervacija nije pronađena' }, { status: 404 })
    }

    // Can only pay for pending reservations
    if (reservation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Ova rezervacija ne može biti plaćena' },
        { status: 400 }
      )
    }

    // Get organization for branding
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', reservation.organization_id)
      .single()

    // MOCK: Return mock checkout URL
    // In production, this would create a Stripe Checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
    const mockCheckoutUrl = `${baseUrl}/plati/${reservation_id}/mock-checkout`

    return NextResponse.json({
      checkout_url: mockCheckoutUrl,
      reservation_code: reservation.code,
      amount: reservation.deposit_amount,
      currency: reservation.currency,
      organization_name: organization?.name || 'Agencija',
      mock: true, // Flag indicating this is a mock response
    })
  } catch (error) {
    console.error('Error creating checkout:', error)
    return NextResponse.json({ error: 'Greška servera' }, { status: 500 })
  }
}
