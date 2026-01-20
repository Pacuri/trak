import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/public/agencies/[slug]/offers/[offerId]/upsells
// Returns upsell options: better room types, meal upgrades, etc.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; offerId: string }> }
) {
  try {
    const { slug, offerId } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Get qualification data from query params
    const checkIn = searchParams.get('check_in')
    const checkOut = searchParams.get('check_out')
    const adults = parseInt(searchParams.get('adults') || '2')
    const children = parseInt(searchParams.get('children') || '0')
    const currentMealPlan = searchParams.get('meal_plan') || 'BB'
    const currentRoomTypeId = searchParams.get('room_type_id')

    // Get organization ID from slug
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

    // Check if this is a departure (id or pkg-packageId) or package
    let packageId: string | null = null

    if (offerId.startsWith('pkg-')) {
      // Synthetic departure - extract package ID
      packageId = offerId.replace('pkg-', '')
    } else {
      // Try to find departure and get its package_id
      const { data: departure } = await supabase
        .from('departures_with_package')
        .select('package_id')
        .eq('id', offerId)
        .eq('organization_id', organizationId)
        .single()

      if (departure?.package_id) {
        packageId = departure.package_id
      } else {
        // Maybe it's a package ID directly
        const { data: pkg } = await supabase
          .from('packages')
          .select('id')
          .eq('id', offerId)
          .eq('organization_id', organizationId)
          .single()
        if (pkg?.id) packageId = pkg.id
      }
    }

    if (!packageId) {
      return NextResponse.json({ error: 'Ponuda nije pronađena' }, { status: 404 })
    }

    // Fetch package data with room types and prices
    const [
      { data: pkg },
      { data: roomTypes },
      { data: priceIntervals },
      { data: hotelPrices },
      { data: supplements },
    ] = await Promise.all([
      supabase.from('packages').select('*').eq('id', packageId).single(),
      supabase.from('room_types').select('*').eq('package_id', packageId).order('sort_order', { ascending: true }),
      supabase.from('price_intervals').select('*').eq('package_id', packageId).order('sort_order', { ascending: true }),
      supabase.from('hotel_prices').select('*').eq('package_id', packageId),
      supabase.from('package_supplements').select('*').eq('package_id', packageId).eq('mandatory', false),
    ])

    if (!pkg) {
      return NextResponse.json({ error: 'Paket nije pronađen' }, { status: 404 })
    }

    // Find relevant price interval based on check_in date
    let relevantInterval = priceIntervals?.[0]
    if (checkIn && priceIntervals && priceIntervals.length > 0) {
      const checkInDate = new Date(checkIn)
      relevantInterval = priceIntervals.find(interval => {
        const start = new Date(interval.start_date)
        const end = new Date(interval.end_date)
        return checkInDate >= start && checkInDate <= end
      }) || priceIntervals[0]
    }

    // Build upsell options
    const upsellOptions: any[] = []

    // 1. MEAL PLAN UPGRADES
    const mealPlanOrder = ['ND', 'BB', 'HB', 'FB', 'AI']
    const mealPlanLabels: Record<string, string> = {
      'ND': 'Bez ishrane',
      'BB': 'Doručak',
      'HB': 'Polupansion',
      'FB': 'Pun pansion',
      'AI': 'All Inclusive',
    }

    const currentMealIndex = mealPlanOrder.indexOf(currentMealPlan.toUpperCase())

    if (relevantInterval && currentRoomTypeId && hotelPrices) {
      // Get current room type's prices
      const currentPrices = hotelPrices.find(
        hp => hp.room_type_id === currentRoomTypeId && hp.interval_id === relevantInterval.id
      )

      if (currentPrices) {
        const currentPriceKey = `price_${currentMealPlan.toLowerCase()}` as keyof typeof currentPrices
        const currentPrice = currentPrices[currentPriceKey] as number || 0

        // Find better meal plans
        for (let i = currentMealIndex + 1; i < mealPlanOrder.length; i++) {
          const mealCode = mealPlanOrder[i]
          const priceKey = `price_${mealCode.toLowerCase()}` as keyof typeof currentPrices
          const upgradePrice = currentPrices[priceKey] as number

          if (upgradePrice && upgradePrice > currentPrice) {
            const priceDiff = upgradePrice - currentPrice
            upsellOptions.push({
              type: 'meal_upgrade',
              code: mealCode,
              name: mealPlanLabels[mealCode],
              description: getMealPlanDescription(mealCode),
              pricePerPersonPerNight: upgradePrice,
              priceDiffPerPersonPerNight: priceDiff,
              icon: getMealPlanIcon(mealCode),
            })
          }
        }
      }
    }

    // 2. ROOM TYPE UPGRADES
    if (roomTypes && roomTypes.length > 1 && relevantInterval && hotelPrices) {
      // Sort room types by max_persons (bigger = more expensive typically)
      const sortedRoomTypes = [...roomTypes].sort((a, b) => a.max_persons - b.max_persons)

      // Find current room type index
      const currentRoomIndex = sortedRoomTypes.findIndex(rt => rt.id === currentRoomTypeId)

      // Suggest larger room types
      for (let i = currentRoomIndex + 1; i < sortedRoomTypes.length && i < currentRoomIndex + 3; i++) {
        const upgradedRoom = sortedRoomTypes[i]

        // Get prices for both current and upgraded room
        const currentRoomPrices = hotelPrices.find(
          hp => hp.room_type_id === currentRoomTypeId && hp.interval_id === relevantInterval.id
        )
        const upgradedRoomPrices = hotelPrices.find(
          hp => hp.room_type_id === upgradedRoom.id && hp.interval_id === relevantInterval.id
        )

        if (currentRoomPrices && upgradedRoomPrices) {
          const priceKey = `price_${currentMealPlan.toLowerCase()}` as keyof typeof currentRoomPrices
          const currentPrice = currentRoomPrices[priceKey] as number || 0
          const upgradePrice = upgradedRoomPrices[priceKey] as number || 0

          if (upgradePrice > currentPrice) {
            upsellOptions.push({
              type: 'room_upgrade',
              roomTypeId: upgradedRoom.id,
              code: upgradedRoom.code,
              name: upgradedRoom.name,
              description: upgradedRoom.description || `Soba za ${upgradedRoom.max_persons} osobe`,
              maxPersons: upgradedRoom.max_persons,
              pricePerPersonPerNight: upgradePrice,
              priceDiffPerPersonPerNight: upgradePrice - currentPrice,
              icon: '🛏️',
            })
          }
        }
      }
    }

    // 3. OPTIONAL SUPPLEMENTS
    if (supplements && supplements.length > 0) {
      for (const supplement of supplements) {
        upsellOptions.push({
          type: 'supplement',
          id: supplement.id,
          code: supplement.code,
          name: supplement.name,
          description: getSupplementDescription(supplement),
          amount: supplement.amount,
          percent: supplement.percent,
          per: supplement.per,
          currency: supplement.currency || 'EUR',
          icon: getSupplementIcon(supplement.code),
        })
      }
    }

    // 4. ALTERNATIVE DEPARTURES (better dates)
    // Find other departures in the same package with potentially better prices or availability
    if (!offerId.startsWith('pkg-')) {
      const { data: alternativeDepartures } = await supabase
        .from('departures_with_package')
        .select('id, departure_date, return_date, effective_price, available_spots, is_featured')
        .eq('package_id', packageId)
        .eq('status', 'active')
        .eq('is_visible', true)
        .neq('id', offerId)
        .gt('available_spots', 0)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('effective_price', { ascending: true })
        .limit(3)

      if (alternativeDepartures && alternativeDepartures.length > 0) {
        // Get current departure price for comparison
        const { data: currentDeparture } = await supabase
          .from('departures_with_package')
          .select('effective_price')
          .eq('id', offerId)
          .single()

        const currentEffectivePrice = currentDeparture?.effective_price || 0

        for (const alt of alternativeDepartures) {
          if (alt.effective_price < currentEffectivePrice) {
            upsellOptions.push({
              type: 'alternative_date',
              departureId: alt.id,
              departureDate: alt.departure_date,
              returnDate: alt.return_date,
              effectivePrice: alt.effective_price,
              priceDiff: alt.effective_price - currentEffectivePrice, // Negative = savings
              availableSpots: alt.available_spots,
              isFeatured: alt.is_featured,
              icon: '📅',
            })
          }
        }
      }
    }

    return NextResponse.json({
      packageId,
      packageName: pkg.name,
      currentMealPlan,
      currentRoomTypeId,
      upsells: upsellOptions,
      availableMealPlans: pkg.meal_plans || ['BB', 'HB'],
      roomTypes: roomTypes || [],
    })
  } catch (e) {
    console.error('Upsells API error:', e)
    return NextResponse.json({ error: 'Greška pri učitavanju opcija' }, { status: 500 })
  }
}

// Helper functions
function getMealPlanDescription(code: string): string {
  const descriptions: Record<string, string> = {
    'ND': 'Samo smeštaj bez obroka',
    'BB': 'Doručak svakog dana',
    'HB': 'Doručak i večera svakog dana',
    'FB': 'Sva tri obroka svakog dana',
    'AI': 'Sva tri obroka + piće + užine tokom dana',
  }
  return descriptions[code] || ''
}

function getMealPlanIcon(code: string): string {
  const icons: Record<string, string> = {
    'ND': '🏠',
    'BB': '☕',
    'HB': '🍽️',
    'FB': '🍴',
    'AI': '🌟',
  }
  return icons[code] || '🍽️'
}

function getSupplementIcon(code: string): string {
  const codeUpper = code.toUpperCase()
  if (codeUpper.includes('TRANSFER')) return '🚐'
  if (codeUpper.includes('PARKING')) return '🅿️'
  if (codeUpper.includes('WIFI') || codeUpper.includes('INTERNET')) return '📶'
  if (codeUpper.includes('SPA') || codeUpper.includes('WELLNESS')) return '💆'
  if (codeUpper.includes('PET') || codeUpper.includes('LJUBIMAC')) return '🐕'
  if (codeUpper.includes('BALKON') || codeUpper.includes('BALCONY')) return '🌅'
  if (codeUpper.includes('VIEW') || codeUpper.includes('POGLED')) return '🏔️'
  return '✨'
}

function getSupplementDescription(supplement: any): string {
  if (supplement.amount) {
    const perLabel: Record<string, string> = {
      'night': 'po noćenju',
      'stay': 'po boravku',
      'person_night': 'po osobi/noćenju',
      'person_stay': 'po osobi/boravku',
    }
    return `€${supplement.amount} ${perLabel[supplement.per] || ''}`
  }
  if (supplement.percent) {
    return `${supplement.percent}% od cene`
  }
  return ''
}
