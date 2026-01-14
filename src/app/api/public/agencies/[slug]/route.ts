import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AgencyBookingSettings } from '@/types'

// GET /api/public/agencies/[slug]
// Returns agency public landing page data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch agency settings by slug
    const { data: settings, error } = await supabase
      .from('agency_booking_settings')
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .eq('slug', slug)
      .single()

    if (error || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Get counts of active offers by type
    const { data: offerCounts } = await supabase
      .from('offers')
      .select('inventory_type')
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .gte('departure_date', new Date().toISOString().split('T')[0])

    const ownedCount = offerCounts?.filter(o => o.inventory_type === 'owned').length || 0
    const inquiryCount = offerCounts?.filter(o => o.inventory_type === 'inquiry').length || 0

    // Return public-safe data
    const publicSettings: Partial<AgencyBookingSettings> & { 
      organization_name: string
      offer_counts: { owned: number; inquiry: number; total: number }
    } = {
      slug: settings.slug,
      display_name: (settings as any).agency_name || settings.organization?.name,
      logo_url: (settings as any).agency_logo_url,
      primary_color: settings.primary_color,
      contact_phone: settings.contact_phone,
      contact_email: settings.contact_email,
      contact_address: settings.contact_address,
      working_hours: settings.working_hours,
      response_time_working: settings.response_time_working,
      response_time_outside: settings.response_time_outside,
      allow_online_payment: settings.allow_online_payment,
      allow_deposit_payment: settings.allow_deposit_payment,
      allow_agency_payment: settings.allow_agency_payment,
      allow_contact_request: settings.allow_contact_request,
      meta_title: settings.meta_title,
      meta_description: settings.meta_description,
      organization_name: settings.organization?.name,
      offer_counts: {
        owned: ownedCount,
        inquiry: inquiryCount,
        total: ownedCount + inquiryCount,
      },
    }

    return NextResponse.json(publicSettings)
  } catch (error) {
    console.error('Error fetching agency:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju agencije' },
      { status: 500 }
    )
  }
}
