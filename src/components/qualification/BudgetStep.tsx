'use client'

import ChipSelector from './ChipSelector'
import type { QualificationData } from '@/types'

const BUDGET_OPTIONS = [
  { value: '0-300', label: 'Do €300' },
  { value: '300-500', label: '€300-500' },
  { value: '500-700', label: '€500-700' },
  { value: '700-1000', label: '€700-1000' },
  { value: '1000+', label: '€1000+' },
  { value: 'unlimited', label: 'Nije bitno' },
]

interface BudgetStepProps {
  value: QualificationData['budget']
  guestCount: number
  onChange: (budget: Partial<QualificationData['budget']>) => void
}

export default function BudgetStep({ value, guestCount, onChange }: BudgetStepProps) {
  const parseBudgetRange = (range: string): { min: number | null; max: number | null } => {
    if (range === 'unlimited') return { min: null, max: null }
    if (range === '1000+') return { min: 1000, max: null }
    
    const [minStr, maxStr] = range.split('-')
    return {
      min: parseInt(minStr) || null,
      max: parseInt(maxStr) || null,
    }
  }

  const handleBudgetChange = (range: string) => {
    const { min, max } = parseBudgetRange(range)
    onChange({ min, max })
  }

  const getCurrentSelection = (): string => {
    if (value.max === null && value.min === null) return 'unlimited'
    if (value.min === 1000 && value.max === null) return '1000+'
    return `${value.min || 0}-${value.max || ''}`
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliki je vaš budžet?</h2>
        <p className="text-gray-500">Po osobi, ne mora biti tačno</p>
      </div>

      {/* Budget range chips */}
      <ChipSelector
        options={BUDGET_OPTIONS}
        selected={getCurrentSelection()}
        onChange={handleBudgetChange}
        columns={2}
      />

      {/* Per person toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onChange({ perPerson: true })}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            value.perPerson ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Po osobi
        </button>
        <button
          type="button"
          onClick={() => onChange({ perPerson: false })}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            !value.perPerson ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          Ukupno
        </button>
      </div>

      {/* Budget summary */}
      {value.max && (
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-sm text-blue-800">
            Tražimo ponude{' '}
            {value.perPerson ? (
              <>
                do <span className="font-bold">€{value.max}</span> po osobi
                <br />
                <span className="text-xs text-blue-600">
                  (do €{value.max * guestCount} ukupno za {guestCount} osobe)
                </span>
              </>
            ) : (
              <>
                do <span className="font-bold">€{value.max}</span> ukupno
                <br />
                <span className="text-xs text-blue-600">
                  (~€{Math.round(value.max / guestCount)} po osobi za {guestCount} osobe)
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {/* "Don't limit" note */}
      <p className="text-xs text-center text-gray-400">
        Prikazaćemo i ponude malo iznad budžeta ako su vredne pažnje
      </p>
    </div>
  )
}
