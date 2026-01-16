import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Get agency by slug
    const { data: agency, error: agencyError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, allow_custom_inquiries, inquiry_notification_email')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (agencyError || !agency) {
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
