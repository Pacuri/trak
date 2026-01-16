import type {
  Package,
  Apartment,
  RoomType,
  PriceInterval,
  ApartmentPrice,
  HotelPrice,
  ChildrenPolicy,
  Shift,
  PriceCalculationResult,
  PriceBreakdownItem,
  MealPlanCode,
} from '@/types/packages'

/**
 * Calculate the number of nights between two dates
 */
export function calculateNights(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get the number of nights a stay overlaps with a specific interval
 */
export function getNightsInInterval(
  checkIn: Date,
  checkOut: Date,
  intervalStart: Date,
  intervalEnd: Date
): number {
  // Extend interval end to include the full last day
  const extendedIntervalEnd = new Date(intervalEnd)
  extendedIntervalEnd.setDate(extendedIntervalEnd.getDate() + 1)
  
  const overlapStart = new Date(Math.max(checkIn.getTime(), intervalStart.getTime()))
  const overlapEnd = new Date(Math.min(checkOut.getTime(), extendedIntervalEnd.getTime()))
  
  if (overlapStart >= overlapEnd) return 0
  
  return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Find overlapping price intervals for a date range
 */
export function findOverlappingIntervals(
  checkIn: string | Date,
  checkOut: string | Date,
  intervals: PriceInterval[]
): PriceInterval[] {
  const startDate = new Date(checkIn)
  const endDate = new Date(checkOut)
  
  return intervals.filter(interval => {
    const intervalStart = new Date(interval.start_date)
    const intervalEnd = new Date(interval.end_date)
    return startDate <= intervalEnd && endDate >= intervalStart
  })
}

/**
 * Calculate price for FIKSNI package (apartment-based pricing)
 */
export function calculateFiksniPrice(params: {
  apartment: Apartment
  checkIn: string
  checkOut: string
  intervals: PriceInterval[]
  apartmentPrices: ApartmentPrice[]
  shift?: Shift
  includeTransport: boolean
  numberOfPersons: number
  packageTransportPrice?: number
}): PriceCalculationResult {
  const {
    apartment,
    checkIn,
    checkOut,
    intervals,
    apartmentPrices,
    shift,
    includeTransport,
    numberOfPersons,
    packageTransportPrice,
  } = params

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const totalNights = calculateNights(checkIn, checkOut)

  if (totalNights <= 0) {
    throw new Error('Invalid date range')
  }

  // Build price map: interval_id -> price_per_night
  const priceMap = new Map<string, number>()
  for (const price of apartmentPrices) {
    if (price.apartment_id === apartment.id) {
      priceMap.set(price.interval_id, price.price_per_night)
    }
  }

  // Find overlapping intervals
  const overlappingIntervals = findOverlappingIntervals(checkIn, checkOut, intervals)
  
  if (overlappingIntervals.length === 0) {
    throw new Error('No price intervals found for selected dates')
  }

  // Calculate accommodation total
  let accommodationTotal = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const interval of overlappingIntervals) {
    const intervalStart = new Date(interval.start_date)
    const intervalEnd = new Date(interval.end_date)
    const nightsInInterval = getNightsInInterval(checkInDate, checkOutDate, intervalStart, intervalEnd)

    if (nightsInInterval > 0) {
      const pricePerNight = priceMap.get(interval.id) || 0
      const subtotal = nightsInInterval * pricePerNight

      accommodationTotal += subtotal
      breakdown.push({
        interval_name: interval.name || undefined,
        nights: nightsInInterval,
        price_per_unit: pricePerNight,
        subtotal,
        description: `${apartment.name} - ${nightsInInterval} noći × €${pricePerNight}`,
      })
    }
  }

  // Calculate transport
  let transportTotal = 0
  if (includeTransport) {
    if (shift?.transport_price_per_person) {
      transportTotal = shift.transport_price_per_person * numberOfPersons
      breakdown.push({
        nights: 0,
        price_per_unit: shift.transport_price_per_person,
        subtotal: transportTotal,
        description: `Prevoz - ${numberOfPersons} osoba × €${shift.transport_price_per_person}`,
      })
    } else if (packageTransportPrice) {
      transportTotal = packageTransportPrice * numberOfPersons
      breakdown.push({
        nights: 0,
        price_per_unit: packageTransportPrice,
        subtotal: transportTotal,
        description: `Prevoz - ${numberOfPersons} osoba × €${packageTransportPrice}`,
      })
    }
  }

  return {
    accommodation_total: accommodationTotal,
    transport_total: transportTotal,
    total: accommodationTotal + transportTotal,
    nights: totalNights,
    price_per_night: totalNights > 0 ? accommodationTotal / totalNights : 0,
    breakdown,
  }
}

/**
 * Find the applicable children policy for a given age
 */
export function findChildrenPolicy(
  age: number,
  policies: ChildrenPolicy[]
): ChildrenPolicy | null {
  return policies.find(p => age >= p.age_from && age < p.age_to) || null
}

/**
 * Calculate discounted price for a child based on policy
 */
export function calculateChildPrice(
  basePrice: number,
  age: number,
  policies: ChildrenPolicy[]
): { price: number; discount: string } {
  const policy = findChildrenPolicy(age, policies)
  
  if (!policy) {
    return { price: basePrice, discount: 'puna cena' }
  }

  switch (policy.discount_type) {
    case 'FREE':
      return { price: 0, discount: 'besplatno' }
    case 'PERCENT':
      const discountedPrice = basePrice * (1 - (policy.discount_value || 0) / 100)
      return { price: discountedPrice, discount: `-${policy.discount_value}%` }
    case 'FIXED':
      return { price: policy.discount_value || 0, discount: `fiksno €${policy.discount_value}` }
    default:
      return { price: basePrice, discount: 'puna cena' }
  }
}

/**
 * Calculate price for NA_UPIT package (hotel-based pricing)
 */
export function calculateNaUpitPrice(params: {
  roomType: RoomType
  checkIn: string
  checkOut: string
  mealPlan: MealPlanCode
  intervals: PriceInterval[]
  hotelPrices: HotelPrice[]
  childrenPolicies: ChildrenPolicy[]
  adults: number
  children: { age: number }[]
}): PriceCalculationResult {
  const {
    roomType,
    checkIn,
    checkOut,
    mealPlan,
    intervals,
    hotelPrices,
    childrenPolicies,
    adults,
    children,
  } = params

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  const totalNights = calculateNights(checkIn, checkOut)

  if (totalNights <= 0) {
    throw new Error('Invalid date range')
  }

  // Build price map: interval_id -> HotelPrice
  const priceMap = new Map<string, HotelPrice>()
  for (const price of hotelPrices) {
    if (price.room_type_id === roomType.id) {
      priceMap.set(price.interval_id, price)
    }
  }

  // Find overlapping intervals
  const overlappingIntervals = findOverlappingIntervals(checkIn, checkOut, intervals)
  
  if (overlappingIntervals.length === 0) {
    throw new Error('No price intervals found for selected dates')
  }

  // Get the correct price key based on meal plan
  const mealPlanPriceKey = `price_${mealPlan.toLowerCase()}` as keyof HotelPrice

  // Calculate accommodation total
  let accommodationTotal = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const interval of overlappingIntervals) {
    const intervalStart = new Date(interval.start_date)
    const intervalEnd = new Date(interval.end_date)
    const nightsInInterval = getNightsInInterval(checkInDate, checkOutDate, intervalStart, intervalEnd)

    if (nightsInInterval > 0) {
      const intervalPrice = priceMap.get(interval.id)
      const pricePerPerson = (intervalPrice?.[mealPlanPriceKey] as number) || 0

      if (pricePerPerson === 0) {
        throw new Error(`Meal plan ${mealPlan} not available for interval ${interval.name || interval.id}`)
      }

      // Adults pay full price
      const adultsSubtotal = adults * pricePerPerson * nightsInInterval
      accommodationTotal += adultsSubtotal

      breakdown.push({
        interval_name: interval.name || undefined,
        nights: nightsInInterval,
        price_per_unit: pricePerPerson,
        subtotal: adultsSubtotal,
        description: `${roomType.name} (${mealPlan}) - ${adults} odraslih × ${nightsInInterval} noći × €${pricePerPerson}`,
      })

      // Children with discounts
      for (const child of children) {
        const { price: childPrice, discount } = calculateChildPrice(
          pricePerPerson,
          child.age,
          childrenPolicies
        )

        const childSubtotal = childPrice * nightsInInterval
        accommodationTotal += childSubtotal

        if (childSubtotal > 0 || discount === 'besplatno') {
          breakdown.push({
            interval_name: interval.name || undefined,
            nights: nightsInInterval,
            price_per_unit: childPrice,
            subtotal: childSubtotal,
            description: `Dete (${child.age} god.) ${discount} - ${nightsInInterval} noći × €${childPrice.toFixed(2)}`,
          })
        }
      }
    }
  }

  return {
    accommodation_total: accommodationTotal,
    transport_total: 0, // NA_UPIT typically doesn't include transport
    total: accommodationTotal,
    nights: totalNights,
    price_per_night: totalNights > 0 ? accommodationTotal / totalNights : 0,
    breakdown,
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

/**
 * Format date for display in Serbian format
 */
export function formatDateSr(date: string | Date): string {
  return new Date(date).toLocaleDateString('sr-Latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
