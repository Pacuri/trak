import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfWeek, startOfMonth, subDays, format, parseISO, differenceInMinutes, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
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

    const organizationId = userData.organization_id
    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || 'month' // week, month, quarter, year, all

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null

    switch (range) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        break
      case 'month':
        startDate = startOfMonth(now)
        break
      case 'quarter':
        startDate = subDays(now, 90)
        break
      case 'year':
        startDate = subDays(now, 365)
        break
      case 'all':
      default:
        startDate = null
    }

    // Fetch leads with all necessary data
    let leadsQuery = supabase
      .from('leads')
      .select(`
        id,
        name,
        source_type,
        stage_id,
        assigned_to,
        value,
        destination,
        created_at,
        last_contact_at,
        closed_at,
        is_archived,
        awaiting_response,
        last_customer_message_at,
        source_inquiry_id,
        stage:pipeline_stages(id, name, is_won, is_lost, position),
        assignee:users!leads_assigned_to_fkey(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .or('is_archived.is.null,is_archived.eq.false')

    if (startDate) {
      leadsQuery = leadsQuery.gte('created_at', startDate.toISOString())
    }

    const { data: leads, error: leadsError } = await leadsQuery

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Greška pri učitavanju podataka' }, { status: 500 })
    }

    // Fetch pipeline stages
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, color, position, is_won, is_lost')
      .eq('organization_id', organizationId)
      .order('position', { ascending: true })

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    // Fetch bookings for revenue data
    let bookingsQuery = supabase
      .from('bookings')
      .select('id, total_amount, payment_status, status, booked_at, lead_id, customer_name')
      .eq('organization_id', organizationId)
      .eq('status', 'confirmed')

    if (startDate) {
      bookingsQuery = bookingsQuery.gte('booked_at', startDate.toISOString())
    }

    const { data: bookings } = await bookingsQuery

    // Fetch custom inquiries for package data
    let inquiriesQuery = supabase
      .from('custom_inquiries')
      .select('id, lead_id, qualification_data, status, created_at, responded_at')
      .eq('organization_id', organizationId)

    if (startDate) {
      inquiriesQuery = inquiriesQuery.gte('created_at', startDate.toISOString())
    }

    const { data: inquiries } = await inquiriesQuery

    // Fetch messages for response time calculation
    const { data: messages } = await supabase
      .from('messages')
      .select('id, lead_id, direction, sent_at, created_at')
      .eq('organization_id', organizationId)
      .order('sent_at', { ascending: true })

    // =========================================
    // FETCH PREVIOUS PERIOD DATA FOR COMPARISON
    // =========================================

    let previousPeriodLeads: { id: string; stage_id: string | null; value: number | null; created_at: string; closed_at: string | null }[] = []
    if (startDate) {
      // Calculate previous period range (same duration, just before current period)
      const periodDays = differenceInDays(now, startDate)
      const prevStart = subDays(startDate, periodDays)
      const prevEnd = startDate

      const { data: prevLeads } = await supabase
        .from('leads')
        .select('id, stage_id, value, created_at, closed_at')
        .eq('organization_id', organizationId)
        .or('is_archived.is.null,is_archived.eq.false')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString())

      previousPeriodLeads = prevLeads || []
    }

    // =========================================
    // CALCULATE ANALYTICS
    // =========================================

    const allLeads = leads || []
    const allStages = stages || []
    const allBookings = bookings || []
    const allInquiries = inquiries || []
    const allMessages = messages || []

    // Won/Lost stages
    const wonStageIds = allStages.filter(s => s.is_won).map(s => s.id)
    const lostStageIds = allStages.filter(s => s.is_lost).map(s => s.id)

    // Basic stats
    const totalLeads = allLeads.length
    const wonLeads = allLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
    const lostLeads = allLeads.filter(l => lostStageIds.includes(l.stage_id || ''))
    const activeLeads = allLeads.filter(l => !wonStageIds.includes(l.stage_id || '') && !lostStageIds.includes(l.stage_id || ''))
    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0

    // Revenue from won leads
    const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const bookingsRevenue = allBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

    // Average deal value
    const avgDealValue = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0

    // =========================================
    // PREVIOUS PERIOD COMPARISON
    // =========================================

    const prevTotalLeads = previousPeriodLeads.length
    const prevWonLeads = previousPeriodLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
    const prevRevenue = prevWonLeads.reduce((sum, l) => sum + (l.value || 0), 0)
    const prevConversionRate = prevTotalLeads > 0 ? (prevWonLeads.length / prevTotalLeads) * 100 : 0

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null
      return ((current - previous) / previous) * 100
    }

    const comparison = {
      leads: calcChange(totalLeads, prevTotalLeads),
      won: calcChange(wonLeads.length, prevWonLeads.length),
      revenue: calcChange(totalRevenue, prevRevenue),
      conversionRate: prevConversionRate > 0 ? conversionRate - prevConversionRate : null // Absolute difference for rates
    }

    // =========================================
    // LEAD VELOCITY (Time to close)
    // =========================================

    const closedLeadsWithTime = wonLeads.filter(l => l.closed_at && l.created_at)
    const velocityData = closedLeadsWithTime.map(l => {
      return differenceInDays(new Date(l.closed_at!), new Date(l.created_at))
    }).filter(days => days >= 0 && days < 365) // Filter out invalid data

    const avgLeadVelocity = velocityData.length > 0
      ? velocityData.reduce((sum, d) => sum + d, 0) / velocityData.length
      : null

    const fastestClose = velocityData.length > 0 ? Math.min(...velocityData) : null
    const slowestClose = velocityData.length > 0 ? Math.max(...velocityData) : null

    // SOURCE CHANNEL ANALYTICS
    const sourceChannels = ['email', 'facebook', 'instagram', 'whatsapp', 'trak']
    const sourceAnalytics = sourceChannels.map(source => {
      const sourceLeads = allLeads.filter(l => {
        const st = (l.source_type || '').toLowerCase()
        if (source === 'email') return st === 'email' || st === 'gmail'
        if (source === 'facebook') return st === 'facebook' || st === 'fb'
        if (source === 'instagram') return st === 'instagram' || st === 'ig'
        if (source === 'whatsapp') return st === 'whatsapp'
        if (source === 'trak') return st === 'trak' || st === 'website' || st === 'web'
        return false
      })

      const won = sourceLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
      const lost = sourceLeads.filter(l => lostStageIds.includes(l.stage_id || ''))
      const revenue = won.reduce((sum, l) => sum + (l.value || 0), 0)
      const convRate = sourceLeads.length > 0 ? (won.length / sourceLeads.length) * 100 : 0

      return {
        source,
        label: source === 'email' ? 'Email' :
               source === 'facebook' ? 'Facebook' :
               source === 'instagram' ? 'Instagram' :
               source === 'whatsapp' ? 'WhatsApp' : 'Trak',
        total: sourceLeads.length,
        won: won.length,
        lost: lost.length,
        active: sourceLeads.length - won.length - lost.length,
        revenue,
        conversionRate: convRate,
        color: source === 'email' ? '#EA4335' :
               source === 'facebook' ? '#1877F2' :
               source === 'instagram' ? '#E1306C' :
               source === 'whatsapp' ? '#25D366' : '#3B82F6'
      }
    })

    // Add "other" source for unclassified leads
    const classifiedLeadIds = new Set(
      sourceChannels.flatMap(source => {
        return allLeads.filter(l => {
          const st = (l.source_type || '').toLowerCase()
          if (source === 'email') return st === 'email' || st === 'gmail'
          if (source === 'facebook') return st === 'facebook' || st === 'fb'
          if (source === 'instagram') return st === 'instagram' || st === 'ig'
          if (source === 'whatsapp') return st === 'whatsapp'
          if (source === 'trak') return st === 'trak' || st === 'website' || st === 'web'
          return false
        }).map(l => l.id)
      })
    )

    const otherLeads = allLeads.filter(l => !classifiedLeadIds.has(l.id))
    if (otherLeads.length > 0) {
      const otherWon = otherLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
      const otherLost = otherLeads.filter(l => lostStageIds.includes(l.stage_id || ''))
      sourceAnalytics.push({
        source: 'other',
        label: 'Ostalo',
        total: otherLeads.length,
        won: otherWon.length,
        lost: otherLost.length,
        active: otherLeads.length - otherWon.length - otherLost.length,
        revenue: otherWon.reduce((sum, l) => sum + (l.value || 0), 0),
        conversionRate: otherLeads.length > 0 ? (otherWon.length / otherLeads.length) * 100 : 0,
        color: '#64748B'
      })
    }

    // PIPELINE FUNNEL
    const pipelineFunnel = allStages
      .filter(s => !s.is_won && !s.is_lost)
      .map(stage => {
        const stageLeads = allLeads.filter(l => l.stage_id === stage.id)
        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          count: stageLeads.length,
          value: stageLeads.reduce((sum, l) => sum + (l.value || 0), 0)
        }
      })

    // LEADS OVER TIME
    const days = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365
    const leadsOverTime: { date: string; upiti: number; dobijeno: number; izgubljeno: number }[] = []

    for (let i = Math.min(days, 60) - 1; i >= 0; i--) {
      const date = format(subDays(now, i), 'yyyy-MM-dd')
      const dayLeads = allLeads.filter(l => format(parseISO(l.created_at), 'yyyy-MM-dd') === date)
      const dayWon = dayLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
      const dayLost = dayLeads.filter(l => lostStageIds.includes(l.stage_id || ''))

      leadsOverTime.push({
        date: format(parseISO(date), 'd. MMM'),
        upiti: dayLeads.length,
        dobijeno: dayWon.length,
        izgubljeno: dayLost.length
      })
    }

    // REVENUE OVER TIME
    const revenueOverTime: { date: string; prihod: number }[] = []

    for (let i = Math.min(days, 30) - 1; i >= 0; i--) {
      const date = format(subDays(now, i), 'yyyy-MM-dd')
      const dayWon = allLeads.filter(l => {
        if (!wonStageIds.includes(l.stage_id || '')) return false
        // Use closed_at if available, otherwise created_at
        const leadDate = l.closed_at ? format(parseISO(l.closed_at), 'yyyy-MM-dd') : format(parseISO(l.created_at), 'yyyy-MM-dd')
        return leadDate === date
      })
      const dayRevenue = dayWon.reduce((sum, l) => sum + (l.value || 0), 0)

      revenueOverTime.push({
        date: format(parseISO(date), 'd. MMM'),
        prihod: dayRevenue
      })
    }

    // RESPONSE TIME ANALYTICS
    const responseTimeData: { leadId: string; minutes: number }[] = []

    allLeads.forEach(lead => {
      const leadMessages = allMessages.filter(m => m.lead_id === lead.id)
      const firstInbound = leadMessages.find(m => m.direction === 'inbound')
      const firstOutbound = leadMessages.find(m => m.direction === 'outbound' &&
        firstInbound && new Date(m.sent_at) > new Date(firstInbound.sent_at))

      if (firstInbound && firstOutbound) {
        const minutes = differenceInMinutes(
          new Date(firstOutbound.sent_at),
          new Date(firstInbound.sent_at)
        )
        if (minutes >= 0 && minutes < 10080) { // Less than 7 days
          responseTimeData.push({ leadId: lead.id, minutes })
        }
      }
    })

    const avgResponseTime = responseTimeData.length > 0
      ? responseTimeData.reduce((sum, r) => sum + r.minutes, 0) / responseTimeData.length
      : 0

    const responseUnder1h = responseTimeData.filter(r => r.minutes <= 60).length
    const responseUnder4h = responseTimeData.filter(r => r.minutes <= 240).length
    const responseUnder24h = responseTimeData.filter(r => r.minutes <= 1440).length

    // PACKAGE PERFORMANCE
    const packagePerformance: { name: string; inquiries: number; converted: number; conversionRate: number }[] = []
    const packageMap = new Map<string, { inquiries: number; converted: number }>()

    allInquiries.forEach(inquiry => {
      const packageName = inquiry.qualification_data?.package_name || 'Ostalo'
      const current = packageMap.get(packageName) || { inquiries: 0, converted: 0 }
      current.inquiries++

      // Check if the associated lead was won
      if (inquiry.lead_id) {
        const lead = allLeads.find(l => l.id === inquiry.lead_id)
        if (lead && wonStageIds.includes(lead.stage_id || '')) {
          current.converted++
        }
      } else if (inquiry.status === 'converted' || inquiry.status === 'responded') {
        current.converted++
      }

      packageMap.set(packageName, current)
    })

    packageMap.forEach((data, name) => {
      if (name !== 'Ostalo' || data.inquiries > 0) {
        packagePerformance.push({
          name,
          inquiries: data.inquiries,
          converted: data.converted,
          conversionRate: data.inquiries > 0 ? (data.converted / data.inquiries) * 100 : 0
        })
      }
    })

    packagePerformance.sort((a, b) => b.inquiries - a.inquiries)

    // DESTINATION ANALYTICS
    const destinationMap = new Map<string, { count: number; revenue: number; won: number }>()

    allLeads.forEach(lead => {
      if (lead.destination) {
        const dest = lead.destination
        const current = destinationMap.get(dest) || { count: 0, revenue: 0, won: 0 }
        current.count++
        if (wonStageIds.includes(lead.stage_id || '')) {
          current.won++
          current.revenue += lead.value || 0
        }
        destinationMap.set(dest, current)
      }
    })

    const topDestinations = Array.from(destinationMap.entries())
      .map(([name, data]) => ({
        name,
        leads: data.count,
        won: data.won,
        revenue: data.revenue,
        conversionRate: data.count > 0 ? (data.won / data.count) * 100 : 0
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 10)

    // AGENT PERFORMANCE
    const agentPerformance = (teamMembers || []).map(agent => {
      const agentLeads = allLeads.filter(l => l.assigned_to === agent.id)
      const won = agentLeads.filter(l => wonStageIds.includes(l.stage_id || ''))
      const lost = agentLeads.filter(l => lostStageIds.includes(l.stage_id || ''))
      const revenue = won.reduce((sum, l) => sum + (l.value || 0), 0)

      // Calculate agent's response times
      const agentResponseTimes = responseTimeData.filter(r => {
        const lead = allLeads.find(l => l.id === r.leadId)
        return lead?.assigned_to === agent.id
      })
      const avgAgentResponse = agentResponseTimes.length > 0
        ? agentResponseTimes.reduce((sum, r) => sum + r.minutes, 0) / agentResponseTimes.length
        : null

      return {
        id: agent.id,
        name: agent.full_name || agent.email?.split('@')[0] || 'Unknown',
        email: agent.email,
        leads: agentLeads.length,
        won: won.length,
        lost: lost.length,
        active: agentLeads.length - won.length - lost.length,
        revenue,
        conversionRate: agentLeads.length > 0 ? (won.length / agentLeads.length) * 100 : 0,
        avgResponseMinutes: avgAgentResponse
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // AWAITING RESPONSE COUNT
    const awaitingResponse = allLeads.filter(l => l.awaiting_response === true).length

    return NextResponse.json({
      overview: {
        totalLeads,
        wonLeads: wonLeads.length,
        lostLeads: lostLeads.length,
        activeLeads: activeLeads.length,
        conversionRate,
        totalRevenue,
        bookingsRevenue,
        avgDealValue,
        awaitingResponse,
        responseTime: {
          avgMinutes: avgResponseTime,
          under1h: responseUnder1h,
          under4h: responseUnder4h,
          under24h: responseUnder24h,
          total: responseTimeData.length
        },
        comparison,
        velocity: {
          avgDays: avgLeadVelocity,
          fastestDays: fastestClose,
          slowestDays: slowestClose,
          sampleSize: velocityData.length
        }
      },
      sourceAnalytics,
      pipelineFunnel,
      leadsOverTime,
      revenueOverTime,
      packagePerformance: packagePerformance.slice(0, 10),
      topDestinations,
      agentPerformance
    })

  } catch (error: unknown) {
    console.error('Analytics API error:', error)
    const message = error instanceof Error ? error.message : 'Interna greška'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
