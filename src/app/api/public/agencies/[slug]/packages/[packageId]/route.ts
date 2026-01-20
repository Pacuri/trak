import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/agencies/[slug]/packages/[packageId]
// Returns a single package with valid_from, valid_to, price_intervals, room_types, hotel_prices for na upit date picker
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; packageId: string }> }
) {
  try {
    const { slug, packageId } = await params
    const supabase = await createClient()

    let organizationId: string | null = null
    const { data: settings } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, is_active')
      .eq('slug', slug)
      .single()
    if (settings?.organization_id && settings.is_active !== false) organizationId = settings.organization_id
    if (!organizationId) {
      const { data: org } = await supabase.from('organizations').select('id').eq('slug', slug).single()
      if (org?.id) organizationId = org.id
    }
    if (!organizationId) {
      return NextResponse.json({ error: 'Agencija nije pronađena' }, { status: 404 })
    }

    const { data: pkg, error } = await supabase
      .from('packages')
      .select('id, name, description, destination_country, destination_city, hotel_name, hotel_stars, package_type, board_type, transport_type, departure_location, price_from, currency, price_type, valid_from, valid_to, default_duration, meal_plans')
      .eq('id', packageId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('is_active', true)
      .single()

    if (error || !pkg) {
      return NextResponse.json({ error: 'Paket nije pronađen' }, { status: 404 })
    }

    const [
      { data: images },
      { data: priceIntervals },
      { data: roomTypes },
      { data: hotelPrices },
      { data: childrenPolicies },
      { data: supplements },
      { data: fees },
      { data: discounts },
      { data: notes },
    ] = await Promise.all([
      supabase.from('package_images').select('id, url, position, is_primary').eq('package_id', packageId).order('position', { ascending: true }),
      supabase.from('price_intervals').select('*').eq('package_id', packageId).order('sort_order', { ascending: true }),
      supabase.from('room_types').select('*').eq('package_id', packageId).order('sort_order', { ascending: true }),
      supabase.from('hotel_prices').select('*').eq('package_id', packageId),
      supabase.from('children_policies').select('*').eq('package_id', packageId).order('age_from', { ascending: true }),
      supabase.from('package_supplements').select('*').eq('package_id', packageId),
      supabase.from('package_fees').select('*').eq('package_id', packageId),
      supabase.from('package_discounts').select('*').eq('package_id', packageId),
      supabase.from('package_notes').select('*').eq('package_id', packageId),
    ])

    // Fetch room type images if we have room types
    let roomTypesWithImages = roomTypes ?? []
    if (roomTypes && roomTypes.length > 0) {
      const roomTypeIds = roomTypes.map(rt => rt.id)
      const { data: roomTypeImages } = await supabase
        .from('room_type_images')
        .select('id, room_type_id, url, alt_text, position, is_primary')
        .in('room_type_id', roomTypeIds)
        .order('position', { ascending: true })

      // Attach images to each room type
      roomTypesWithImages = roomTypes.map(rt => ({
        ...rt,
        images: (roomTypeImages ?? []).filter(img => img.room_type_id === rt.id)
      }))
    }

    return NextResponse.json({
      ...pkg,
      images: images ?? [],
      price_intervals: priceIntervals ?? [],
      room_types: roomTypesWithImages,
      hotel_prices: hotelPrices ?? [],
      children_policies: childrenPolicies ?? [],
      supplements: supplements ?? [],
      fees: fees ?? [],
      discounts: discounts ?? [],
      notes: notes ?? [],
    })
  } catch (e) {
    console.error('Public package GET:', e)
    return NextResponse.json({ error: 'Greška pri učitavanju paketa' }, { status: 500 })
  }
}
