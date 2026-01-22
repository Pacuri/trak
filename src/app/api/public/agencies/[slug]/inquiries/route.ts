import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CreateInquiryRequest, CreateInquiryResponse } from '@/types/inquiry'

// POST /api/public/agencies/[slug]/inquiries
// Submit a custom inquiry when no offers match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body: CreateInquiryRequest = await request.json()

    // Validate required fields
    if (!body.customer_name || body.customer_name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Ime je obavezno (minimum 2 karaktera)' },
        { status: 400 }
      )
    }

    if (!body.customer_phone || body.customer_phone.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'Telefon je obavezan' },
        { status: 400 }
      )
    }

    if (!body.qualification_data) {
      return NextResponse.json(
        { success: false, error: 'Podaci o pretrazi su obavezni' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get agency by slug
    const { data: agency, error: agencyError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, allow_custom_inquiries, inquiry_notification_email, is_active')
      .eq('slug', slug)
      .single()

    if (agencyError || !agency || agency.is_active === false) {
      return NextResponse.json(
        { success: false, error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Check if custom inquiries are allowed
    if (agency.allow_custom_inquiries === false) {
      return NextResponse.json(
        { success: false, error: 'Ova agencija trenutno ne prima prilagođene upite' },
        { status: 403 }
      )
    }

    // Get the first pipeline stage for new leads
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('organization_id', agency.organization_id)
      .eq('is_won', false)
      .eq('is_lost', false)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    // Create custom inquiry record
    const { data: inquiry, error: insertError } = await supabase
      .from('custom_inquiries')
      .insert({
        organization_id: agency.organization_id,
        customer_name: body.customer_name.trim(),
        customer_phone: body.customer_phone.trim(),
        customer_email: body.customer_email?.trim() || null,
        qualification_data: body.qualification_data,
        customer_note: body.customer_note?.trim() || null,
        status: 'new',
        source: 'qualification_flow',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating inquiry:', insertError)
      return NextResponse.json(
        { success: false, error: 'Greška pri slanju upita. Pokušajte ponovo.' },
        { status: 500 }
      )
    }

    // Also create a lead in the pipeline so it shows in "Čeka odgovor"
    const destination = body.qualification_data.destination
    const guests = body.qualification_data.guests
    const leadData = {
      organization_id: agency.organization_id,
      name: body.customer_name.trim(),
      phone: body.customer_phone.trim(),
      email: body.customer_email?.trim() || null,
      source_type: 'trak', // From trak website
      stage_id: firstStage?.id || null,
      destination: destination?.country
        ? `${destination.city ? destination.city + ', ' : ''}${destination.country}`
        : null,
      guests: guests?.adults ? guests.adults + (guests.children || 0) : null,
      notes: body.customer_note?.trim() || null,
      original_message: body.customer_note?.trim() || null,
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
      console.error('Error creating lead from inquiry:', leadError)
      // Don't fail the request - the inquiry was created successfully
    } else if (lead) {
      // Update the custom inquiry to link to the lead
      await supabase
        .from('custom_inquiries')
        .update({ lead_id: lead.id })
        .eq('id', inquiry.id)
    }

    // Log email notification (placeholder for actual email service)
    if (agency.inquiry_notification_email) {
      console.log('📧 EMAIL NOTIFICATION (placeholder):')
      console.log('To:', agency.inquiry_notification_email)
      console.log('Subject: 🔔 Nov upit -', body.customer_name)
      console.log('Customer:', body.customer_name, body.customer_phone)
      console.log('Destination:', body.qualification_data.destination.country, body.qualification_data.destination.city)
      console.log('Guests:', body.qualification_data.guests.adults, 'adults,', body.qualification_data.guests.children, 'children')
      console.log('Note:', body.customer_note || '(none)')
      console.log('---')
    }

    const response: CreateInquiryResponse = {
      success: true,
      inquiry_id: inquiry.id,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing inquiry:', error)
    return NextResponse.json(
      { success: false, error: 'Greška pri obradi upita' },
      { status: 500 }
    )
  }
}
