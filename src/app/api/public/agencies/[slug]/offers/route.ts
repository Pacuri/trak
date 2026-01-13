import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Offer, QualificationData } from '@/types'

// GET /api/public/agencies/[slug]/offers
// Returns filtered offers for qualification matching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Get organization ID from slug
    const { data: settings, error: settingsError } = await supabase
      .from('agency_booking_settings')
      .select('organization_id')
      .eq('slug', slug)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Build query with filters
    let query = supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, alt_text, position, is_primary)
      `)
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .gt('available_spots', 0)
      .order('departure_date', { ascending: true })

    // Apply filters from query params
    const country = searchParams.get('country')
    const city = searchParams.get('city')
    const month = searchParams.get('month')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const boardType = searchParams.get('boardType')
    const accommodationType = searchParams.get('accommodationType')
    const transportType = searchParams.get('transportType')
    const inventoryType = searchParams.get('inventoryType')

    if (country) {
      query = query.ilike('country', `%${country}%`)
    }

    if (city) {
      query = query.ilike('city', `%${city}%`)
    }

    if (month) {
      // Filter by month - extract from departure_date
      const monthNumber = getMonthNumber(month)
      if (monthNumber) {
        const year = new Date().getFullYear()
        const startDate = new Date(year, monthNumber - 1, 1)
        const endDate = new Date(year, monthNumber, 0)
        query = query
          .gte('departure_date', startDate.toISOString().split('T')[0])
          .lte('departure_date', endDate.toISOString().split('T')[0])
      }
    }

    if (minPrice) {
      query = query.gte('price_per_person', parseFloat(minPrice))
    }

    if (maxPrice) {
      query = query.lte('price_per_person', parseFloat(maxPrice))
    }

    if (boardType && boardType !== 'any') {
      query = query.eq('board_type', boardType)
    }

    if (accommodationType && accommodationType !== 'any') {
      query = query.eq('accommodation_type', accommodationType)
    }

    if (transportType && transportType !== 'none') {
      query = query.eq('transport_type', transportType)
    }

    if (inventoryType) {
      query = query.eq('inventory_type', inventoryType)
    }

    const { data: offers, error } = await query

    if (error) {
      console.error('Error fetching offers:', error)
      return NextResponse.json(
        { error: 'Greška pri učitavanju ponuda' },
        { status: 500 }
      )
    }

    // Sort images by position and mark primary
    const offersWithSortedImages = offers?.map(offer => ({
      ...offer,
      images: (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    })) || []

    // Split by inventory type
    const ownedOffers = offersWithSortedImages.filter(o => o.inventory_type === 'owned')
    const inquiryOffers = offersWithSortedImages.filter(o => o.inventory_type === 'inquiry')

    return NextResponse.json({
      owned: ownedOffers,
      inquiry: inquiryOffers,
      total: offersWithSortedImages.length,
    })
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Greška pri učitavanju ponuda' },
      { status: 500 }
    )
  }
}

// Helper to convert Serbian month name to number
function getMonthNumber(month: string): number | null {
  const months: Record<string, number> = {
    'januar': 1, 'jan': 1,
    'februar': 2, 'feb': 2,
    'mart': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'maj': 5, 'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'avgust': 8, 'aug': 8,
    'septembar': 9, 'sep': 9, 'sept': 9,
    'oktobar': 10, 'okt': 10, 'oct': 10,
    'novembar': 11, 'nov': 11,
    'decembar': 12, 'dec': 12,
  }
  return months[month.toLowerCase()] || null
}
