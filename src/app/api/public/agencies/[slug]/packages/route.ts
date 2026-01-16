import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/agencies/[slug]/packages
// Returns filtered departures with package info for public display
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
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
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
    const transportType = searchParams.get('transportType') || searchParams.get('transport_type')
    const packageType = searchParams.get('packageType') || searchParams.get('package_type')

    // Check if any filters are applied
    const hasFilters = country || city || month || departureFrom || departureTo || 
                       minPrice || maxPrice || boardType || transportType || packageType

    // STEP 1: Get matching departures count first (for initial page only)
    let matchingCount = 0
    let matchingDepartures: any[] = []
    
    if (hasFilters && page === 1) {
      let matchQuery = supabase
        .from('departures_with_package')
        .select('*')
        .eq('organization_id', settings.organization_id)
        .eq('status', 'active')
        .eq('is_visible', true)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .gt('available_spots', 0)

      // Apply all filters for matching query
      if (country) matchQuery = matchQuery.ilike('destination_country', `%${country}%`)
      if (city) matchQuery = matchQuery.ilike('destination_city', `%${city}%`)
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
      if (minPrice) matchQuery = matchQuery.gte('effective_price', parseFloat(minPrice))
      if (maxPrice) matchQuery = matchQuery.lte('effective_price', parseFloat(maxPrice))
      if (boardType && boardType !== 'any') matchQuery = matchQuery.eq('board_type', boardType)
      if (transportType && transportType !== 'none') matchQuery = matchQuery.eq('transport_type', transportType)
      if (packageType) matchQuery = matchQuery.eq('package_type', packageType)

      // Sort by relevance
      matchQuery = matchQuery
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('departure_date', { ascending: true })

      const { data: matched, error: matchError } = await matchQuery

      if (!matchError && matched) {
        matchingDepartures = matched.map(dep => ({
          ...dep,
          isMatch: true,
        }))
        matchingCount = matchingDepartures.length
      }
    }

    // STEP 2: Get all departures sorted by relevance (for infinite scroll)
    const matchingIds = matchingDepartures.map(d => d.id)
    
    let allQuery = supabase
      .from('departures_with_package')
      .select('*', { count: 'exact' })
      .eq('organization_id', settings.organization_id)
      .eq('status', 'active')
      .eq('is_visible', true)
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .order('is_featured', { ascending: false, nullsFirst: false })
      .order('departure_date', { ascending: true })

    // Only show departures with available spots for fiksni packages
    // Na upit packages don't have capacity tracking
    allQuery = allQuery.or('available_spots.gt.0,available_spots.is.null')

    // If we have matching departures on page 1, exclude them from the "more" query
    if (page === 1 && matchingIds.length > 0) {
      allQuery = allQuery.not('id', 'in', `(${matchingIds.join(',')})`)
    }

    // For page > 1, apply offset accounting for initial matching departures
    if (page > 1) {
      if (matchingIds.length > 0) {
        allQuery = allQuery.not('id', 'in', `(${matchingIds.join(',')})`)
      }
      const adjustedOffset = (page - 2) * limit
      allQuery = allQuery.range(adjustedOffset, adjustedOffset + limit - 1)
    } else {
      const remainingSlots = Math.max(0, limit - matchingDepartures.length)
      if (remainingSlots > 0) {
        allQuery = allQuery.limit(remainingSlots)
      } else {
        allQuery = allQuery.limit(0)
      }
    }

    const { data: moreDepartures, error: moreError, count: totalCount } = await allQuery

    if (moreError) {
      console.error('Error fetching departures:', moreError)
      return NextResponse.json(
        { error: 'Greška pri učitavanju ponuda' },
        { status: 500 }
      )
    }

    // Process additional departures
    const processedMoreDepartures = (moreDepartures || []).map(dep => ({
      ...dep,
      isMatch: false,
    }))

    // Combine departures: matching first, then others
    let combinedDepartures: any[]
    if (page === 1) {
      combinedDepartures = [...matchingDepartures, ...processedMoreDepartures]
    } else {
      combinedDepartures = processedMoreDepartures
    }

    // Fetch images for all packages
    const packageIds = [...new Set(combinedDepartures.map(d => d.package_id))]
    let imagesMap: Record<string, any[]> = {}
    
    if (packageIds.length > 0) {
      const { data: images } = await supabase
        .from('package_images')
        .select('*')
        .in('package_id', packageIds)
        .order('position', { ascending: true })
      
      if (images) {
        imagesMap = images.reduce((acc, img) => {
          if (!acc[img.package_id]) acc[img.package_id] = []
          acc[img.package_id].push(img)
          return acc
        }, {} as Record<string, any[]>)
      }
    }

    // Attach images to departures
    const departuresWithImages = combinedDepartures.map(dep => ({
      ...dep,
      images: imagesMap[dep.package_id] || [],
    }))

    // Calculate if there are more departures
    const totalNonMatching = (totalCount || 0)
    const fetchedSoFar = page === 1 
      ? matchingDepartures.length + processedMoreDepartures.length 
      : offset + processedMoreDepartures.length
    const hasMore = fetchedSoFar < (matchingCount + totalNonMatching)

    // Split by package type
    const fiksniDepartures = departuresWithImages.filter(d => d.package_type === 'fiksni')
    const naUpitDepartures = departuresWithImages.filter(d => d.package_type === 'na_upit')

    return NextResponse.json({
      departures: departuresWithImages,
      fiksni: fiksniDepartures,
      na_upit: naUpitDepartures,
      total: matchingCount + totalNonMatching,
      matchingCount,
      page,
      limit,
      hasMore,
      isFallback: page === 1 && matchingCount === 0 && departuresWithImages.length > 0,
    })
  } catch (error) {
    console.error('Error fetching public packages:', error)
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
