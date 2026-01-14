'use client'

import { useState } from 'react'
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

interface MonthStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
}

export default function MonthStep({ value, onChange, onNext }: MonthStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleMonthSelect = (month: string | 'any') => {
    if (month === 'any') {
      onChange({ month: null, exactStart: null, exactEnd: null })
    } else {
      onChange({ month, exactStart: null, exactEnd: null })
    }
    
    // Trigger slide animation
    setIsAnimating(true)
    
    // Auto-advance after animation
    setTimeout(() => {
      onNext()
    }, 200)
  }

  return (
    <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koji mesec?</h2>
        <p className="text-gray-500">Odaberite mesec putovanja</p>
      </div>

      {/* Month grid - 4 columns, 3 rows */}
      <div className="grid grid-cols-4 gap-3">
        {MONTHS.map((month) => (
          <button
            key={month.value}
            type="button"
            onClick={() => handleMonthSelect(month.value)}
            className={`
              px-3 py-4 rounded-xl text-sm font-medium transition-all
              ${
                value.month === month.value
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
            title={month.fullLabel}
          >
            {month.label}
          </button>
        ))}
      </div>

      {/* "Svejedno mi je" option */}
      <button
        type="button"
        onClick={() => handleMonthSelect('any')}
        className={`
          w-full px-6 py-4 rounded-xl font-medium transition-all
          ${
            value.month === null && !value.exactStart
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
          }
        `}
      >
        Svejedno mi je
      </button>
    </div>
  )
}
