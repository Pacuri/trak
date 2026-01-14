import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/debug/sync-production
// Sync agency_booking_settings to production
export async function POST(request: Request) {
  try {
    const { organizationId, slug } = await request.json()

    if (!organizationId || !slug) {
      return NextResponse.json(
        { error: 'organizationId and slug are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if the organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found', details: orgError?.message },
        { status: 404 }
      )
    }

    // Check if agency_booking_settings already exists for this slug
    const { data: existing } = await supabase
      .from('agency_booking_settings')
      .select('id, slug, is_active')
      .eq('slug', slug)
      .single()

    if (existing) {
      // Update existing record to ensure it's active
      const { error: updateError } = await supabase
        .from('agency_booking_settings')
        .update({ 
          is_active: true,
          organization_id: organizationId,
        })
        .eq('slug', slug)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update agency_booking_settings', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        message: `Updated existing agency_booking_settings for slug: ${slug}`,
        data: { slug, organizationId, isActive: true },
      })
    }

    // Create new agency_booking_settings record
    const { data: newSettings, error: insertError } = await supabase
      .from('agency_booking_settings')
      .insert({
        organization_id: organizationId,
        slug: slug,
        is_active: true,
        agency_name: org.name,
        primary_color: '#3B82F6',
        working_hours: {
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '13:00' },
          sunday: { enabled: false, start: null, end: null },
        },
        response_time_working: 10,
        response_time_outside: 60,
        reservation_hold_hours: 72,
        deposit_percentage: 30,
        abandoned_cart_enabled: true,
        abandoned_cart_discount_percent: 5,
        abandoned_cart_discount_hours: 72,
        abandoned_cart_email_1_hours: 2,
        abandoned_cart_email_2_hours: 24,
        abandoned_cart_email_3_hours: 72,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create agency_booking_settings', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      message: `Created new agency_booking_settings for slug: ${slug}`,
      data: newSettings,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync production', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
