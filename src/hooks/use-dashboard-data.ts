'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type {
  DashboardData,
  DashboardStats,
  LeadToCall,
  LeadPriority,
  PendingInquiry,
  InquiryPriority,
  AttentionSection,
  AttentionItem,
  TodayDeparture,
  TodayReturn,
  PackageCapacity,
} from '@/types/dashboard'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Helper to calculate hours since a date
function hoursSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
}

// Calculate lead priority based on wait time
function getLeadPriority(createdAt: string, lastContactAt: string | null): LeadPriority {
  const relevantDate = lastContactAt || createdAt
  const hours = hoursSince(relevantDate)
  if (hours >= 48) return 'urgent'
  if (hours >= 24) return 'high'
  return 'normal'
}

// Calculate inquiry priority based on wait time
function getInquiryPriority(createdAt: string): InquiryPriority {
  const hours = hoursSince(createdAt)
  if (hours >= 4) return 'urgent'
  if (hours >= 2) return 'high'
  return 'normal'
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    stats: {
      leads_to_call: 0,
      pending_inquiries: 0,
      departures_today: 0,
      departures_passengers: 0,
      revenue_this_month: 0,
      revenue_trend: 0,
      urgent_count: 0,
    },
    leads_to_call: [],
    pending_inquiries: [],
    attention: [],
    departures_today: [],
    returns_today: [],
    package_capacity: [],
    loading: true,
    error: null,
    last_updated: null,
  })

  const supabase = createClient()
  const { organizationId, user } = useUser()

  const fetchDashboardData = useCallback(async () => {
    if (!organizationId) {
      setData(prev => ({ ...prev, loading: false, error: 'Organization not found' }))
      return
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      // Parallel fetch all data
      // First get closed stage IDs and early stage IDs
      const closedStageIds = await getClosedStageIds(supabase, organizationId)
      const earlyStageIds = await getEarlyStageIds(supabase, organizationId)
      
      // Build leads query - if no closed stages, get all leads
      const leadsQuery = supabase
        .from('leads')
        .select('id, name, phone, email, destination, guests, value, created_at, last_contact_at, stage_id')
        .eq('organization_id', organizationId)
      
      const allLeadsQuery = supabase
        .from('leads')
        .select('id, stage_id, created_at')
        .eq('organization_id', organizationId)
      
      // Only filter out closed stages if there are any
      if (closedStageIds.length > 0) {
        leadsQuery.not('stage_id', 'in', `(${closedStageIds.join(',')})`)
        allLeadsQuery.not('stage_id', 'in', `(${closedStageIds.join(',')})`)
      }

      const [
        leadsResult,
        allLeadsResult,
        inquiriesResult,
        reservationsResult,
        departuresResult,
        paymentsResult,
        packagesResult,
      ] = await Promise.all([
        // Leads to call (not contacted in 24h+, not closed)
        leadsQuery
          .order('created_at', { ascending: true })
          .limit(20),

        // All open leads count (for stats)
        allLeadsQuery,

        // Pending custom inquiries (from qualification form)
        supabase
          .from('custom_inquiries')
          .select('id, customer_name, customer_phone, customer_email, customer_note, qualification_data, created_at, source, lead_id')
          .eq('organization_id', organizationId)
          .eq('status', 'new')
          .order('created_at', { ascending: true })
          .limit(10),

        // Reservations (for expiring and late payments)
        supabase
          .from('reservations')
          .select('id, customer_name, total_price, amount_paid, expires_at, status, code')
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .order('expires_at', { ascending: true }),

        // Today's departures
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
          .eq('departure_date', new Date().toISOString().split('T')[0]),

        // Payments this month
        supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', organizationId)
          .eq('status', 'completed')
          .gte('created_at', getMonthStart()),

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
      ])

      // Early stage IDs are now already an array
      const earlyStageIdList = earlyStageIds
      
      // Process leads to call (not contacted in 24h+)
      const leadsToCall: LeadToCall[] = (leadsResult.data || [])
        .filter(lead => {
          const hours = hoursSince(lead.last_contact_at || lead.created_at)
          return hours >= 24 || !lead.last_contact_at
        })
        .slice(0, 5)
        .map(lead => ({
          id: lead.id,
          name: lead.name || 'Nepoznato',
          phone: lead.phone,
          email: lead.email,
          destination: lead.destination,
          guests: lead.guests,
          value: lead.value,
          created_at: lead.created_at,
          last_contact_at: lead.last_contact_at,
          priority: getLeadPriority(lead.created_at, lead.last_contact_at),
          wait_hours: hoursSince(lead.last_contact_at || lead.created_at),
        }))

      // Count leads in early stages (new, contacted) - these need attention
      const allOpenLeads = allLeadsResult.data || []
      const leadsInEarlyStages = allOpenLeads.filter(lead => 
        earlyStageIdList.includes(lead.stage_id)
      )

      // Process pending inquiries
      const pendingInquiries: PendingInquiry[] = (inquiriesResult.data || [])
        .slice(0, 5)
        .map(inquiry => ({
          id: inquiry.id,
          customer_name: inquiry.customer_name,
          customer_phone: inquiry.customer_phone,
          customer_email: inquiry.customer_email,
          customer_note: inquiry.customer_note,
          qualification_data: inquiry.qualification_data,
          created_at: inquiry.created_at,
          priority: getInquiryPriority(inquiry.created_at),
          wait_hours: hoursSince(inquiry.created_at),
          source: inquiry.source,
          lead_id: inquiry.lead_id,
        }))

      // Process attention items
      const attention: AttentionSection[] = []
      const now = new Date()
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Late payments (reservations with payment due)
      const latePayments: AttentionItem[] = (reservationsResult.data || [])
        .filter(r => {
          const paid = r.amount_paid || 0
          const total = r.total_price || 0
          return paid < total && new Date(r.expires_at) < now
        })
        .slice(0, 3)
        .map(r => ({
          id: r.id,
          category: 'late_payments' as const,
          title: r.customer_name,
          subtitle: `Rezervacija ${r.code}`,
          urgency: 'critical' as const,
          meta: `€${(r.total_price - (r.amount_paid || 0)).toLocaleString()}`,
          link: `/dashboard/reservations/${r.id}?tab=payment`,
        }))

      if (latePayments.length > 0) {
        attention.push({
          category: 'late_payments',
          icon: '💳',
          label: 'Kasne uplate',
          count: latePayments.length,
          items: latePayments,
        })
      }

      // Expiring reservations (within 24h)
      const expiringReservations: AttentionItem[] = (reservationsResult.data || [])
        .filter(r => {
          const expires = new Date(r.expires_at)
          return expires > now && expires <= in24h
        })
        .slice(0, 3)
        .map(r => {
          const hoursLeft = Math.ceil((new Date(r.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60))
          return {
            id: r.id,
            category: 'expiring_reservations' as const,
            title: r.customer_name,
            subtitle: `Rezervacija ${r.code}`,
            urgency: hoursLeft <= 6 ? 'critical' as const : 'warning' as const,
            meta: `${hoursLeft}h`,
            link: `/dashboard/reservations/${r.id}`,
          }
        })

      if (expiringReservations.length > 0) {
        attention.push({
          category: 'expiring_reservations',
          icon: '⏰',
          label: 'Rez. ističu',
          count: expiringReservations.length,
          items: expiringReservations,
        })
      }

      // Last seats (departures with <=3 available)
      const lastSeats: AttentionItem[] = (departuresResult.data || [])
        .filter((d: any) => d.available_spots <= 3 && d.available_spots > 0)
        .slice(0, 3)
        .map((d: any) => ({
          id: d.id,
          category: 'last_seats' as const,
          title: d.package?.name || 'Paket',
          subtitle: `${d.package?.destination_city || d.package?.destination_country}`,
          urgency: d.available_spots === 1 ? 'critical' as const : 'warning' as const,
          meta: `${d.available_spots} mesta`,
          link: `/dashboard/packages/${d.package?.id}/departures/${d.id}`,
        }))

      if (lastSeats.length > 0) {
        attention.push({
          category: 'last_seats',
          icon: '🔥',
          label: 'Poslednja mesta',
          count: lastSeats.length,
          items: lastSeats,
        })
      }

      // Unanswered inquiries (>2h)
      const unansweredInquiries: AttentionItem[] = pendingInquiries
        .filter(i => i.wait_hours >= 2)
        .slice(0, 3)
        .map(i => ({
          id: i.id,
          category: 'unanswered_inquiries' as const,
          title: i.customer_name,
          subtitle: i.qualification_data?.destination?.country || 'Destinacija nije navedena',
          urgency: i.wait_hours >= 4 ? 'critical' as const : 'warning' as const,
          meta: `${i.wait_hours}h`,
          inquiry_id: i.id,
        }))

      if (unansweredInquiries.length > 0) {
        attention.push({
          category: 'unanswered_inquiries',
          icon: '📋',
          label: 'Upiti bez odg.',
          count: unansweredInquiries.length,
          items: unansweredInquiries,
        })
      }

      // Process today's departures
      const departuresToday: TodayDeparture[] = (departuresResult.data || [])
        .map((d: any) => ({
          id: d.id,
          departure_id: d.id,
          package_id: d.package?.id,
          package_name: d.package?.name || 'Paket',
          hotel_name: d.package?.hotel_name,
          hotel_stars: d.package?.hotel_stars,
          destination_city: d.package?.destination_city,
          destination_country: d.package?.destination_country,
          departure_time: d.departure_time,
          passenger_count: d.total_spots - d.available_spots,
          transport_type: d.package?.transport_type,
          departure_location: d.package?.departure_location,
        }))

      // Process package capacity
      const packageCapacity: PackageCapacity[] = (packagesResult.data || [])
        .map((pkg: any) => {
          const activeDepartures = (pkg.departures || []).filter(
            (d: any) => d.status === 'active' && new Date(d.departure_date) >= now
          )
          const totalSpots = activeDepartures.reduce((sum: number, d: any) => sum + d.total_spots, 0)
          const availableSpots = activeDepartures.reduce((sum: number, d: any) => sum + d.available_spots, 0)
          const bookedSpots = totalSpots - availableSpots
          const fillPercentage = totalSpots > 0 ? Math.round((bookedSpots / totalSpots) * 100) : 0

          const nextDeparture = activeDepartures
            .filter((d: any) => new Date(d.departure_date) >= now)
            .sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime())[0]

          return {
            id: pkg.id,
            name: pkg.name,
            hotel_name: pkg.hotel_name,
            hotel_stars: pkg.hotel_stars,
            destination_city: pkg.destination_city,
            destination_country: pkg.destination_country,
            rental_period_start: pkg.rental_period_start,
            rental_period_end: pkg.rental_period_end,
            departure_day: pkg.departure_day,
            total_spots: totalSpots,
            booked_spots: bookedSpots,
            available_spots: availableSpots,
            fill_percentage: fillPercentage,
            next_departure: nextDeparture ? {
              date: nextDeparture.departure_date,
              available: nextDeparture.available_spots,
            } : null,
          }
        })
        .filter((pkg: PackageCapacity) => pkg.total_spots > 0)
        .sort((a: PackageCapacity, b: PackageCapacity) => b.fill_percentage - a.fill_percentage)
        .slice(0, 4)

      // Calculate monthly revenue
      const revenueThisMonth = (paymentsResult.data || []).reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      )

      // Calculate total passengers today
      const passengersToday = departuresToday.reduce((sum, d) => sum + d.passenger_count, 0)

      // Calculate urgent count
      const urgentCount = 
        latePayments.length + 
        expiringReservations.length + 
        lastSeats.length + 
        unansweredInquiries.length

      // Build stats
      // pending_inquiries now includes: custom inquiries + leads in early stages
      const customInquiriesCount = (inquiriesResult.data || []).length
      const totalPendingInquiries = customInquiriesCount + leadsInEarlyStages.length
      
      const stats: DashboardStats = {
        leads_to_call: leadsToCall.length,
        pending_inquiries: totalPendingInquiries,
        departures_today: departuresToday.length,
        departures_passengers: passengersToday,
        revenue_this_month: revenueThisMonth,
        revenue_trend: 0, // TODO: Calculate vs last month
        urgent_count: urgentCount,
      }

      setData({
        stats,
        leads_to_call: leadsToCall,
        pending_inquiries: pendingInquiries,
        attention,
        departures_today: departuresToday,
        returns_today: [], // TODO: Implement returns
        package_capacity: packageCapacity,
        loading: false,
        error: null,
        last_updated: new Date(),
      })
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data',
      }))
    }
  }, [organizationId, supabase])

  // Initial fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!organizationId) return

    // Subscribe to new custom inquiries
    const inquiriesChannel = supabase
      .channel('dashboard-inquiries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_inquiries',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Refresh dashboard data when inquiries change
          fetchDashboardData()
        }
      )
      .subscribe()

    // Subscribe to new leads
    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Refresh dashboard data when leads change
          fetchDashboardData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(inquiriesChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [supabase, organizationId, fetchDashboardData])

  return {
    ...data,
    refresh: fetchDashboardData,
  }
}

// Helper to get closed stage IDs (returns array of UUIDs)
async function getClosedStageIds(supabase: any, organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('organization_id', organizationId)
    .or('is_won.eq.true,is_lost.eq.true')

  if (!data || data.length === 0) return []
  return data.map((s: any) => s.id)
}

// Helper to get early stage IDs (stages that need attention - first 3 stages by position)
async function getEarlyStageIds(supabase: any, organizationId: string): Promise<string[]> {
  const { data } = await supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('organization_id', organizationId)
    .eq('is_won', false)
    .eq('is_lost', false)
    .order('position', { ascending: true })
    .limit(3) // First 3 non-closed stages (e.g., Novi, Kontaktiran, Ponuda)

  if (!data || data.length === 0) return []
  return data.map((s: any) => s.id)
}

// Helper to get start of current month
function getMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}
