import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PriceIntervalFormSchema } from '@/lib/packages/validators'

// GET /api/packages/[id]/price-intervals - List price intervals for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Get price intervals
    const { data: intervals, error } = await supabase
      .from('price_intervals')
      .select('*')
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching price intervals:', error)
      return NextResponse.json({ error: 'Failed to fetch price intervals' }, { status: 500 })
    }

    // Get associated prices based on package type
    let pricesData: Record<string, unknown[]> = {}
    
    if (pkg.package_type === 'fiksni') {
      const { data: apartmentPrices } = await supabase
        .from('apartment_prices')
        .select('*')
        .in('interval_id', intervals?.map(i => i.id) || [])

      pricesData = { apartment_prices: apartmentPrices || [] }
    } else {
      const { data: hotelPrices } = await supabase
        .from('hotel_prices')
        .select('*')
        .in('interval_id', intervals?.map(i => i.id) || [])

      pricesData = { hotel_prices: hotelPrices || [] }
    }

    return NextResponse.json({ 
      price_intervals: intervals || [],
      ...pricesData
    })
  } catch (error) {
    console.error('Price intervals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/packages/[id]/price-intervals - Create or bulk update price intervals with prices
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const body = await request.json()
    const { price_intervals } = body

    if (!Array.isArray(price_intervals)) {
      return NextResponse.json({ error: 'price_intervals must be an array' }, { status: 400 })
    }

    // Validate all intervals
    const validatedIntervals = []
    for (const interval of price_intervals) {
      const result = PriceIntervalFormSchema.safeParse(interval)
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }, { status: 400 })
      }
      validatedIntervals.push(result.data)
    }

    // Check for overlapping intervals
    for (let i = 0; i < validatedIntervals.length; i++) {
      for (let j = i + 1; j < validatedIntervals.length; j++) {
        const a = validatedIntervals[i]
        const b = validatedIntervals[j]
        const aStart = new Date(a.start_date)
        const aEnd = new Date(a.end_date)
        const bStart = new Date(b.start_date)
        const bEnd = new Date(b.end_date)
        
        if (aStart <= bEnd && bStart <= aEnd) {
          return NextResponse.json({ 
            error: `Intervali "${a.name || i + 1}" i "${b.name || j + 1}" se preklapaju` 
          }, { status: 400 })
        }
      }
    }

    // Get existing intervals
    const { data: existingIntervals } = await supabase
      .from('price_intervals')
      .select('id')
      .eq('package_id', packageId)

    const existingIds = new Set(existingIntervals?.map(i => i.id) || [])
    const newIntervalIds = new Set(validatedIntervals.filter(i => i.id).map(i => i.id))

    // Delete intervals that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newIntervalIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('price_intervals')
        .delete()
        .in('id', toDelete)
    }

    // Upsert intervals and their prices
    const upsertedIntervals = []
    for (let i = 0; i < validatedIntervals.length; i++) {
      const interval = validatedIntervals[i]
      const { apartment_prices, hotel_prices, ...intervalData } = interval

      const intervalPayload = {
        name: intervalData.name,
        start_date: intervalData.start_date,
        end_date: intervalData.end_date,
        package_id: packageId,
        organization_id: userData.organization_id,
        sort_order: i,
      }

      let intervalId: string

      if (interval.id && existingIds.has(interval.id)) {
        // Update existing
        const { data, error } = await supabase
          .from('price_intervals')
          .update(intervalPayload)
          .eq('id', interval.id)
          .select()
          .single()

        if (error) throw error
        intervalId = data.id
        upsertedIntervals.push(data)
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('price_intervals')
          .insert(intervalPayload)
          .select()
          .single()

        if (error) throw error
        intervalId = data.id
        upsertedIntervals.push(data)
      }

      // Handle prices based on package type
      if (pkg.package_type === 'fiksni' && apartment_prices) {
        // Delete existing apartment prices for this interval
        await supabase
          .from('apartment_prices')
          .delete()
          .eq('interval_id', intervalId)

        // Insert new apartment prices
        const priceRecords = Object.entries(apartment_prices).map(([apartmentId, pricePerNight]) => ({
          apartment_id: apartmentId,
          interval_id: intervalId,
          organization_id: userData.organization_id,
          price_per_night: pricePerNight,
        }))

        if (priceRecords.length > 0) {
          await supabase
            .from('apartment_prices')
            .insert(priceRecords)
        }
      } else if (pkg.package_type === 'na_upit' && hotel_prices) {
        // Delete existing hotel prices for this interval
        await supabase
          .from('hotel_prices')
          .delete()
          .eq('interval_id', intervalId)

        // Insert new hotel prices
        const priceRecords = hotel_prices.map((hp: {
          room_type_id: string
          price_nd?: number | null
          price_bb?: number | null
          price_hb?: number | null
          price_fb?: number | null
          price_ai?: number | null
        }) => ({
          package_id: packageId,
          interval_id: intervalId,
          room_type_id: hp.room_type_id,
          organization_id: userData.organization_id,
          price_nd: hp.price_nd,
          price_bb: hp.price_bb,
          price_hb: hp.price_hb,
          price_fb: hp.price_fb,
          price_ai: hp.price_ai,
        }))

        if (priceRecords.length > 0) {
          await supabase
            .from('hotel_prices')
            .insert(priceRecords)
        }
      }
    }

    // Update package valid_from / valid_to from current intervals
    if (upsertedIntervals.length > 0) {
      const validFrom = upsertedIntervals.reduce((min, i) => {
        const d = i.start_date
        return !d ? min : !min || d < min ? d : min
      }, null as string | null)
      const validTo = upsertedIntervals.reduce((max, i) => {
        const d = i.end_date
        return !d ? max : !max || d > max ? d : max
      }, null as string | null)
      if (validFrom && validTo) {
        await supabase
          .from('packages')
          .update({ valid_from: validFrom, valid_to: validTo })
          .eq('id', packageId)
          .eq('organization_id', userData.organization_id)
      }
    } else {
      // No intervals left: clear valid_from / valid_to
      await supabase
        .from('packages')
        .update({ valid_from: null, valid_to: null })
        .eq('id', packageId)
        .eq('organization_id', userData.organization_id)
    }

    return NextResponse.json({ price_intervals: upsertedIntervals })
  } catch (error) {
    console.error('Price intervals POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
