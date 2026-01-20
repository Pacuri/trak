import { NextRequest, NextResponse } from 'next/server'
import { calculateGroupPrice } from '@/lib/packages/calculate-group-price'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const package_id = searchParams.get('package_id')
  const adults = parseInt(searchParams.get('adults') || '2')
  const childAgesParam = searchParams.get('child_ages')
  const childAges = childAgesParam
    ? childAgesParam.split(',').map(Number).filter(n => !isNaN(n))
    : []
  const date = searchParams.get('date')
  const duration_nights = parseInt(searchParams.get('duration_nights') || '7')
  const room_type_id = searchParams.get('room_type_id') || undefined
  const meal_plan = searchParams.get('meal_plan') || undefined

  if (!package_id) {
    return NextResponse.json({ error: 'Missing package_id' }, { status: 400 })
  }

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  try {
    const result = await calculateGroupPrice({
      package_id,
      adults,
      childAges,
      date,
      duration_nights,
      room_type_id,
      meal_plan: meal_plan as any,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Price calculation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Calculation error' },
      { status: 500 }
    )
  }
}
