import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculatePricesForPackages, type BatchPriceInput } from '@/lib/packages/calculate-group-price'

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

    // Get organization ID from slug: try agency_booking_settings first, fallback to organizations.slug
    let organizationId: string | null = null

    const { data: settings } = await supabase
      .from('agency_booking_settings')
      .select('organization_id, is_active')
      .eq('slug', slug)
      .single()

    if (settings?.organization_id && settings.is_active !== false) {
      organizationId = settings.organization_id
    }

    if (!organizationId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single()
      if (org?.id) organizationId = org.id
    }

    if (!organizationId) {
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

    // Guest params for price calculation
    const adults = parseInt(searchParams.get('adults') || '2')
    const childAgesParam = searchParams.get('child_ages') || searchParams.get('childAges')
    const childAges = childAgesParam ? childAgesParam.split(',').map(Number).filter(n => !isNaN(n)) : []
    const durationNights = parseInt(searchParams.get('duration') || '7')

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
        .eq('organization_id', organizationId)
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
      .eq('organization_id', organizationId)
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

    // STEP 3: Also include packages without departures (especially na_upit packages)
    // Only on page 1 - synthetic departures are all included on first page
    const syntheticDepartures: any[] = []
    if (page === 1) {
      const packagesWithDepartures = new Set(combinedDepartures.map(d => d.package_id))
      
      let packagesWithoutDepartures: any[] = []
      if (packagesWithDepartures.size > 0) {
        const { data } = await supabase
          .from('packages')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .eq('is_active', true)
          .not('id', 'in', `(${Array.from(packagesWithDepartures).join(',')})`)
          .in('package_type', ['na_upit', 'fiksni', 'vlastita']) // Include all types (vlastita might be old name for fiksni)
        packagesWithoutDepartures = data || []
      } else {
        // No departures at all - fetch all active packages
        const { data } = await supabase
          .from('packages')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .eq('is_active', true)
          .in('package_type', ['na_upit', 'fiksni', 'vlastita'])
        packagesWithoutDepartures = data || []
      }

      // Convert packages to departure-like objects
      if (packagesWithoutDepartures && packagesWithoutDepartures.length > 0) {
      const packageIds = packagesWithoutDepartures.map(p => p.id)

      // Fetch images for packages
      const { data: packageImages } = await supabase
        .from('package_images')
        .select('*')
        .in('package_id', packageIds)
        .order('position', { ascending: true })

      const imagesByPackage: Record<string, any[]> = {}
      if (packageImages) {
        packageImages.forEach(img => {
          if (!imagesByPackage[img.package_id]) imagesByPackage[img.package_id] = []
          imagesByPackage[img.package_id].push(img)
        })
      }

      // Fetch minimum prices from hotel_prices for na_upit packages
      const { data: hotelPrices } = await supabase
        .from('hotel_prices')
        .select('package_id, price_bb, price_hb, price_fb, price_ai, price_nd')
        .in('package_id', packageIds)

      // Calculate minimum price per package (from any meal plan)
      const minPriceByPackage: Record<string, number> = {}
      if (hotelPrices) {
        hotelPrices.forEach(hp => {
          const prices = [hp.price_bb, hp.price_hb, hp.price_fb, hp.price_ai, hp.price_nd].filter(p => p != null && p > 0)
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0
          if (!minPriceByPackage[hp.package_id] || minPrice < minPriceByPackage[hp.package_id]) {
            minPriceByPackage[hp.package_id] = minPrice
          }
        })
      }

      const today = new Date()

      for (const pkg of packagesWithoutDepartures) {
        const duration = pkg.default_duration || 7

        // Use valid_from/valid_to for na_upit packages, or fallback to placeholder dates
        let departureDate: string
        let returnDate: string

        if (pkg.valid_from && pkg.valid_to) {
          // Use the package's valid date range
          departureDate = pkg.valid_from
          const endDate = new Date(pkg.valid_from)
          endDate.setDate(endDate.getDate() + duration)
          returnDate = endDate.toISOString().split('T')[0]
        } else {
          // Fallback: 30 days from now
          const futureDate = new Date(today)
          futureDate.setDate(futureDate.getDate() + 30)
          departureDate = futureDate.toISOString().split('T')[0]
          const endDate = new Date(futureDate)
          endDate.setDate(endDate.getDate() + duration)
          returnDate = endDate.toISOString().split('T')[0]
        }

        // Get price: first from hotel_prices, then from price_from, fallback to 0
        const effectivePrice = minPriceByPackage[pkg.id] || pkg.price_from || 0

        // Check if this package matches the user's filters
        let packageIsMatch = false
        if (hasFilters) {
          packageIsMatch = true // Assume match until a filter fails

          if (country && pkg.destination_country) {
            packageIsMatch = packageIsMatch && pkg.destination_country.toLowerCase().includes(country.toLowerCase())
          } else if (country && !pkg.destination_country) {
            packageIsMatch = false
          }

          if (city && pkg.destination_city) {
            packageIsMatch = packageIsMatch && pkg.destination_city.toLowerCase().includes(city.toLowerCase())
          } else if (city && !pkg.destination_city) {
            packageIsMatch = false
          }

          // For na_upit packages, check if the validity period overlaps with the requested month
          if (month && pkg.valid_from && pkg.valid_to) {
            const monthNumber = getMonthNumber(month)
            if (monthNumber) {
              const year = new Date().getFullYear()
              const nextYear = monthNumber < new Date().getMonth() + 1 ? year + 1 : year
              const monthStart = new Date(nextYear, monthNumber - 1, 1)
              const monthEnd = new Date(nextYear, monthNumber, 0)
              const pkgStart = new Date(pkg.valid_from)
              const pkgEnd = new Date(pkg.valid_to)
              // Check for overlap
              const hasOverlap = pkgStart <= monthEnd && pkgEnd >= monthStart
              packageIsMatch = packageIsMatch && hasOverlap
            }
          }

          if (boardType && boardType !== 'any' && pkg.board_type) {
            packageIsMatch = packageIsMatch && pkg.board_type === boardType
          }

          if (transportType && transportType !== 'none' && pkg.transport_type) {
            packageIsMatch = packageIsMatch && pkg.transport_type === transportType
          }

          if (minPrice && effectivePrice > 0) {
            packageIsMatch = packageIsMatch && effectivePrice >= parseFloat(minPrice)
          }

          if (maxPrice && effectivePrice > 0) {
            packageIsMatch = packageIsMatch && effectivePrice <= parseFloat(maxPrice)
          }
        }

        syntheticDepartures.push({
          id: `pkg-${pkg.id}`, // Synthetic ID
          organization_id: pkg.organization_id,
          package_id: pkg.id,
          package_name: pkg.name,
          destination_country: pkg.destination_country,
          destination_city: pkg.destination_city,
          hotel_name: pkg.hotel_name,
          hotel_stars: pkg.hotel_stars,
          package_type: pkg.package_type === 'vlastita' ? 'fiksni' : pkg.package_type, // Normalize vlastita -> fiksni
          board_type: pkg.board_type,
          transport_type: pkg.transport_type,
          departure_location: pkg.departure_location,
          is_featured: pkg.is_featured || false,
          package_base_price: effectivePrice,
          effective_price: effectivePrice,
          departure_date: departureDate,
          return_date: returnDate,
          valid_from: pkg.valid_from,
          valid_to: pkg.valid_to,
          duration_nights: pkg.package_type === 'na_upit' ? null : duration, // Don't set fixed duration for inquiry packages
          status: 'active',
          is_visible: true,
          available_spots: null, // On-request packages don't have fixed capacity
          total_spots: null,
          price_override: null,
          original_price: null,
          child_price: null,
          created_at: pkg.created_at,
          updated_at: pkg.updated_at,
          primary_image_url: imagesByPackage[pkg.id]?.[0]?.url || null,
          images: imagesByPackage[pkg.id] || [],
          isMatch: packageIsMatch,
        })
      }
      }
    }

    // Combine real departures with synthetic ones (packages without departures)
    // Sort so that matching departures come first
    const matchingSynthetic = syntheticDepartures.filter(d => d.isMatch)
    const nonMatchingSynthetic = syntheticDepartures.filter(d => !d.isMatch)

    // Update matching count to include synthetic matches
    matchingCount += matchingSynthetic.length

    // Combine: matching real departures first, then matching synthetic, then non-matching
    let allDepartures = [
      ...matchingDepartures,
      ...matchingSynthetic,
      ...processedMoreDepartures.filter(d => !d.isMatch), // Non-matching real departures
      ...nonMatchingSynthetic
    ]

    // STEP 4: Calculate prices for na_upit packages if guest params provided
    const naUpitPackageIds = [...new Set(
      allDepartures
        .filter(d => d.package_type === 'na_upit')
        .map(d => d.package_id)
    )]

    if (naUpitPackageIds.length > 0 && (adults > 0 || childAges.length > 0)) {
      // Find a representative date for price calculation
      // Use month param, departureFrom, or first matching departure date
      let calculationDate = departureFrom || null

      if (!calculationDate && month) {
        const monthNumber = getMonthNumber(month)
        if (monthNumber) {
          const year = new Date().getFullYear()
          const nextYear = monthNumber < new Date().getMonth() + 1 ? year + 1 : year
          calculationDate = new Date(nextYear, monthNumber - 1, 15).toISOString().split('T')[0]
        }
      }

      if (!calculationDate) {
        // Use the first na_upit departure's date
        const firstNaUpit = allDepartures.find(d => d.package_type === 'na_upit')
        calculationDate = firstNaUpit?.departure_date || new Date().toISOString().split('T')[0]
      }

      // Ensure calculationDate is definitely a string at this point
      const finalCalculationDate = calculationDate as string

      try {
        const priceInput: BatchPriceInput = {
          adults,
          childAges,
          date: finalCalculationDate,
          duration_nights: durationNights,
        }

        const priceResults = await calculatePricesForPackages(naUpitPackageIds, priceInput)

        // Attach calculated prices to departures
        allDepartures = allDepartures.map(dep => {
          if (dep.package_type === 'na_upit') {
            const priceResult = priceResults.get(dep.package_id)
            if (priceResult) {
              return {
                ...dep,
                calculated_total: priceResult.calculated_total,
                calculated_per_person: priceResult.calculated_per_person,
                price_calculation_error: priceResult.price_error,
                // Override effective_price with calculated per-person if available
                effective_price: priceResult.calculated_per_person || dep.effective_price,
              }
            }
          }
          return dep
        })
      } catch (priceError) {
        console.error('Price calculation error:', priceError)
        // Continue without calculated prices
      }
    }

    // Calculate if there are more departures
    const totalNonMatching = (totalCount || 0)
    const fetchedSoFar = page === 1 
      ? matchingDepartures.length + processedMoreDepartures.length 
      : offset + processedMoreDepartures.length
    const hasMore = fetchedSoFar < (matchingCount + totalNonMatching)

    // Split by package type
    const fiksniDepartures = allDepartures.filter(d => d.package_type === 'fiksni')
    const naUpitDepartures = allDepartures.filter(d => d.package_type === 'na_upit')

    return NextResponse.json({
      departures: allDepartures,
      fiksni: fiksniDepartures,
      na_upit: naUpitDepartures,
      total: matchingCount + totalNonMatching + (page === 1 ? syntheticDepartures.length : 0),
      matchingCount,
      page,
      limit,
      hasMore, // Only based on real departures pagination
      isFallback: page === 1 && matchingCount === 0 && allDepartures.length > 0,
      // Guest params used for price calculation
      guests: {
        adults,
        childAges,
        totalPersons: adults + childAges.length,
      },
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
