import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Offer, QualificationData } from '@/types'

// GET /api/public/agencies/[slug]/offers
// Returns filtered offers with pagination and relevance sorting
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
      .select('organization_id, is_active')
      .eq('slug', slug)
      .single()

    if (settingsError || !settings || settings.is_active === false) {
      return NextResponse.json(
        { error: 'Agencija nije pronađena' },
        { status: 404 }
      )
    }

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '6')
    const offset = (page - 1) * limit

    // Filter params
    const country = searchParams.get('country')
    const city = searchParams.get('city')
    const month = searchParams.get('month')
    const departureFrom = searchParams.get('departure_from') || searchParams.get('departureFrom')
    const departureTo = searchParams.get('departure_to') || searchParams.get('departureTo')
    const minPrice = searchParams.get('minPrice') || searchParams.get('min_price')
    const maxPrice = searchParams.get('maxPrice') || searchParams.get('max_price')
    const boardType = searchParams.get('boardType') || searchParams.get('board_type')
    const accommodationType = searchParams.get('accommodationType') || searchParams.get('accommodation_type')
    const transportType = searchParams.get('transportType') || searchParams.get('transport_type')
    const inventoryType = searchParams.get('inventoryType') || searchParams.get('inventory_type')

    // Check if any filters are applied
    const hasFilters = country || city || month || departureFrom || departureTo || 
                       minPrice || maxPrice || boardType || accommodationType || 
                       transportType || inventoryType

    // STEP 1: Get matching offers count first (for initial page only)
    let matchingCount = 0
    let matchingOffers: any[] = []
    
    if (hasFilters && page === 1) {
      let matchQuery = supabase
        .from('offers')
        .select(`
          *,
          images:offer_images(id, url, position, is_primary)
        `)
        .eq('organization_id', settings.organization_id)
        .eq('status', 'active')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .gt('available_spots', 0)

      // Apply all filters for matching query
      if (country) matchQuery = matchQuery.ilike('country', `%${country}%`)
      if (city) matchQuery = matchQuery.ilike('city', `%${city}%`)
      if (departureFrom) matchQuery = matchQuery.gte('departure_date', departureFrom)
      if (departureTo) matchQuery = matchQuery.lte('departure_date', departureTo)
      if (month && !departureFrom) {
        const monthNumber = getMonthNumber(month)
        if (monthNumber) {
          const year = new Date().getFullYear()
          const nextYear = monthNumber < new Date().getMonth() + 1 ? year + 1 : year
          const startDate = new Date(nextYear, monthNumber - 1, 1)
          const endDate = new Date(nextYear, monthNumber, 0)
          matchQuery = matchQuery
            .gte('departure_date', startDate.toISOString().split('T')[0])
            .lte('departure_date', endDate.toISOString().split('T')[0])
        }
      }
      if (minPrice) matchQuery = matchQuery.gte('price_per_person', parseFloat(minPrice))
      if (maxPrice) matchQuery = matchQuery.lte('price_per_person', parseFloat(maxPrice))
      if (boardType && boardType !== 'any') matchQuery = matchQuery.eq('board_type', boardType)
      if (accommodationType && accommodationType !== 'any') matchQuery = matchQuery.eq('accommodation_type', accommodationType)
      if (transportType && transportType !== 'none') matchQuery = matchQuery.eq('transport_type', transportType)
      if (inventoryType) matchQuery = matchQuery.eq('inventory_type', inventoryType)

      // Sort by relevance
      matchQuery = matchQuery
        .order('is_recommended', { ascending: false, nullsFirst: false })
        .order('views_total', { ascending: false, nullsFirst: false })
        .order('departure_date', { ascending: true })

      const { data: matched, error: matchError } = await matchQuery

      if (!matchError && matched) {
        matchingOffers = matched.map(offer => ({
          ...offer,
          isMatch: true,
          images: (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
        }))
        matchingCount = matchingOffers.length
      }
    }

    // STEP 2: Get all offers sorted by relevance (for infinite scroll)
    // This ensures we ALWAYS return offers, even if no filters match
    // Exclude matching offers IDs to avoid duplicates
    const matchingIds = matchingOffers.map(o => o.id)
    
    let allQuery = supabase
      .from('offers')
      .select(`
        *,
        images:offer_images(id, url, position, is_primary)
      `, { count: 'exact' })
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .gt('available_spots', 0)
      .order('is_recommended', { ascending: false, nullsFirst: false })
      .order('views_total', { ascending: false, nullsFirst: false })
      .order('departure_date', { ascending: true })

    // If we have matching offers on page 1, exclude them from the "more" query
    if (page === 1 && matchingIds.length > 0) {
      allQuery = allQuery.not('id', 'in', `(${matchingIds.join(',')})`)
    }

    // For page > 1, apply offset accounting for initial matching offers
    if (page > 1) {
      // After page 1, we only fetch non-matching offers
      if (matchingIds.length > 0) {
        allQuery = allQuery.not('id', 'in', `(${matchingIds.join(',')})`)
      }
      // Calculate offset for subsequent pages
      const adjustedOffset = (page - 2) * limit // page 2 starts at 0, page 3 at limit, etc.
      allQuery = allQuery.range(adjustedOffset, adjustedOffset + limit - 1)
    } else {
      // Page 1: get remaining offers after matching ones to fill the page
      const remainingSlots = Math.max(0, limit - matchingOffers.length)
      if (remainingSlots > 0) {
        allQuery = allQuery.limit(remainingSlots)
      } else {
        // Matching offers fill the page, but we still need to count total
        allQuery = allQuery.limit(0)
      }
    }

    const { data: moreOffers, error: moreError, count: totalCount } = await allQuery

    if (moreError) {
      console.error('Error fetching offers:', moreError)
      return NextResponse.json(
        { error: 'Greška pri učitavanju ponuda' },
        { status: 500 }
      )
    }

    // Process additional offers
    const processedMoreOffers = (moreOffers || []).map(offer => ({
      ...offer,
      isMatch: false,
      images: (offer.images || []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    }))

    // Combine offers: matching first, then others
    let combinedOffers: any[]
    if (page === 1) {
      combinedOffers = [...matchingOffers, ...processedMoreOffers]
    } else {
      combinedOffers = processedMoreOffers
    }

    // Calculate if there are more offers
    const totalNonMatching = (totalCount || 0)
    const fetchedSoFar = page === 1 
      ? matchingOffers.length + processedMoreOffers.length 
      : offset + processedMoreOffers.length
    const hasMore = fetchedSoFar < (matchingCount + totalNonMatching)

    // Split by inventory type
    const ownedOffers = combinedOffers.filter(o => o.inventory_type === 'owned')
    const inquiryOffers = combinedOffers.filter(o => o.inventory_type === 'inquiry')

    return NextResponse.json({
      offers: combinedOffers,
      owned: ownedOffers,
      inquiry: inquiryOffers,
      total: matchingCount + totalNonMatching,
      matchingCount,
      page,
      limit,
      hasMore,
      isFallback: page === 1 && matchingCount === 0 && combinedOffers.length > 0,
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
