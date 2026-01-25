import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Cron Job: Reservation Reminders
 *
 * Runs hourly via Vercel Cron to:
 * 1. Send 48h reminder emails for reservations expiring in ~48 hours
 * 2. Send 24h reminder emails for reservations expiring in ~24 hours
 * 3. Auto-expire reservations that have passed their deadline
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reservation-reminders",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()
  const now = new Date()

  const results = {
    reminders_48h: 0,
    reminders_24h: 0,
    expired: 0,
    errors: [] as string[],
  }

  try {
    // 1. Find reservations expiring in 47-49 hours (48h window)
    const expires48hFrom = new Date(now.getTime() + 47 * 60 * 60 * 1000)
    const expires48hTo = new Date(now.getTime() + 49 * 60 * 60 * 1000)

    const { data: reservations48h } = await supabase
      .from('reservations')
      .select(`
        id, code, customer_name, customer_email, customer_phone,
        total_price, deposit_amount, currency, expires_at,
        organization_id, reminder_48h_sent, qualification_data
      `)
      .eq('status', 'pending')
      .eq('reminder_48h_sent', false)
      .gte('expires_at', expires48hFrom.toISOString())
      .lte('expires_at', expires48hTo.toISOString())

    // Send 48h reminders
    for (const reservation of reservations48h || []) {
      if (!reservation.customer_email) continue

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
        await fetch(`${baseUrl}/api/email/send-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: reservation.organization_id,
            to: reservation.customer_email,
            customer_name: reservation.customer_name,
            reservation_code: reservation.code,
            package_name: reservation.qualification_data?.package_name || 'Vaš paket',
            deposit_amount: reservation.deposit_amount,
            currency: reservation.currency,
            expires_at: reservation.expires_at,
            reminder_type: '48h',
          }),
        })

        // Mark as sent
        await supabase
          .from('reservations')
          .update({ reminder_48h_sent: true })
          .eq('id', reservation.id)

        results.reminders_48h++
      } catch (err) {
        console.error('Error sending 48h reminder:', err)
        results.errors.push(`48h reminder failed for ${reservation.code}`)
      }
    }

    // 2. Find reservations expiring in 23-25 hours (24h window)
    const expires24hFrom = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const expires24hTo = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const { data: reservations24h } = await supabase
      .from('reservations')
      .select(`
        id, code, customer_name, customer_email, customer_phone,
        total_price, deposit_amount, currency, expires_at,
        organization_id, reminder_24h_sent, qualification_data
      `)
      .eq('status', 'pending')
      .eq('reminder_24h_sent', false)
      .gte('expires_at', expires24hFrom.toISOString())
      .lte('expires_at', expires24hTo.toISOString())

    // Send 24h reminders
    for (const reservation of reservations24h || []) {
      if (!reservation.customer_email) continue

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
        await fetch(`${baseUrl}/api/email/send-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: reservation.organization_id,
            to: reservation.customer_email,
            customer_name: reservation.customer_name,
            reservation_code: reservation.code,
            package_name: reservation.qualification_data?.package_name || 'Vaš paket',
            deposit_amount: reservation.deposit_amount,
            currency: reservation.currency,
            expires_at: reservation.expires_at,
            reminder_type: '24h',
          }),
        })

        // Mark as sent
        await supabase
          .from('reservations')
          .update({ reminder_24h_sent: true })
          .eq('id', reservation.id)

        results.reminders_24h++
      } catch (err) {
        console.error('Error sending 24h reminder:', err)
        results.errors.push(`24h reminder failed for ${reservation.code}`)
      }
    }

    // 3. Auto-expire reservations past deadline
    const { data: expiredReservations, error: expireError } = await supabase
      .from('reservations')
      .update({
        status: 'expired',
        expired_at: now.toISOString(),
      })
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .select('id')

    if (expireError) {
      console.error('Error expiring reservations:', expireError)
      results.errors.push('Failed to expire reservations')
    } else {
      results.expired = expiredReservations?.length || 0
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
