'use client'

import { useState } from 'react'
import ChipSelector from './ChipSelector'
import type { QualificationData } from '@/types'

const MONTHS = [
  { value: 'jan', label: 'Jan', fullLabel: 'Januar' },
  { value: 'feb', label: 'Feb', fullLabel: 'Februar' },
  { value: 'mar', label: 'Mar', fullLabel: 'Mart' },
  { value: 'apr', label: 'Apr', fullLabel: 'April' },
  { value: 'maj', label: 'Maj', fullLabel: 'Maj' },
  { value: 'jun', label: 'Jun', fullLabel: 'Jun' },
  { value: 'jul', label: 'Jul', fullLabel: 'Jul' },
  { value: 'avg', label: 'Avg', fullLabel: 'Avgust' },
  { value: 'sep', label: 'Sep', fullLabel: 'Septembar' },
  { value: 'okt', label: 'Okt', fullLabel: 'Oktobar' },
  { value: 'nov', label: 'Nov', fullLabel: 'Novembar' },
  { value: 'dec', label: 'Dec', fullLabel: 'Decembar' },
]

const DURATIONS = [
  { value: '3', label: '3 noći' },
  { value: '5', label: '5 noći' },
  { value: '7', label: '7 noći' },
  { value: '10', label: '10 noći' },
  { value: '14', label: '14 noći' },
]

interface DatesStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
}

export default function DatesStep({ value, onChange }: DatesStepProps) {
  const [mode, setMode] = useState<'month' | 'exact'>('month')

  // Filter months to show only current and future months
  // Show current month first, then future months, then next year's early months
  const now = new Date()
  const currentMonthIndex = now.getMonth()
  
  // Get current and future months for this year
  const thisYearMonths = MONTHS.slice(currentMonthIndex)
  
  // Get early months for next year (if we're past mid-year)
  const nextYearMonths = currentMonthIndex > 5 ? MONTHS.slice(0, currentMonthIndex) : []
  
  // Combine: current year months first, then next year months
  const availableMonths = [...thisYearMonths, ...nextYearMonths]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kada planirate putovanje?</h2>
        <p className="text-gray-500">Odaberite mesec ili tačan datum</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('month')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Mesec
        </button>
        <button
          type="button"
          onClick={() => setMode('exact')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'exact' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Tačan datum
        </button>
      </div>

      {mode === 'month' ? (
        <>
          {/* Month selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Koji mesec?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {availableMonths.map((month) => (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => onChange({ month: month.value, exactStart: null, exactEnd: null })}
                  className={`
                    px-3 py-3 rounded-xl text-sm font-medium transition-all
                    ${
                      value.month === month.value
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
                    }
                  `}
                  title={month.fullLabel}
                >
                  {month.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flexibility toggle */}
          <label className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={value.flexible}
              onChange={(e) => onChange({ flexible: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="font-medium text-gray-900">Fleksibilan sam sa datumima</p>
              <p className="text-sm text-gray-500">± par dana ne pravi razliku</p>
            </div>
          </label>
        </>
      ) : (
        <>
          {/* Exact dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum polaska
              </label>
              <input
                type="date"
                value={value.exactStart || ''}
                onChange={(e) => onChange({ exactStart: e.target.value, month: null })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum povratka
              </label>
              <input
                type="date"
                value={value.exactEnd || ''}
                onChange={(e) => onChange({ exactEnd: e.target.value })}
                min={value.exactStart || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </>
      )}

      {/* Duration preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Koliko noći? (okvirno)
        </label>
        <ChipSelector
          options={DURATIONS}
          selected={String(value.duration)}
          onChange={(v) => onChange({ duration: Number(v) })}
          columns={4}
        />
      </div>
    </div>
  )
}
