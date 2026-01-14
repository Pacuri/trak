'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
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

// Popular months for each destination (Serbian market)
const POPULAR_MONTHS_BY_COUNTRY: Record<string, string[]> = {
  'Grčka': ['jun', 'jul', 'avg', 'sep'],
  'Turska': ['maj', 'jun', 'jul', 'avg', 'sep', 'okt'],
  'Egipat': ['jan', 'feb', 'mar', 'apr', 'okt', 'nov', 'dec'], // Year-round, avoiding summer heat
  'Crna Gora': ['jun', 'jul', 'avg', 'sep'],
  'Albanija': ['jun', 'jul', 'avg', 'sep'],
  'Hrvatska': ['jun', 'jul', 'avg', 'sep'],
  'Španija': ['maj', 'jun', 'jul', 'avg', 'sep'],
  'Italija': ['apr', 'maj', 'jun', 'sep', 'okt'],
  'UAE': ['nov', 'dec', 'jan', 'feb', 'mar'], // Winter season
  'Tajland': ['nov', 'dec', 'jan', 'feb', 'mar'], // Dry season
  'Maldivi': ['dec', 'jan', 'feb', 'mar', 'apr'], // Dry season
  'Tunis': ['maj', 'jun', 'sep', 'okt'],
  // Ski destinations
  'Austrija': ['dec', 'jan', 'feb', 'mar'],
  'Švajcarska': ['dec', 'jan', 'feb', 'mar'],
  'Francuska': ['dec', 'jan', 'feb', 'jul', 'avg'], // Ski + summer
  'Slovenija': ['dec', 'jan', 'feb', 'jun', 'jul', 'avg'],
}

interface MonthStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
  selectedCountry?: string
}

export default function MonthStep({ value, onChange, onNext, selectedCountry }: MonthStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Get popular months for selected country
  const popularMonths = selectedCountry 
    ? POPULAR_MONTHS_BY_COUNTRY[selectedCountry] || []
    : []

  const handleMonthSelect = (month: string | 'any' | 'exact') => {
    if (month === 'any') {
      onChange({ month: null, exactStart: null, exactEnd: null })
    } else if (month === 'exact') {
      // Set a flag to indicate exact date mode - will trigger date picker in flexibility step
      onChange({ month: 'exact', exactStart: null, exactEnd: null })
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

  const isPopular = (monthValue: string) => popularMonths.includes(monthValue)

  return (
    <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koji mesec?</h2>
        <p className="text-gray-500">Odaberite mesec putovanja</p>
      </div>

      {/* Month grid - 4 columns, 3 rows */}
      <div className="grid grid-cols-4 gap-3">
        {MONTHS.map((month) => {
          const popular = isPopular(month.value)
          const isSelected = value.month === month.value
          
          return (
            <button
              key={month.value}
              type="button"
              onClick={() => handleMonthSelect(month.value)}
              className={`
                relative px-3 py-4 rounded-xl text-sm font-medium transition-all
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : popular
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
                }
              `}
              title={month.fullLabel}
            >
              {month.label}
              {popular && !isSelected && (
                <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
            </button>
          )
        })}
      </div>

      {/* Popular months hint */}
      {popularMonths.length > 0 && (
        <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          Popularni meseci za {selectedCountry}
        </p>
      )}

      {/* Additional options */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleMonthSelect('exact')}
          className={`
            w-full px-6 py-4 rounded-xl font-medium transition-all
            ${
              value.month === 'exact'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          Imam tačan datum
        </button>

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
    </div>
  )
}
