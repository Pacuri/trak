import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FiksniPriceInputSchema, NaUpitPriceInputSchema } from '@/lib/packages/validators'
import type { PriceCalculationResult, PriceBreakdownItem, MealPlanCode } from '@/types/packages'

// POST /api/packages/[id]/calculate-price - Calculate price for a package
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    // Get package details (public access allowed for published packages)
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type, transport_price_fixed, transport_price_per_person, is_published')
      .eq('id', packageId)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const body = await request.json()

    if (pkg.package_type === 'fiksni') {
      return calculateFiksniPrice(supabase, pkg, body)
    } else {
      return calculateNaUpitPrice(supabase, pkg, body, packageId)
    }
  } catch (error) {
    console.error('Calculate price error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calculateFiksniPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pkg: { id: string; transport_price_fixed?: boolean | null; transport_price_per_person?: number | null },
  body: unknown
): Promise<NextResponse> {
  const validation = FiksniPriceInputSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.flatten() 
    }, { status: 400 })
  }

  const { apartment_id, check_in, check_out, shift_id, include_transport, number_of_persons } = validation.data

  const checkInDate = new Date(check_in)
  const checkOutDate = new Date(check_out)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

  if (nights <= 0) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  // Get apartment
  const { data: apartment } = await supabase
    .from('apartments')
    .select('id, name')
    .eq('id', apartment_id)
    .single()

  if (!apartment) {
    return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
  }

  // Get price intervals that overlap with stay
  const { data: intervals } = await supabase
    .from('price_intervals')
    .select('*')
    .eq('package_id', pkg.id)
    .lte('start_date', check_out)
    .gte('end_date', check_in)
    .order('start_date', { ascending: true })

  if (!intervals || intervals.length === 0) {
    return NextResponse.json({ error: 'No price intervals found for selected dates' }, { status: 400 })
  }

  // Get apartment prices for these intervals
  const { data: prices } = await supabase
    .from('apartment_prices')
    .select('*')
    .eq('apartment_id', apartment_id)
    .in('interval_id', intervals.map(i => i.id))

  if (!prices || prices.length === 0) {
    return NextResponse.json({ error: 'No prices found for apartment in selected dates' }, { status: 400 })
  }

  const priceMap = new Map(prices.map(p => [p.interval_id, p.price_per_night]))

  // Calculate accommodation total
  let accommodationTotal = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const interval of intervals) {
    const intervalStart = new Date(Math.max(checkInDate.getTime(), new Date(interval.start_date).getTime()))
    const intervalEnd = new Date(Math.min(checkOutDate.getTime(), new Date(interval.end_date).getTime() + 24 * 60 * 60 * 1000))
    const nightsInInterval = Math.ceil((intervalEnd.getTime() - intervalStart.getTime()) / (1000 * 60 * 60 * 24))

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
  if (include_transport) {
    if (shift_id) {
      // Get shift transport price
      const { data: shift } = await supabase
        .from('shifts')
        .select('transport_price_per_person')
        .eq('id', shift_id)
        .single()

      if (shift?.transport_price_per_person) {
        transportTotal = shift.transport_price_per_person * number_of_persons
        breakdown.push({
          nights: 0,
          price_per_unit: shift.transport_price_per_person,
          subtotal: transportTotal,
          description: `Prevoz - ${number_of_persons} osoba × €${shift.transport_price_per_person}`,
        })
      }
    } else if (pkg.transport_price_fixed && pkg.transport_price_per_person) {
      transportTotal = pkg.transport_price_per_person * number_of_persons
      breakdown.push({
        nights: 0,
        price_per_unit: pkg.transport_price_per_person,
        subtotal: transportTotal,
        description: `Prevoz - ${number_of_persons} osoba × €${pkg.transport_price_per_person}`,
      })
    }
  }

  const result: PriceCalculationResult = {
    accommodation_total: accommodationTotal,
    transport_total: transportTotal,
    total: accommodationTotal + transportTotal,
    nights,
    price_per_night: accommodationTotal / nights,
    breakdown,
  }

  return NextResponse.json(result)
}

async function calculateNaUpitPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pkg: { id: string },
  body: unknown,
  packageId: string
): Promise<NextResponse> {
  const validation = NaUpitPriceInputSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Validation failed', 
      details: validation.error.flatten() 
    }, { status: 400 })
  }

  const { check_in, check_out, room_type_id, meal_plan, adults, children } = validation.data

  const checkInDate = new Date(check_in)
  const checkOutDate = new Date(check_out)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

  if (nights <= 0) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  // Get room type
  const { data: roomType } = await supabase
    .from('room_types')
    .select('id, name, code')
    .eq('id', room_type_id)
    .single()

  if (!roomType) {
    return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
  }

  // Get price intervals that overlap with stay
  const { data: intervals } = await supabase
    .from('price_intervals')
    .select('*')
    .eq('package_id', packageId)
    .lte('start_date', check_out)
    .gte('end_date', check_in)
    .order('start_date', { ascending: true })

  if (!intervals || intervals.length === 0) {
    return NextResponse.json({ error: 'No price intervals found for selected dates' }, { status: 400 })
  }

  // Get hotel prices for these intervals and room type
  const { data: prices } = await supabase
    .from('hotel_prices')
    .select('*')
    .eq('room_type_id', room_type_id)
    .in('interval_id', intervals.map(i => i.id))

  if (!prices || prices.length === 0) {
    return NextResponse.json({ error: 'No prices found for room type in selected dates' }, { status: 400 })
  }

  // Get children policies
  const { data: childrenPolicies } = await supabase
    .from('children_policies')
    .select('*')
    .eq('package_id', packageId)
    .order('age_from', { ascending: true })

  const priceMap = new Map(prices.map(p => [p.interval_id, p]))

  // Get the correct price column based on meal plan
  const mealPlanPriceKey = `price_${meal_plan.toLowerCase()}` as keyof typeof prices[0]

  // Calculate accommodation total
  let accommodationTotal = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const interval of intervals) {
    const intervalStart = new Date(Math.max(checkInDate.getTime(), new Date(interval.start_date).getTime()))
    const intervalEnd = new Date(Math.min(checkOutDate.getTime(), new Date(interval.end_date).getTime() + 24 * 60 * 60 * 1000))
    const nightsInInterval = Math.ceil((intervalEnd.getTime() - intervalStart.getTime()) / (1000 * 60 * 60 * 24))

    if (nightsInInterval > 0) {
      const intervalPrice = priceMap.get(interval.id)
      const pricePerPerson = (intervalPrice?.[mealPlanPriceKey] as number) || 0

      if (pricePerPerson === 0) {
        return NextResponse.json({ 
          error: `Meal plan ${meal_plan} not available for interval ${interval.name || interval.id}` 
        }, { status: 400 })
      }

      // Adults pay full price
      const adultsSubtotal = adults * pricePerPerson * nightsInInterval
      accommodationTotal += adultsSubtotal

      breakdown.push({
        interval_name: interval.name || undefined,
        nights: nightsInInterval,
        price_per_unit: pricePerPerson,
        subtotal: adultsSubtotal,
        description: `${roomType.name} (${meal_plan}) - ${adults} odraslih × ${nightsInInterval} noći × €${pricePerPerson}`,
      })

      // Children with discounts
      for (const child of children) {
        const policy = childrenPolicies?.find(
          p => child.age >= p.age_from && child.age < p.age_to
        )

        let childPrice = pricePerPerson
        let discountDescription = ''

        if (policy) {
          if (policy.discount_type === 'FREE') {
            childPrice = 0
            discountDescription = 'besplatno'
          } else if (policy.discount_type === 'PERCENT' && policy.discount_value) {
            childPrice = pricePerPerson * (1 - policy.discount_value / 100)
            discountDescription = `-${policy.discount_value}%`
          } else if (policy.discount_type === 'FIXED' && policy.discount_value) {
            childPrice = policy.discount_value
            discountDescription = `fiksno €${policy.discount_value}`
          }
        }

        const childSubtotal = childPrice * nightsInInterval
        accommodationTotal += childSubtotal

        if (childSubtotal > 0 || policy?.discount_type === 'FREE') {
          breakdown.push({
            interval_name: interval.name || undefined,
            nights: nightsInInterval,
            price_per_unit: childPrice,
            subtotal: childSubtotal,
            description: `Dete (${child.age} god.) ${discountDescription} - ${nightsInInterval} noći × €${childPrice.toFixed(2)}`,
          })
        }
      }
    }
  }

  const result: PriceCalculationResult = {
    accommodation_total: accommodationTotal,
    transport_total: 0,
    total: accommodationTotal,
    nights,
    price_per_night: accommodationTotal / nights,
    breakdown,
  }

  return NextResponse.json(result)
}
