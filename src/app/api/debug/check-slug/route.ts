import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/debug/check-slug?slug=asdasds
// Debug endpoint to check if a slug exists in agency_booking_settings
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug') || 'asdasds'
    const supabase = await createClient()

    // Check 1: Direct lookup by slug
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('*')
      .eq('slug', slug)
      .single()

    // Check 2: Get ALL agency_booking_settings to see what slugs exist
    const { data: allSettings, error: allError } = await supabase
      .from('agency_booking_settings')
      .select('id, slug, organization_id, is_active, agency_name')

    // Check 3: Get organizations table
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, slug')

    return NextResponse.json({
      searchedSlug: slug,
      found: !!settings,
      error: settingsError?.message || null,
      record: settings || null,
      allAgencySettings: allSettings || [],
      allOrganizations: orgs || [],
      diagnosis: !settings
        ? `No agency_booking_settings record found with slug="${slug}". Available slugs: ${allSettings?.map(s => s.slug).join(', ') || 'none'}`
        : settings.is_active === false
        ? 'Record exists but is_active is false'
        : 'Record exists and is active - should work!',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
