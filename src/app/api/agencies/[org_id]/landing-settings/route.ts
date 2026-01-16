import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_LANDING_SETTINGS } from '@/types/landing'
import type { AgencyLandingSettings } from '@/types/landing'
import type { AgencyInquirySettings } from '@/types/inquiry'

interface CombinedSettingsResponse {
  landing: AgencyLandingSettings
  inquiry: AgencyInquirySettings
  slug: string | null
}

// GET /api/agencies/[org_id]/landing-settings
// Get landing and inquiry settings for the organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ org_id: string }> }
) {
  try {
    const { org_id } = await params
    const supabase = await createClient()

    // Verify user is authenticated and belongs to this org
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niste prijavljeni' },
        { status: 401 }
      )
    }

    // Check user belongs to this organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.organization_id !== org_id) {
      return NextResponse.json(
        { error: 'Nemate pristup ovoj organizaciji' },
        { status: 403 }
      )
    }

    // Fetch landing settings
    const { data: landingData, error: landingError } = await supabase
      .from('agency_landing_settings')
      .select('*')
      .eq('organization_id', org_id)
      .single()

    // Fetch booking settings (for inquiry columns and slug)
    const { data: bookingData, error: bookingError } = await supabase
      .from('agency_booking_settings')
      .select(`
        slug,
        allow_custom_inquiries,
        show_inquiry_with_results,
        inquiry_response_text,
        inquiry_notification_email,
        inquiry_notification_phone
      `)
      .eq('organization_id', org_id)
      .single()

    // Build landing settings with defaults
    const landing: AgencyLandingSettings = {
      id: landingData?.id || '',
      organization_id: org_id,
      created_at: landingData?.created_at || new Date().toISOString(),
      updated_at: landingData?.updated_at || new Date().toISOString(),
      ...DEFAULT_LANDING_SETTINGS,
      ...(landingData || {}),
    }

    // Build inquiry settings with defaults
    const inquiry: AgencyInquirySettings = {
      allow_custom_inquiries: bookingData?.allow_custom_inquiries ?? true,
      show_inquiry_with_results: bookingData?.show_inquiry_with_results ?? true,
      inquiry_response_text: bookingData?.inquiry_response_text || 'Javićemo vam se u roku od 24 sata',
      inquiry_notification_email: bookingData?.inquiry_notification_email || null,
      inquiry_notification_phone: bookingData?.inquiry_notification_phone || null,
    }

    const response: CombinedSettingsResponse = {
      landing,
      inquiry,
      slug: bookingData?.slug || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching landing settings:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju podešavanja' },
      { status: 500 }
    )
  }
}

// PUT /api/agencies/[org_id]/landing-settings
// Update landing and inquiry settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ org_id: string }> }
) {
  try {
    const { org_id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Verify user is authenticated and belongs to this org
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Niste prijavljeni' },
        { status: 401 }
      )
    }

    // Check user belongs to this organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.organization_id !== org_id) {
      return NextResponse.json(
        { error: 'Nemate pristup ovoj organizaciji' },
        { status: 403 }
      )
    }

    const { landing, inquiry } = body

    // Upsert landing settings
    if (landing) {
      const landingToSave = {
        organization_id: org_id,
        logo_url: landing.logo_url || null,
        logo_initials: landing.logo_initials || null,
        primary_color: landing.primary_color || '#0F766E',
        background_image_url: landing.background_image_url || null,
        headline: landing.headline || 'Pronađite savršeno putovanje',
        subtitle: landing.subtitle || 'Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas, za manje od 60 sekundi.',
        cta_text: landing.cta_text || 'Započni pretragu',
        show_specialization: landing.show_specialization || false,
        specialization_emoji: landing.specialization_emoji || null,
        specialization_text: landing.specialization_text || null,
        show_stats: landing.show_stats || false,
        stat_travelers: landing.stat_travelers || null,
        stat_years: landing.stat_years || null,
        stat_rating: landing.stat_rating || null,
        stat_destinations: landing.stat_destinations || null,
        is_yuta_member: landing.is_yuta_member || false,
        is_licensed: landing.is_licensed ?? true,
        license_number: landing.license_number || null,
        show_installments: landing.show_installments || false,
        show_secure_booking: landing.show_secure_booking ?? true,
        legal_name: landing.legal_name || null,
        footer_text: landing.footer_text || null,
        updated_at: new Date().toISOString(),
      }

      const { error: landingError } = await supabase
        .from('agency_landing_settings')
        .upsert(landingToSave, {
          onConflict: 'organization_id',
        })

      if (landingError) {
        console.error('Error saving landing settings:', landingError)
        return NextResponse.json(
          { error: 'Greška pri čuvanju podešavanja landing stranice' },
          { status: 500 }
        )
      }
    }

    // Update inquiry settings in booking settings
    if (inquiry) {
      const { error: inquiryError } = await supabase
        .from('agency_booking_settings')
        .update({
          allow_custom_inquiries: inquiry.allow_custom_inquiries ?? true,
          show_inquiry_with_results: inquiry.show_inquiry_with_results ?? true,
          inquiry_response_text: inquiry.inquiry_response_text || 'Javićemo vam se u roku od 24 sata',
          inquiry_notification_email: inquiry.inquiry_notification_email || null,
          inquiry_notification_phone: inquiry.inquiry_notification_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', org_id)

      if (inquiryError) {
        console.error('Error saving inquiry settings:', inquiryError)
        return NextResponse.json(
          { error: 'Greška pri čuvanju podešavanja upita' },
          { status: 500 }
        )
      }
    }

    // Fetch and return updated settings
    const { data: updatedLanding } = await supabase
      .from('agency_landing_settings')
      .select('*')
      .eq('organization_id', org_id)
      .single()

    const { data: updatedBooking } = await supabase
      .from('agency_booking_settings')
      .select(`
        slug,
        allow_custom_inquiries,
        show_inquiry_with_results,
        inquiry_response_text,
        inquiry_notification_email,
        inquiry_notification_phone
      `)
      .eq('organization_id', org_id)
      .single()

    const response: CombinedSettingsResponse = {
      landing: {
        ...DEFAULT_LANDING_SETTINGS,
        ...updatedLanding,
        id: updatedLanding?.id || '',
        organization_id: org_id,
        created_at: updatedLanding?.created_at || new Date().toISOString(),
        updated_at: updatedLanding?.updated_at || new Date().toISOString(),
      } as AgencyLandingSettings,
      inquiry: {
        allow_custom_inquiries: updatedBooking?.allow_custom_inquiries ?? true,
        show_inquiry_with_results: updatedBooking?.show_inquiry_with_results ?? true,
        inquiry_response_text: updatedBooking?.inquiry_response_text || 'Javićemo vam se u roku od 24 sata',
        inquiry_notification_email: updatedBooking?.inquiry_notification_email || null,
        inquiry_notification_phone: updatedBooking?.inquiry_notification_phone || null,
      },
      slug: updatedBooking?.slug || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error saving landing settings:', error)
    return NextResponse.json(
      { error: 'Greška pri čuvanju podešavanja' },
      { status: 500 }
    )
  }
}
