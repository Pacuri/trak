import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Payment Webhook Handler
 *
 * Handles both mock payments and (future) real Stripe webhooks.
 * When payment is confirmed:
 * 1. Updates reservation status to 'paid'
 * 2. Creates a booking record
 * 3. Sends confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle both mock and real Stripe events
    const eventType = body.type
    const data = body.data?.object

    if (eventType !== 'checkout.session.completed') {
      return NextResponse.json({ received: true })
    }

    const reservationId = data?.metadata?.reservation_id

    if (!reservationId) {
      console.error('No reservation_id in webhook metadata')
      return NextResponse.json({ error: 'Missing reservation_id' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get reservation
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select(`
        *,
        organization:organizations(id, name, phone, email)
      `)
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      console.error('Reservation not found:', reservationId)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Already processed
    if (reservation.status === 'paid') {
      return NextResponse.json({ already_processed: true })
    }

    // Update reservation to paid
    const amountPaid = data?.amount_total
      ? data.amount_total / 100 // Stripe sends in cents
      : reservation.deposit_amount

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'paid',
        amount_paid: amountPaid,
        paid_at: new Date().toISOString(),
        payment_option: 'deposit',
      })
      .eq('id', reservationId)

    if (updateError) {
      console.error('Error updating reservation:', updateError)
      return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        organization_id: reservation.organization_id,
        reservation_id: reservation.id,
        lead_id: reservation.lead_id,
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        customer_email: reservation.customer_email,
        adults: reservation.adults,
        children: reservation.children,
        child_ages: reservation.child_ages,
        total_price: reservation.total_price,
        amount_paid: amountPaid,
        currency: reservation.currency,
        status: 'confirmed',
        booking_data: {
          reservation_code: reservation.code,
          package_name: reservation.qualification_data?.package_name,
          travel_dates: reservation.qualification_data?.travel_dates,
          price_breakdown: reservation.qualification_data?.price_breakdown,
        },
      })
      .select('id')
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      // Don't fail the webhook - reservation is already marked paid
    }

    // Update lead stage to "won" if available
    if (reservation.lead_id) {
      // Find the "won" stage for this organization
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('organization_id', reservation.organization_id)
        .eq('is_won', true)
        .limit(1)
        .single()

      if (stages?.id) {
        await supabase
          .from('leads')
          .update({
            stage_id: stages.id,
            awaiting_response: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reservation.lead_id)
      }
    }

    // Send booking confirmation email (fire and forget)
    if (reservation.customer_email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
        await fetch(`${baseUrl}/api/email/send-booking-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: reservation.organization_id,
            to: reservation.customer_email,
            customer_name: reservation.customer_name,
            reservation_code: reservation.code,
            package_name: reservation.qualification_data?.package_name || 'Paket',
            total_price: reservation.total_price,
            amount_paid: amountPaid,
            currency: reservation.currency,
            booking_id: booking?.id,
          }),
        })
      } catch (emailError) {
        console.error('Error sending booking confirmation email:', emailError)
        // Don't fail - email is non-critical
      }
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservationId,
      booking_id: booking?.id,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
