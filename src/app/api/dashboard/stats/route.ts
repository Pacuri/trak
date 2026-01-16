import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = userData.organization_id
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Fetch all data in parallel
    const [
      leadsResult,
      inquiriesResult,
      reservationsResult,
      departuresResult,
      paymentsResult,
      packagesResult,
      stagesResult,
    ] = await Promise.all([
      // Leads (for "to call" section)
      supabase
        .from('leads')
        .select('id, name, phone, email, destination, guests, value, created_at, last_contact_at, stage_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true }),

      // Custom inquiries (pending)
      supabase
        .from('custom_inquiries')
        .select('id, customer_name, customer_phone, customer_email, customer_note, qualification_data, created_at, source')
        .eq('organization_id', organizationId)
        .eq('status', 'new')
        .order('created_at', { ascending: true }),

      // Reservations (for expiring and late payments)
      supabase
        .from('reservations')
        .select('id, customer_name, total_price, amount_paid, expires_at, status, code')
        .eq('organization_id', organizationId)
        .eq('status', 'pending'),

      // Today's departures with package info
      supabase
        .from('departures')
        .select(`
          id,
          departure_date,
          departure_time,
          total_spots,
          available_spots,
          package:packages(
            id,
            name,
            hotel_name,
            hotel_stars,
            destination_city,
            destination_country,
            transport_type,
            departure_location
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('departure_date', today),

      // Payments this month
      supabase
        .from('payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('created_at', monthStart),

      // Packages with capacity
      supabase
        .from('packages')
        .select(`
          id,
          name,
          hotel_name,
          hotel_stars,
          destination_city,
          destination_country,
          rental_period_start,
          rental_period_end,
          departure_day,
          departures(
            id,
            departure_date,
            total_spots,
            available_spots,
            status
          )
        `)
        .eq('organization_id', organizationId)
        .eq('package_type', 'fiksni')
        .eq('status', 'active'),

      // Pipeline stages (to filter closed leads)
      supabase
        .from('pipeline_stages')
        .select('id, is_won, is_lost')
        .eq('organization_id', organizationId),
    ])

    // Get closed stage IDs
    const closedStageIds = (stagesResult.data || [])
      .filter(s => s.is_won || s.is_lost)
      .map(s => s.id)

    // Calculate leads to call (not closed, not contacted in 24h)
    const hourAgo24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const leadsToCall = (leadsResult.data || []).filter(lead => {
      if (closedStageIds.includes(lead.stage_id)) return false
      const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : null
      return !lastContact || lastContact < hourAgo24
    })

    // Process departures for passengers count
    const departuresToday = departuresResult.data || []
    const passengersToday = departuresToday.reduce((sum: number, d: any) => {
      return sum + (d.total_spots - d.available_spots)
    }, 0)

    // Calculate revenue
    const revenueThisMonth = (paymentsResult.data || []).reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    )

    // Calculate urgent items
    const pendingReservations = reservationsResult.data || []
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const latePayments = pendingReservations.filter(r => {
      const paid = r.amount_paid || 0
      const total = r.total_price || 0
      return paid < total && new Date(r.expires_at) < now
    })

    const expiringReservations = pendingReservations.filter(r => {
      const expires = new Date(r.expires_at)
      return expires > now && expires <= in24h
    })

    const lastSeats = departuresToday.filter((d: any) => 
      d.available_spots <= 3 && d.available_spots > 0
    )

    const unansweredInquiries = (inquiriesResult.data || []).filter(i => {
      const hours = (now.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60)
      return hours >= 2
    })

    const urgentCount = 
      latePayments.length + 
      expiringReservations.length + 
      lastSeats.length + 
      unansweredInquiries.length

    // Build response
    const response = {
      stats: {
        leads_to_call: leadsToCall.length,
        pending_inquiries: (inquiriesResult.data || []).length,
        departures_today: departuresToday.length,
        departures_passengers: passengersToday,
        revenue_this_month: revenueThisMonth,
        revenue_trend: 0, // TODO: Calculate vs last month
        urgent_count: urgentCount,
      },
      counts: {
        late_payments: latePayments.length,
        expiring_reservations: expiringReservations.length,
        last_seats: lastSeats.length,
        unanswered_inquiries: unansweredInquiries.length,
      },
      timestamp: now.toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
