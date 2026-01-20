/**
 * Unified Price Calculation Engine for Hotel Packages (na_upit)
 *
 * Calculates total price for a group including:
 * - Adult pricing based on room type, meal plan, and date interval
 * - Children discounts based on age and policy rules
 * - Proper handling of conditions (min_adults, child_position, bed_type, etc.)
 */

import { createClient } from '@/lib/supabase/server'
import type { MealPlanCode, DiscountType } from '@/types/packages'

// ============================================
// TYPES
// ============================================

export interface GroupPriceInput {
  package_id: string
  adults: number
  childAges: number[]          // Array of child ages (e.g., [3, 7, 12])
  date: string                 // Check-in date (YYYY-MM-DD)
  duration_nights?: number     // Optional, defaults to 7
  room_type_id?: string        // Optional, will pick cheapest if not specified
  meal_plan?: MealPlanCode     // Optional, will pick available if not specified
}

export interface ChildPriceDetail {
  age: number
  originalPrice: number
  discountedPrice: number
  discountType: DiscountType
  discountValue: number | null
  ruleName: string
  isFree: boolean
}

export interface GroupPriceResult {
  success: boolean
  total: number
  perPersonAvg: number
  breakdown: {
    adultsCount: number
    adultsTotal: number
    adultPricePerPerson: number
    childrenCount: number
    childrenTotal: number
    childrenDetails: ChildPriceDetail[]
  }
  interval?: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  roomType?: {
    id: string
    code: string
    name: string
  }
  mealPlan?: MealPlanCode
  durationNights: number
  priceType: string
  error?: string
}

interface ChildrenPolicyRule {
  id: string
  rule_name: string | null
  priority: number
  min_adults: number | null
  max_adults: number | null
  child_position: number | null
  room_type_codes: string[] | null
  bed_type: string | null
  age_from: number
  age_to: number
  discount_type: DiscountType
  discount_value: number | null
}

interface HotelPrice {
  id: string
  interval_id: string
  room_type_id: string
  price_nd?: number
  price_bb?: number
  price_hb?: number
  price_fb?: number
  price_ai?: number
}

interface PriceInterval {
  id: string
  name: string | null
  start_date: string
  end_date: string
}

interface RoomType {
  id: string
  code: string
  name: string
  max_persons: number
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function calculateGroupPrice(
  input: GroupPriceInput
): Promise<GroupPriceResult> {
  const supabase = await createClient()

  const {
    package_id,
    adults,
    childAges,
    date,
    duration_nights = 7,
    room_type_id,
    meal_plan,
  } = input

  const totalPersons = adults + childAges.length

  try {
    // 1. Fetch package with related data
    const { data: pkg, error: pkgError } = await supabase
      .from('packages')
      .select(`
        id,
        price_type,
        base_occupancy,
        meal_plans,
        room_types (id, code, name, max_persons),
        price_intervals (id, name, start_date, end_date),
        hotel_prices (id, interval_id, room_type_id, price_nd, price_bb, price_hb, price_fb, price_ai)
      `)
      .eq('id', package_id)
      .single()

    if (pkgError || !pkg) {
      return createErrorResult(`Package not found: ${pkgError?.message}`)
    }

    // 2. Fetch children policy rules (separate query for better typing)
    const { data: policyRules } = await supabase
      .from('children_policy_rules')
      .select('*')
      .eq('package_id', package_id)
      .order('priority', { ascending: false }) // Higher priority first

    const childrenPolicies: ChildrenPolicyRule[] = policyRules || []

    // 3. Find matching interval for the date
    const intervals = (pkg.price_intervals || []) as PriceInterval[]
    const matchingInterval = findMatchingInterval(intervals, date)

    if (!matchingInterval) {
      return createErrorResult(`No price interval found for date ${date}`)
    }

    // 4. Find room type (use specified or find suitable one)
    const roomTypes = (pkg.room_types || []) as RoomType[]
    let selectedRoomType: RoomType | undefined

    if (room_type_id) {
      selectedRoomType = roomTypes.find(rt => rt.id === room_type_id)
    } else {
      // Find cheapest room that can fit the group
      selectedRoomType = findBestRoomType(roomTypes, totalPersons)
    }

    if (!selectedRoomType) {
      return createErrorResult(`No suitable room type found for ${totalPersons} persons`)
    }

    // 5. Find price for this interval + room type + meal plan
    const hotelPrices = (pkg.hotel_prices || []) as HotelPrice[]
    const priceRow = hotelPrices.find(
      hp => hp.interval_id === matchingInterval.id && hp.room_type_id === selectedRoomType!.id
    )

    if (!priceRow) {
      return createErrorResult(`No price found for room ${selectedRoomType.code} in interval ${matchingInterval.name}`)
    }

    // 6. Determine meal plan and base price per person
    const availableMealPlans = pkg.meal_plans || ['AI']
    const selectedMealPlan = meal_plan && availableMealPlans.includes(meal_plan)
      ? meal_plan
      : availableMealPlans[0] as MealPlanCode

    const basePricePerPerson = getMealPlanPrice(priceRow, selectedMealPlan)

    if (basePricePerPerson === null || basePricePerPerson === undefined) {
      return createErrorResult(`No price available for meal plan ${selectedMealPlan}`)
    }

    // 7. Calculate adult total
    const priceType = pkg.price_type || 'per_person_per_stay'
    const adultPricePerPerson = priceType === 'per_person_per_night'
      ? basePricePerPerson * duration_nights
      : basePricePerPerson

    const adultsTotal = adults * adultPricePerPerson

    // 8. Calculate children prices with discounts
    const childrenDetails: ChildPriceDetail[] = []
    let childrenTotal = 0

    // Sort children by age for proper position assignment
    const sortedChildAges = [...childAges].sort((a, b) => a - b)

    sortedChildAges.forEach((age, index) => {
      const childPosition = index + 1 // 1-indexed position

      // Find matching policy rule
      const matchingRule = findMatchingChildPolicy(
        childrenPolicies,
        age,
        adults,
        childPosition,
        selectedRoomType!.code
      )

      let discountedPrice: number
      let isFree = false
      let discountType: DiscountType = 'PERCENT'
      let discountValue: number | null = 0
      let ruleName = 'Standardna cena'

      if (matchingRule) {
        ruleName = matchingRule.rule_name || `Dete ${childPosition}`
        discountType = matchingRule.discount_type
        discountValue = matchingRule.discount_value

        switch (matchingRule.discount_type) {
          case 'FREE':
            discountedPrice = 0
            isFree = true
            break
          case 'PERCENT':
            const discountPercent = matchingRule.discount_value || 0
            discountedPrice = adultPricePerPerson * (1 - discountPercent / 100)
            break
          case 'FIXED':
            discountedPrice = matchingRule.discount_value || adultPricePerPerson
            break
          default:
            discountedPrice = adultPricePerPerson
        }
      } else {
        // No matching rule - charge full adult price
        discountedPrice = adultPricePerPerson
      }

      childrenDetails.push({
        age,
        originalPrice: adultPricePerPerson,
        discountedPrice,
        discountType,
        discountValue,
        ruleName,
        isFree,
      })

      childrenTotal += discountedPrice
    })

    // 9. Calculate totals
    const total = adultsTotal + childrenTotal
    const perPersonAvg = total / totalPersons

    return {
      success: true,
      total,
      perPersonAvg,
      breakdown: {
        adultsCount: adults,
        adultsTotal,
        adultPricePerPerson,
        childrenCount: childAges.length,
        childrenTotal,
        childrenDetails,
      },
      interval: {
        id: matchingInterval.id,
        name: matchingInterval.name || 'Sezona',
        startDate: matchingInterval.start_date,
        endDate: matchingInterval.end_date,
      },
      roomType: {
        id: selectedRoomType.id,
        code: selectedRoomType.code,
        name: selectedRoomType.name,
      },
      mealPlan: selectedMealPlan,
      durationNights: duration_nights,
      priceType,
    }

  } catch (error) {
    console.error('Price calculation error:', error)
    return createErrorResult(`Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createErrorResult(error: string): GroupPriceResult {
  return {
    success: false,
    total: 0,
    perPersonAvg: 0,
    breakdown: {
      adultsCount: 0,
      adultsTotal: 0,
      adultPricePerPerson: 0,
      childrenCount: 0,
      childrenTotal: 0,
      childrenDetails: [],
    },
    durationNights: 0,
    priceType: 'unknown',
    error,
  }
}

function findMatchingInterval(intervals: PriceInterval[], date: string): PriceInterval | undefined {
  const checkDate = new Date(date)

  return intervals.find(interval => {
    const start = new Date(interval.start_date)
    const end = new Date(interval.end_date)
    return checkDate >= start && checkDate <= end
  })
}

function findBestRoomType(roomTypes: RoomType[], totalPersons: number): RoomType | undefined {
  // Find room types that can fit the group, sorted by capacity (smallest first)
  const suitable = roomTypes
    .filter(rt => rt.max_persons >= totalPersons)
    .sort((a, b) => a.max_persons - b.max_persons)

  // Return smallest that fits, or largest available if none fit
  return suitable[0] || roomTypes.sort((a, b) => b.max_persons - a.max_persons)[0]
}

function getMealPlanPrice(priceRow: HotelPrice, mealPlan: MealPlanCode): number | null {
  switch (mealPlan) {
    case 'ND': return priceRow.price_nd ?? null
    case 'BB': return priceRow.price_bb ?? null
    case 'HB': return priceRow.price_hb ?? null
    case 'FB': return priceRow.price_fb ?? null
    case 'AI': return priceRow.price_ai ?? null
    default: return null
  }
}

function findMatchingChildPolicy(
  policies: ChildrenPolicyRule[],
  age: number,
  adultCount: number,
  childPosition: number,
  roomTypeCode: string
): ChildrenPolicyRule | undefined {
  // Policies are already sorted by priority (descending)
  // Find first matching rule based on conditions

  return policies.find(policy => {
    // Check age range
    if (age < policy.age_from || age > policy.age_to) {
      return false
    }

    // Check min_adults condition
    if (policy.min_adults !== null && adultCount < policy.min_adults) {
      return false
    }

    // Check max_adults condition
    if (policy.max_adults !== null && adultCount > policy.max_adults) {
      return false
    }

    // Check child_position condition
    if (policy.child_position !== null && childPosition !== policy.child_position) {
      return false
    }

    // Check room_type_codes condition
    if (policy.room_type_codes && policy.room_type_codes.length > 0) {
      if (!policy.room_type_codes.includes(roomTypeCode)) {
        return false
      }
    }

    // All conditions match!
    return true
  })
}

// ============================================
// BATCH CALCULATION (for results page)
// ============================================

export interface BatchPriceInput {
  adults: number
  childAges: number[]
  date: string
  duration_nights?: number
}

export interface PackageWithPrice {
  package_id: string
  calculated_total: number | null
  calculated_per_person: number | null
  price_error?: string
}

/**
 * Calculate prices for multiple packages at once
 * Used by the results page to show calculated totals
 */
export async function calculatePricesForPackages(
  packageIds: string[],
  input: BatchPriceInput
): Promise<Map<string, PackageWithPrice>> {
  const results = new Map<string, PackageWithPrice>()

  // Process in parallel with concurrency limit
  const batchSize = 5
  for (let i = 0; i < packageIds.length; i += batchSize) {
    const batch = packageIds.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (package_id) => {
        const result = await calculateGroupPrice({
          package_id,
          adults: input.adults,
          childAges: input.childAges,
          date: input.date,
          duration_nights: input.duration_nights,
        })

        return {
          package_id,
          calculated_total: result.success ? result.total : null,
          calculated_per_person: result.success ? result.perPersonAvg : null,
          price_error: result.error,
        }
      })
    )

    batchResults.forEach(r => results.set(r.package_id, r))
  }

  return results
}
