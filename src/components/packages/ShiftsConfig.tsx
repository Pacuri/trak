'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ShiftFormData, ShiftStatus } from '@/types/packages'
import { Plus, Trash2, Bus, Sparkles, ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface ShiftsConfigProps {
  shifts: ShiftFormData[]
  onChange: (shifts: ShiftFormData[]) => void
  defaultCapacity?: number
  defaultTransportPrice?: number
}

const STATUS_LABELS: Record<ShiftStatus, string> = {
  active: 'Aktivna',
  full: 'Popunjeno',
  cancelled: 'Otkazano',
}

export function ShiftsConfig({ 
  shifts, 
  onChange, 
  defaultCapacity = 40,
  defaultTransportPrice = 30,
}: ShiftsConfigProps) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [generatorConfig, setGeneratorConfig] = useState({
    start_date: '',
    end_date: '',
    duration_nights: 9,
    capacity: defaultCapacity,
    transport_price: defaultTransportPrice,
  })
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const addShift = () => {
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const newShift: ShiftFormData = {
      name: `Tura ${shifts.length + 1}`,
      start_date: startDate,
      end_date: endDate,
      capacity: defaultCapacity,
      booked: 0,
      transport_price_per_person: defaultTransportPrice,
      transport_included: true,
      status: 'active',
    }
    onChange([...shifts, newShift])
    setExpandedIndex(shifts.length)
  }

  const updateShift = (index: number, data: Partial<ShiftFormData>) => {
    const newShifts = [...shifts]
    newShifts[index] = { ...newShifts[index], ...data }
    onChange(newShifts)
  }

  const removeShift = (index: number) => {
    onChange(shifts.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const generateShifts = () => {
    if (!generatorConfig.start_date || !generatorConfig.end_date) return

    const generated: ShiftFormData[] = []
    let currentStart = new Date(generatorConfig.start_date)
    const endDate = new Date(generatorConfig.end_date)
    let shiftNumber = shifts.length + 1

    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + generatorConfig.duration_nights)

      if (currentEnd > endDate) break

      generated.push({
        name: `Tura ${shiftNumber}`,
        start_date: currentStart.toISOString().split('T')[0],
        end_date: currentEnd.toISOString().split('T')[0],
        capacity: generatorConfig.capacity,
        booked: 0,
        transport_price_per_person: generatorConfig.transport_price,
        transport_included: true,
        status: 'active',
      })

      currentStart = currentEnd
      shiftNumber++
    }

    onChange([...shifts, ...generated])
    setShowGenerator(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-Latn', { day: '2-digit', month: '2-digit' })
  }

  const totalCapacity = shifts.reduce((sum, s) => sum + s.capacity, 0)
  const totalBooked = shifts.reduce((sum, s) => sum + (s.booked || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Smene / Ture</h3>
          <p className="text-sm text-gray-500">
            Ukupno: {shifts.length} tura • {totalCapacity} mesta • {totalBooked} rezervisano
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGenerator(!showGenerator)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              showGenerator
                ? 'bg-purple-100 text-purple-700'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Auto-generiši
          </button>
          <button
            type="button"
            onClick={addShift}
            className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Dodaj smenu
          </button>
        </div>
      </div>

      {/* Generator panel */}
      {showGenerator && (
        <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Auto-generisanje smena</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-purple-600 mb-1">
                Od datuma
              </label>
              <input
                type="date"
                value={generatorConfig.start_date}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, start_date: e.target.value })}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 mb-1">
                Do datuma
              </label>
              <input
                type="date"
                value={generatorConfig.end_date}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, end_date: e.target.value })}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 mb-1">
                Trajanje (noći)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={generatorConfig.duration_nights}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, duration_nights: parseInt(e.target.value) || 9 })}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 mb-1">
                Kapacitet
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={generatorConfig.capacity}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, capacity: parseInt(e.target.value) || 40 })}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-600 mb-1">
                Prevoz (€/os)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={generatorConfig.transport_price}
                onChange={(e) => setGeneratorConfig({ ...generatorConfig, transport_price: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={generateShifts}
            disabled={!generatorConfig.start_date || !generatorConfig.end_date}
            className="w-full rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generiši smene
          </button>
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Bus className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Nema smena</p>
          <p className="text-xs text-gray-400">
            Dodajte smene ručno ili koristite auto-generisanje
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-teal-50 p-2">
                    <Bus className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{shift.name || `Tura ${index + 1}`}</h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(shift.start_date)} - {formatDate(shift.end_date)} • {shift.capacity} mesta
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium',
                    shift.status === 'active' && 'bg-green-100 text-green-700',
                    shift.status === 'full' && 'bg-amber-100 text-amber-700',
                    shift.status === 'cancelled' && 'bg-gray-100 text-gray-600',
                  )}>
                    {STATUS_LABELS[shift.status || 'active']}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeShift(index)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedIndex === index && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Naziv
                      </label>
                      <input
                        type="text"
                        value={shift.name || ''}
                        onChange={(e) => updateShift(index, { name: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Status
                      </label>
                      <select
                        value={shift.status || 'active'}
                        onChange={(e) => updateShift(index, { status: e.target.value as ShiftStatus })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Datum od
                      </label>
                      <input
                        type="date"
                        value={shift.start_date}
                        onChange={(e) => updateShift(index, { start_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Datum do
                      </label>
                      <input
                        type="date"
                        value={shift.end_date}
                        onChange={(e) => updateShift(index, { end_date: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Kapacitet
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={shift.capacity}
                        onChange={(e) => updateShift(index, { capacity: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Rezervisano
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={shift.capacity}
                        value={shift.booked || 0}
                        onChange={(e) => updateShift(index, { booked: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Prevoz (€/os)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={shift.transport_price_per_person || ''}
                        onChange={(e) => updateShift(index, { transport_price_per_person: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shift.transport_included !== false}
                      onChange={(e) => updateShift(index, { transport_included: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                    />
                    <span className="text-sm text-gray-600">Prevoz uključen u cenu</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
