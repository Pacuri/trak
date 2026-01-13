import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { QualificationData } from '@/types'

interface CreateInquiryBody {
  slug: string
  offer_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_message?: string
  qualification_data?: QualificationData
}

// POST /api/public/inquiries
// Create a new inquiry for on-request (inquiry type) offers
export async function POST(request: NextRequest) {
  try {
    const body: CreateInquiryBody = await request.json()

    const {
      slug,
      offer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_message,
      qualification_data,
    } = body

    // Validate required fields
    if (!slug || !offer_id || !customer_name || !customer_phone) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get agency settings
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, response_time_working, response_time_outside, working_hours')
      .eq('slug', slug)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Verify offer exists and is inquiry type
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, name, inventory_type, organization_id')
      .eq('id', offer_id)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Ponuda nije pronađena' },
        { status: 404 }
      )
    }

    // Check if this phone already has a pending inquiry for this offer
    const { data: existingInquiry } = await supabase
      .from('offer_inquiries')
      .select('id')
      .eq('offer_id', offer_id)
      .eq('customer_phone', customer_phone)
      .eq('status', 'pending')
      .single()

    if (existingInquiry) {
      return NextResponse.json(
        { error: 'Već imate aktivan upit za ovu ponudu' },
        { status: 400 }
      )
    }

    // Create inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('offer_inquiries')
      .insert({
        organization_id: settings.organization_id,
        offer_id,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        customer_message: customer_message || null,
        qualification_data: qualification_data || null,
        status: 'pending',
      })
      .select(`
        id, customer_name, customer_phone, status, created_at,
        offer:offers(id, name, star_rating, country, city, price_per_person)
      `)
      .single()

    if (inquiryError) {
      console.error('Error creating inquiry:', inquiryError)
      return NextResponse.json(
        { error: 'Greška pri slanju upita' },
        { status: 500 }
      )
    }

    // Calculate expected response time
    const responseTime = calculateResponseTime(settings.working_hours, settings.response_time_working)

    return NextResponse.json({
      success: true,
      inquiry: {
        id: inquiry.id,
        offer: inquiry.offer,
        created_at: inquiry.created_at,
      },
      response_time: responseTime,
    })
  } catch (error) {
    console.error('Error creating inquiry:', error)
    return NextResponse.json(
      { error: 'Greška pri slanju upita' },
      { status: 500 }
    )
  }
}

function calculateResponseTime(
  workingHours: Record<string, { enabled: boolean; start: string; end: string }>,
  responseTimeMinutes: number
): { message: string; icon: string } {
  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const currentDay = dayNames[now.getDay()]
  const currentSchedule = workingHours[currentDay]

  if (!currentSchedule) {
    return { message: `Odgovaramo u roku od ${responseTimeMinutes} minuta`, icon: '⚡' }
  }

  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (currentSchedule.enabled && currentTime >= currentSchedule.start && currentTime <= currentSchedule.end) {
    return { message: `Odgovor u roku od ${responseTimeMinutes} minuta`, icon: '⚡' }
  }

  // Find next open time
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (now.getDay() + i) % 7
    const nextDayName = dayNames[nextDayIndex]
    const nextSchedule = workingHours[nextDayName]

    if (nextSchedule?.enabled) {
      if (i === 1 && currentTime < currentSchedule.start) {
        return { message: `Odgovaramo od ${currentSchedule.start}`, icon: '☀️' }
      } else if (i === 1) {
        return { message: `Odgovaramo sutra od ${nextSchedule.start}`, icon: '🌙' }
      } else {
        const dayLabel = nextDayName === 'monday' ? 'ponedeljak' : 
                        nextDayName === 'tuesday' ? 'utorak' :
                        nextDayName === 'wednesday' ? 'sredu' :
                        nextDayName === 'thursday' ? 'četvrtak' :
                        nextDayName === 'friday' ? 'petak' :
                        nextDayName === 'saturday' ? 'subotu' : 'nedelju'
        return { message: `Odgovaramo u ${dayLabel} od ${nextSchedule.start}`, icon: '📅' }
      }
    }
  }

  return { message: 'Odgovaramo u najkraćem roku', icon: '⏱️' }
}
