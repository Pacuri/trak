'use client'

import { useState } from 'react'
import type { QualificationData } from '@/types'

const BUDGET_OPTIONS = [
  { value: '0-300', label: 'Do €300' },
  { value: '300-500', label: '€300-500' },
  { value: '500-700', label: '€500-700' },
  { value: '700-1000', label: '€700-1000' },
  { value: '1000+', label: '€1000+' },
]

interface BudgetStepProps {
  value: QualificationData['budget']
  guestCount: number
  onChange: (budget: Partial<QualificationData['budget']>) => void
  onNext: () => void
}

export default function BudgetStep({ value, guestCount, onChange, onNext }: BudgetStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const parseBudgetRange = (range: string): { min: number | null; max: number | null } => {
    if (range === 'unlimited') return { min: null, max: null }
    if (range === '1000+') return { min: 1000, max: null }

    const [minStr, maxStr] = range.split('-')
    return {
      min: parseInt(minStr) || null,
      max: parseInt(maxStr) || null,
    }
  }

  const handleBudgetSelect = (range: string) => {
    const { min, max } = parseBudgetRange(range)
    onChange({ min, max })

    // Auto-advance after selection
    setIsAnimating(true)
    setTimeout(() => {
      onNext()
    }, 200)
  }

  const getCurrentSelection = (): string => {
    if (value.max === null && value.min === null) return 'unlimited'
    if (value.min === 1000 && value.max === null) return '1000+'
    return `${value.min || 0}-${value.max || ''}`
  }

  const currentSelection = getCurrentSelection()

  return (
    <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliki je vaš budžet?</h2>
        <p className="text-gray-500">Po osobi, ne mora biti tačno</p>
      </div>

      {/* "Nije bitno" - prominent at top */}
      <button
        type="button"
        onClick={() => handleBudgetSelect('unlimited')}
        className={`
          w-full flex flex-col items-center justify-center p-6 rounded-xl transition-all
          ${
            currentSelection === 'unlimited'
              ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
              : 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
          }
        `}
      >
        <span className="text-3xl mb-2">🤷</span>
        <span className="font-semibold text-lg">Nije bitno</span>
        <span className={`text-sm mt-1 ${currentSelection === 'unlimited' ? 'text-blue-100' : 'text-blue-500'}`}>
          Prikaži sve ponude
        </span>
      </button>

      {/* Budget range options */}
      <div className="grid grid-cols-2 gap-3">
        {BUDGET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleBudgetSelect(option.value)}
            className={`
              px-4 py-4 rounded-xl font-medium transition-all text-center
              ${
                currentSelection === option.value
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* "Don't limit" note */}
      <p className="text-xs text-center text-gray-400">
        Prikazaćemo i ponude malo iznad budžeta ako su vredne pažnje
      </p>
    </div>
  )
}
