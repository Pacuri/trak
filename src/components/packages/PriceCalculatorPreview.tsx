'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type {
  Package,
  Apartment,
  RoomType,
  PriceInterval,
  ChildrenPolicy,
  Shift,
  MealPlanCode,
  PriceCalculationResult,
} from '@/types/packages'
import { Calculator, ChevronDown, ChevronUp, Plus, Minus, Loader2 } from 'lucide-react'

interface PriceCalculatorPreviewProps {
  package: Package
  apartments?: Apartment[]
  roomTypes?: RoomType[]
  intervals?: PriceInterval[]
  childrenPolicies?: ChildrenPolicy[]
  shifts?: Shift[]
}

const MEAL_PLAN_LABELS: Record<MealPlanCode, string> = {
  ND: 'Noćenje',
  BB: 'Doručak (BB)',
  HB: 'Polupansion (HB)',
  FB: 'Pun pansion (FB)',
  AI: 'All Inclusive',
}

export function PriceCalculatorPreview({
  package: pkg,
  apartments = [],
  roomTypes = [],
  intervals = [],
  childrenPolicies = [],
  shifts = [],
}: PriceCalculatorPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<PriceCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Common
    check_in: '',
    check_out: '',
    
    // FIKSNI
    apartment_id: '',
    shift_id: '',
    include_transport: true,
    number_of_persons: 2,
    
    // NA_UPIT
    room_type_id: '',
    meal_plan: '' as MealPlanCode | '',
    adults: 2,
    children: [] as { age: number }[],
  })

  // Set default dates
  useEffect(() => {
    const today = new Date()
    const checkIn = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const checkOut = new Date(checkIn.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    setFormData(prev => ({
      ...prev,
      check_in: checkIn.toISOString().split('T')[0],
      check_out: checkOut.toISOString().split('T')[0],
      apartment_id: apartments[0]?.id || '',
      room_type_id: roomTypes[0]?.id || '',
      meal_plan: (pkg.meal_plans?.[0] || '') as MealPlanCode | '',
    }))
  }, [apartments, roomTypes, pkg.meal_plans])

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { age: 5 }],
    }))
  }

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }))
  }

  const updateChildAge = (index: number, age: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map((c, i) => i === index ? { age } : c),
    }))
  }

  const calculatePrice = async () => {
    setIsCalculating(true)
    setError(null)
    setResult(null)

    try {
      const body = pkg.package_type === 'fiksni'
        ? {
            apartment_id: formData.apartment_id,
            check_in: formData.check_in,
            check_out: formData.check_out,
            shift_id: formData.shift_id || undefined,
            include_transport: formData.include_transport,
            number_of_persons: formData.number_of_persons,
          }
        : {
            package_id: pkg.id,
            check_in: formData.check_in,
            check_out: formData.check_out,
            room_type_id: formData.room_type_id,
            meal_plan: formData.meal_plan,
            adults: formData.adults,
            children: formData.children,
          }

      const response = await fetch(`/api/packages/${pkg.id}/calculate-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to calculate price')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2">
            <Calculator className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">Test kalkulatora cena</h4>
            <p className="text-sm text-gray-500">Proverite cene pre objavljivanja</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Date inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Datum dolaska
              </label>
              <input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Datum odlaska
              </label>
              <input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* FIKSNI specific inputs */}
          {pkg.package_type === 'fiksni' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Apartman
                  </label>
                  <select
                    value={formData.apartment_id}
                    onChange={(e) => setFormData({ ...formData, apartment_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Izaberi...</option>
                    {apartments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.name} (max {apt.max_persons} osoba)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Broj osoba
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.number_of_persons}
                    onChange={(e) => setFormData({ ...formData, number_of_persons: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {shifts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Smena (opciono)
                  </label>
                  <select
                    value={formData.shift_id}
                    onChange={(e) => setFormData({ ...formData, shift_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Bez smene</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.name} ({shift.start_date} - {shift.end_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.include_transport}
                  onChange={(e) => setFormData({ ...formData, include_transport: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                />
                <span className="text-sm text-gray-600">Uključi prevoz</span>
              </label>
            </>
          )}

          {/* NA_UPIT specific inputs */}
          {pkg.package_type === 'na_upit' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tip sobe
                  </label>
                  <select
                    value={formData.room_type_id}
                    onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Izaberi...</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.code} - {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pansion
                  </label>
                  <select
                    value={formData.meal_plan}
                    onChange={(e) => setFormData({ ...formData, meal_plan: e.target.value as MealPlanCode })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Izaberi...</option>
                    {pkg.meal_plans?.map((mp) => (
                      <option key={mp} value={mp}>
                        {MEAL_PLAN_LABELS[mp]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Odrasli
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.adults}
                  onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                  className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Deca</label>
                  <button
                    type="button"
                    onClick={addChild}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700"
                  >
                    <Plus className="h-3 w-3" />
                    Dodaj dete
                  </button>
                </div>
                {formData.children.length === 0 ? (
                  <p className="text-sm text-gray-500">Nema dece</p>
                ) : (
                  <div className="space-y-2">
                    {formData.children.map((child, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={17}
                          value={child.age}
                          onChange={(e) => updateChildAge(i, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                        <span className="text-sm text-gray-500">godina</span>
                        <button
                          type="button"
                          onClick={() => removeChild(i)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Calculate button */}
          <button
            type="button"
            onClick={calculatePrice}
            disabled={isCalculating}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            Izračunaj cenu
          </button>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">Ukupna cena:</span>
                <span className="text-2xl font-bold text-green-800">
                  €{result.total.toFixed(2)}
                </span>
              </div>
              
              <div className="text-sm text-green-600 space-y-1">
                <p>• {result.nights} noćenja × €{result.price_per_night.toFixed(2)}/noć</p>
                {result.transport_total > 0 && (
                  <p>• Prevoz: €{result.transport_total.toFixed(2)}</p>
                )}
              </div>

              {result.breakdown.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-green-700 hover:text-green-800">
                    Detaljna specifikacija
                  </summary>
                  <div className="mt-2 space-y-1 text-green-600">
                    {result.breakdown.map((item, i) => (
                      <p key={i}>
                        {item.description}: €{item.subtotal.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
