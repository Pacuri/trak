/**
 * Price lookup for "na upit" packages: find the price for a given date from price_intervals + hotel_prices.
 * The interval that contains the date is used; price is from hotel_prices for that interval, room, and meal plan.
 */

export type MealPlanCode = 'ND' | 'BB' | 'HB' | 'FB' | 'AI'

const MEAL_KEYS: Record<MealPlanCode, string> = {
  ND: 'price_nd',
  BB: 'price_bb',
  HB: 'price_hb',
  FB: 'price_fb',
  AI: 'price_ai',
}

function parseDate(d: string | Date): Date {
  return typeof d === 'string' ? new Date(d) : d
}

export interface PriceIntervalLike {
  id: string
  name?: string | null
  start_date: string
  end_date: string
}

export interface HotelPriceLike {
  interval_id: string
  room_type_id: string
  price_nd?: number | null
  price_bb?: number | null
  price_hb?: number | null
  price_fb?: number | null
  price_ai?: number | null
}

export interface GetPriceForDateParams {
  date: Date | string
  intervals: PriceIntervalLike[]
  hotel_prices: HotelPriceLike[]
  room_type_id: string
  meal_plan: MealPlanCode
}

export interface GetPriceForDateResult {
  price_per_person: number
  interval_name?: string
  price_type?: string
}

/**
 * Find the price for a given date.
 * Uses the interval that contains the date, then hotel_prices for that interval + room + meal plan.
 */
export function getPriceForDate(params: GetPriceForDateParams): GetPriceForDateResult | null {
  const { date, intervals, hotel_prices, room_type_id, meal_plan } = params
  const d = parseDate(date)
  const key = MEAL_KEYS[meal_plan]

  const interval = intervals.find(
    (i) => d >= parseDate(i.start_date) && d <= parseDate(i.end_date)
  )
  if (!interval) return null

  const hp = hotel_prices.find(
    (p) => p.interval_id === interval.id && p.room_type_id === room_type_id
  )
  if (!hp) return null

  const price = hp[key as keyof HotelPriceLike] as number | null | undefined
  if (price == null || typeof price !== 'number' || price < 0) return null

  return {
    price_per_person: price,
    interval_name: interval.name ?? undefined,
    price_type: undefined,
  }
}
