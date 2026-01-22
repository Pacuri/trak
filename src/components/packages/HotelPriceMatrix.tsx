'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PriceIntervalFormData, RoomTypeFormData, HotelPriceFormData, MealPlanCode } from '@/types/packages'
import { Plus, Trash2, Calendar, AlertCircle } from 'lucide-react'

interface HotelPriceMatrixProps {
  intervals: PriceIntervalFormData[]
  roomTypes: RoomTypeFormData[]
  mealPlans: MealPlanCode[]
  onChange: (intervals: PriceIntervalFormData[]) => void
}

const MEAL_PLAN_LABELS: Record<MealPlanCode, string> = {
  ND: 'Noćenje',
  BB: 'Doručak',
  HB: 'Polupansion',
  FB: 'Pun pansion',
  AI: 'All Inclusive',
}

const MEAL_PLAN_SHORT: Record<MealPlanCode, string> = {
  ND: 'ND',
  BB: 'BB',
  HB: 'HB',
  FB: 'FB',
  AI: 'AI',
}

export function HotelPriceMatrix({ intervals, roomTypes, mealPlans, onChange }: HotelPriceMatrixProps) {
  const [error, setError] = useState<string | null>(null)

  const addInterval = () => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)

    // Create empty hotel prices for all room types
    const hotel_prices: HotelPriceFormData[] = roomTypes.map(rt => ({
      room_type_id: rt.id || `new-${roomTypes.indexOf(rt)}`,
      price_nd: undefined,
      price_bb: undefined,
      price_hb: undefined,
      price_fb: undefined,
      price_ai: undefined,
    }))

    const newInterval: PriceIntervalFormData = {
      name: `Interval ${intervals.length + 1}`,
      start_date: nextMonth.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0],
      hotel_prices,
    }
    onChange([...intervals, newInterval])
  }

  const updateInterval = (index: number, data: Partial<PriceIntervalFormData>) => {
    const newIntervals = [...intervals]
    newIntervals[index] = { ...newIntervals[index], ...data }
    
    // Check for overlaps
    const hasOverlap = checkOverlaps(newIntervals)
    if (hasOverlap) {
      setError('Intervali se preklapaju!')
    } else {
      setError(null)
    }
    
    onChange(newIntervals)
  }

  const updatePrice = (
    intervalIndex: number,
    roomTypeId: string,
    mealPlan: MealPlanCode,
    value: number | undefined
  ) => {
    const interval = intervals[intervalIndex]
    const hotel_prices = [...(interval.hotel_prices || [])]
    
    let roomPriceIndex = hotel_prices.findIndex(hp => hp.room_type_id === roomTypeId)
    if (roomPriceIndex === -1) {
      hotel_prices.push({
        room_type_id: roomTypeId,
        price_nd: undefined,
        price_bb: undefined,
        price_hb: undefined,
        price_fb: undefined,
        price_ai: undefined,
      })
      roomPriceIndex = hotel_prices.length - 1
    }

    const key = `price_${mealPlan.toLowerCase()}` as keyof HotelPriceFormData
    hotel_prices[roomPriceIndex] = {
      ...hotel_prices[roomPriceIndex],
      [key]: value,
    }

    updateInterval(intervalIndex, { hotel_prices })
  }

  const getPrice = (
    intervalIndex: number,
    roomTypeId: string,
    mealPlan: MealPlanCode
  ): number | undefined => {
    const interval = intervals[intervalIndex]
    const roomPrice = interval.hotel_prices?.find(hp => hp.room_type_id === roomTypeId)
    if (!roomPrice) return undefined
    const key = `price_${mealPlan.toLowerCase()}` as keyof HotelPriceFormData
    return roomPrice[key] as number | undefined
  }

  const removeInterval = (index: number) => {
    onChange(intervals.filter((_, i) => i !== index))
    setError(null)
  }

  const checkOverlaps = (intervalsToCheck: PriceIntervalFormData[]): boolean => {
    for (let i = 0; i < intervalsToCheck.length; i++) {
      for (let j = i + 1; j < intervalsToCheck.length; j++) {
        const a = intervalsToCheck[i]
        const b = intervalsToCheck[j]
        const aStart = new Date(a.start_date)
        const aEnd = new Date(a.end_date)
        const bStart = new Date(b.start_date)
        const bEnd = new Date(b.end_date)
        
        if (aStart <= bEnd && bStart <= aEnd) {
          return true
        }
      }
    }
    return false
  }

  if (roomTypes.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-2 font-medium text-amber-700">Prvo dodajte tipove soba</p>
        <p className="text-sm text-amber-600">
          Pre nego što definišete cene, potrebno je dodati tipove soba u prethodnom koraku.
        </p>
      </div>
    )
  }

  if (mealPlans.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-2 font-medium text-amber-700">Izaberite tipove ishrane</p>
        <p className="text-sm text-amber-600">
          Pre nego što definišete cene, potrebno je izabrati tipove ishrane (pansiona).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cenovnik</h3>
          <p className="text-sm text-gray-500">
            Cena po osobi za ceo boravak, za svaki tip sobe i pansion
          </p>
        </div>
        <button
          type="button"
          onClick={addInterval}
          className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Dodaj interval
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {intervals.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Nema cenovnih intervala</p>
          <p className="text-xs text-gray-400">
            Dodajte intervale (npr. Jun, Jul-Avg, Sep) sa cenama
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {intervals.map((interval, intervalIndex) => (
            <div
              key={intervalIndex}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Interval header */}
              <div className="border-b border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Naziv intervala
                      </label>
                      <input
                        type="text"
                        value={interval.name || ''}
                        onChange={(e) => updateInterval(intervalIndex, { name: e.target.value })}
                        placeholder="npr. Jun, Špic sezone"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Od
                      </label>
                      <input
                        type="date"
                        value={interval.start_date}
                        onChange={(e) => updateInterval(intervalIndex, { start_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Do
                      </label>
                      <input
                        type="date"
                        value={interval.end_date}
                        onChange={(e) => updateInterval(intervalIndex, { end_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInterval(intervalIndex)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Price matrix */}
              <div className="p-4 overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">
                        Tip sobe
                      </th>
                      {mealPlans.map((mp) => (
                        <th key={mp} className="text-center text-xs font-medium text-gray-500 pb-3 px-2">
                          <div>{MEAL_PLAN_SHORT[mp]}</div>
                          <div className="text-[10px] font-normal text-gray-400">
                            {MEAL_PLAN_LABELS[mp]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes.map((roomType, rtIndex) => {
                      const roomTypeId = roomType.id || `new-${rtIndex}`
                      return (
                        <tr key={rtIndex} className="border-t border-gray-100">
                          <td className="py-2 pr-4">
                            <span className="font-medium text-gray-900">{roomType.code}</span>
                            <span className="ml-2 text-sm text-gray-500">{roomType.name}</span>
                          </td>
                          {mealPlans.map((mp) => (
                            <td key={mp} className="py-2 px-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                  €
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={getPrice(intervalIndex, roomTypeId, mp) || ''}
                                  onChange={(e) => updatePrice(
                                    intervalIndex,
                                    roomTypeId,
                                    mp,
                                    parseFloat(e.target.value) || undefined
                                  )}
                                  placeholder="--"
                                  className="w-20 rounded-lg border border-gray-200 pl-6 pr-2 py-1.5 text-sm text-right focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cene su po osobi za ceo boravak. Ostavite prazno ako usluga nije dostupna.
          </p>
        </div>
      )}
    </div>
  )
}
