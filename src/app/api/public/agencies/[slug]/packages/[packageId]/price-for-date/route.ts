import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getPriceForDate } from '@/lib/packages/price-for-date'
import type { MealPlanCode } from '@/lib/packages/price-for-date'

const MEAL_PLANS: MealPlanCode[] = ['ND', 'BB', 'HB', 'FB', 'AI']

// GET /api/public/agencies/[slug]/packages/[packageId]/price-for-date?date=YYYY-MM-DD&room_type_id=uuid&meal_plan=BB
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; packageId: string }> }
) {
  try {
    const { slug, packageId } = await params
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date')
    const roomTypeId = searchParams.get('room_type_id')
    const mealPlan = (searchParams.get('meal_plan') || 'BB').toUpperCase() as MealPlanCode

    if (!date || !roomTypeId) {
      return NextResponse.json(
        { error: 'Potrebni parametri: date, room_type_id' },
        { status: 400 }
      )
    }
    if (!MEAL_PLANS.includes(mealPlan)) {
      return NextResponse.json(
        { error: 'meal_plan mora biti jedan od: ND, BB, HB, FB, AI' },
        { status: 400 }
      )
    }

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

    const { data: pkg } = await supabase
      .from('packages')
      .select('id, package_type, price_type')
      .eq('id', packageId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .eq('is_active', true)
      .single()

    if (!pkg || pkg.package_type !== 'na_upit') {
      return NextResponse.json({ error: 'Paket nije pronađen ili nije na upit' }, { status: 404 })
    }

    const [{ data: intervals }, { data: hotelPrices }] = await Promise.all([
      supabase.from('price_intervals').select('id, name, start_date, end_date').eq('package_id', packageId),
      supabase.from('hotel_prices').select('interval_id, room_type_id, price_nd, price_bb, price_hb, price_fb, price_ai').eq('package_id', packageId).eq('room_type_id', roomTypeId),
    ])

    const result = getPriceForDate({
      date,
      intervals: intervals ?? [],
      hotel_prices: hotelPrices ?? [],
      room_type_id: roomTypeId,
      meal_plan: mealPlan,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Cena za izabrani datum nije pronađena' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...result,
      price_type: pkg.price_type ?? undefined,
    })
  } catch (e) {
    console.error('Price for date GET:', e)
    return NextResponse.json({ error: 'Greška pri učitavanju cene' }, { status: 500 })
  }
}
