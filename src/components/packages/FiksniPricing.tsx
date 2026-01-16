'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PriceIntervalFormData, ApartmentFormData } from '@/types/packages'
import { Plus, Trash2, Calendar, AlertCircle } from 'lucide-react'

interface FiksniPricingProps {
  intervals: PriceIntervalFormData[]
  apartments: ApartmentFormData[]
  onChange: (intervals: PriceIntervalFormData[]) => void
}

export function FiksniPricing({ intervals, apartments, onChange }: FiksniPricingProps) {
  const [error, setError] = useState<string | null>(null)

  const addInterval = () => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)

    const newInterval: PriceIntervalFormData = {
      name: `Interval ${intervals.length + 1}`,
      start_date: nextMonth.toISOString().split('T')[0],
      end_date: endOfMonth.toISOString().split('T')[0],
      apartment_prices: {},
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

  const updateApartmentPrice = (intervalIndex: number, apartmentId: string, price: number) => {
    const interval = intervals[intervalIndex]
    const newPrices = { ...(interval.apartment_prices || {}) }
    if (price > 0) {
      newPrices[apartmentId] = price
    } else {
      delete newPrices[apartmentId]
    }
    updateInterval(intervalIndex, { apartment_prices: newPrices })
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-Latn', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (apartments.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-2 font-medium text-amber-700">Prvo dodajte apartmane</p>
        <p className="text-sm text-amber-600">
          Pre nego što definišete cene, potrebno je dodati apartmane u prethodnom koraku.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cenovni intervali</h3>
          <p className="text-sm text-gray-500">Definišite cene po noćenju za svaki period</p>
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
            Dodajte intervale (npr. Jun, Jul-Avg, Sep) sa cenama za svaki apartman
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {intervals.map((interval, index) => (
            <div
              key={index}
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
                        onChange={(e) => updateInterval(index, { name: e.target.value })}
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
                        onChange={(e) => updateInterval(index, { start_date: e.target.value })}
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
                        onChange={(e) => updateInterval(index, { end_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInterval(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Prices grid */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  Cena po noćenju (za ceo apartman)
                </p>
                <div className="space-y-2">
                  {apartments.map((apt, aptIndex) => (
                    <div
                      key={aptIndex}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{apt.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          (max {apt.max_persons} osoba)
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          €
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={interval.apartment_prices?.[apt.id || `new-${aptIndex}`] || ''}
                          onChange={(e) => updateApartmentPrice(
                            index,
                            apt.id || `new-${aptIndex}`,
                            parseFloat(e.target.value) || 0
                          )}
                          placeholder="0.00"
                          className="w-28 rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm text-right focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cene su za ceo apartman po noćenju (ne po osobi)
          </p>
        </div>
      )}
    </div>
  )
}
