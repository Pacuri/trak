import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/debug/production-check
// Debug endpoint to check production database state
export async function GET() {
  try {
    const supabase = await createClient()

    // Check 1: Verify agency_booking_settings for 'qwetix'
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('*')
      .eq('slug', 'qwetix')
      .single()

    const settingsCheck = {
      exists: !!settings,
      error: settingsError?.message || null,
      data: settings || null,
    }

    // Check 2: If settings exist, check offers for that organization
    let offersCheck = null
    if (settings?.organization_id) {
      const { data: offers, error: offersError, count } = await supabase
        .from('offers')
        .select('id, name, status, available_spots, departure_date, country, city', { count: 'exact' })
        .eq('organization_id', settings.organization_id)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .limit(10)

      const { data: allOffers, count: totalCount } = await supabase
        .from('offers')
        .select('id', { count: 'exact' })
        .eq('organization_id', settings.organization_id)

      offersCheck = {
        totalOffers: totalCount || 0,
        futureOffers: count || 0,
        activeOffers: offers?.filter(o => o.status === 'active' && o.available_spots > 0).length || 0,
        sampleOffers: offers || [],
        error: offersError?.message || null,
      }
    }

    // Check 3: Get all organizations to see what exists
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .limit(10)

    const orgsCheck = {
      count: orgs?.length || 0,
      organizations: orgs || [],
      error: orgsError?.message || null,
    }

    // Check 4: Get all agency_booking_settings
    const { data: allSettings, error: allSettingsError } = await supabase
      .from('agency_booking_settings')
      .select('slug, organization_id, is_active')
      .limit(10)

    const allSettingsCheck = {
      count: allSettings?.length || 0,
      settings: allSettings || [],
      error: allSettingsError?.message || null,
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      checks: {
        qwetixSettings: settingsCheck,
        qwetixOffers: offersCheck,
        allOrganizations: orgsCheck,
        allAgencySettings: allSettingsCheck,
      },
      diagnosis: {
        hasQwetixSlug: settingsCheck.exists,
        isActive: settings?.is_active || false,
        hasOffers: (offersCheck?.activeOffers || 0) > 0,
        issue: !settingsCheck.exists 
          ? 'Missing agency_booking_settings record for qwetix'
          : !settings?.is_active
          ? 'agency_booking_settings exists but is_active is false'
          : (offersCheck?.activeOffers || 0) === 0
          ? 'No active offers with available spots for this organization'
          : 'Everything looks good - may be a different issue',
      },
    })
  } catch (error) {
    console.error('Debug check error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run debug check', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
