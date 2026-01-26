import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { QualificationData } from '@/types'

interface CreateInquiryBody {
  slug: string
  offer_id?: string | null
  package_id?: string | null
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_message?: string
  message?: string
  qualification_data?: QualificationData
  adults?: number
  children?: number
  child_ages?: number[]
  selected_date?: string | null
  selected_room_type_id?: string | null
  selected_meal_plan?: string | null
  tracking_id?: string | null  // From sent offer link for conversion tracking
}

// POST /api/public/inquiries
// Create a new inquiry for offers or packages
export async function POST(request: NextRequest) {
  try {
    const body: CreateInquiryBody = await request.json()

    const {
      slug,
      offer_id,
      package_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_message,
      message,
      qualification_data,
      adults,
      children,
      child_ages,
      selected_date,
      selected_room_type_id,
      selected_meal_plan,
      tracking_id,
    } = body

    // Validate required fields
    if (!slug || !customer_name || !customer_phone) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci' },
        { status: 400 }
      )
    }

    // Either offer_id or package_id must be provided
    if (!offer_id && !package_id) {
      return NextResponse.json(
        { error: 'Nedostaje ID ponude ili paketa' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

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

    // If tracking_id is provided, update the lead_sent_offers record
    // to mark that the client submitted an inquiry from the sent link
    if (tracking_id) {
      const { error: trackingError } = await supabase
        .from('lead_sent_offers')
        .update({ inquiry_submitted_at: new Date().toISOString() })
        .eq('tracking_id', tracking_id)
        .is('inquiry_submitted_at', null)  // Only update if not already set

      if (trackingError) {
        console.error('Error updating tracking record:', trackingError)
        // Don't fail the request - tracking is secondary
      }
    }

    // Handle package inquiry (use custom_inquiries table)
    if (package_id) {
      // Verify package exists
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('id, name, hotel_name, destination_country, destination_city')
        .eq('id', package_id)
        .eq('organization_id', settings.organization_id)
        .single()

      if (pkgError || !pkg) {
        return NextResponse.json(
          { error: 'Paket nije pronađen' },
          { status: 404 }
        )
      }

      // Build qualification data for the inquiry
      const inquiryQualificationData = qualification_data || {
        destination: {
          country: pkg.destination_country,
          city: pkg.destination_city || null,
        },
        guests: {
          adults: adults || 2,
          children: children || 0,
          childAges: child_ages || [],
        },
        dates: {
          month: null,
          duration: 7,
          exactDate: selected_date || null,
        },
        accommodation: {
          type: null,
          board: selected_meal_plan || null,
          transport: null,
        },
        budget: {
          min: null,
          max: null,
        },
      }

      // Get the first pipeline stage for new leads
      const { data: firstStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('organization_id', settings.organization_id)
        .eq('is_won', false)
        .eq('is_lost', false)
        .order('position', { ascending: true })
        .limit(1)
        .single()

      // Create custom inquiry for package
      const { data: inquiry, error: insertError } = await supabase
        .from('custom_inquiries')
        .insert({
          organization_id: settings.organization_id,
          customer_name: customer_name.trim(),
          customer_phone: customer_phone.trim(),
          customer_email: customer_email?.trim() || null,
          qualification_data: {
            ...inquiryQualificationData,
            package_id: package_id,
            package_name: pkg.hotel_name || pkg.name,
            selected_date: selected_date,
            selected_room_type_id: selected_room_type_id,
            selected_meal_plan: selected_meal_plan,
          },
          customer_note: message || customer_message || null,
          status: 'new',
          source: 'package_inquiry',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Error creating package inquiry:', insertError)
        return NextResponse.json(
          { error: 'Greška pri slanju upita' },
          { status: 500 }
        )
      }

      // Also create a lead in the pipeline so it shows in "Čeka odgovor"
      const destination = pkg.destination_city
        ? `${pkg.destination_city}, ${pkg.destination_country}`
        : pkg.destination_country
      const leadData = {
        organization_id: settings.organization_id,
        name: customer_name.trim(),
        phone: customer_phone.trim(),
        email: customer_email?.trim() || null,
        source_type: 'trak', // From trak website
        stage_id: firstStage?.id || null,
        destination: destination || null,
        guests: (adults || 2) + (children || 0),
        notes: message || customer_message || null,
        original_message: message || customer_message || null,
        source_inquiry_id: inquiry.id, // Link to the custom inquiry
        awaiting_response: true, // Show in inbox widget
        last_customer_message_at: new Date().toISOString(), // For sorting in inbox
      }

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select('id')
        .single()

      if (leadError) {
        console.error('Error creating lead from package inquiry:', leadError)
        // Don't fail the request - the inquiry was created successfully
      } else if (lead) {
        // Update the custom inquiry to link to the lead
        await supabase
          .from('custom_inquiries')
          .update({ lead_id: lead.id })
          .eq('id', inquiry.id)
      }

      const responseTime = calculateResponseTime(settings.working_hours, settings.response_time_working)

      return NextResponse.json({
        success: true,
        inquiry: {
          id: inquiry.id,
          package: pkg,
          created_at: new Date().toISOString(),
        },
        response_time: responseTime,
      })
    }

    // Handle offer inquiry (existing logic)
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

    // Get the first pipeline stage for new leads
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('organization_id', settings.organization_id)
      .eq('is_won', false)
      .eq('is_lost', false)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    // Create offer inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('offer_inquiries')
      .insert({
        organization_id: settings.organization_id,
        offer_id,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        customer_message: message || customer_message || null,
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

    // Create a lead so the inquiry appears in the CRM inbox ("Čeka odgovor")
    const leadData = {
      organization_id: settings.organization_id,
      name: customer_name.trim(),
      phone: customer_phone.trim(),
      email: customer_email?.trim() || null,
      source_type: 'trak', // From trak website
      stage_id: firstStage?.id || null,
      destination: offer.name, // Use offer name as destination context
      guests: qualification_data?.guests?.adults
        ? (qualification_data.guests.adults + (qualification_data.guests.children || 0))
        : 2,
      notes: message || customer_message || null,
      original_message: message || customer_message || null,
      metadata: {
        inquiry_type: 'offer_inquiry',
        offer_id: offer_id,
        offer_name: offer.name,
      },
      awaiting_response: true, // Show in inbox widget
      last_customer_message_at: new Date().toISOString(), // For sorting in inbox
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single()

    if (leadError) {
      console.error('Error creating lead from offer inquiry:', leadError)
      // Don't fail the request - the inquiry was created successfully
    } else if (lead) {
      // Update the offer inquiry to link to the lead
      await supabase
        .from('offer_inquiries')
        .update({ lead_id: lead.id })
        .eq('id', inquiry.id)
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
