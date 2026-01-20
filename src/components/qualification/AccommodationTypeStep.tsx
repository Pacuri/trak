'use client'

import type { AccommodationType } from '@/types'

const SPECIFIC_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'apartment', label: 'Apartman', icon: '🏠' },
  { value: 'villa', label: 'Vila', icon: '🏡' },
]

interface AccommodationTypeStepProps {
  value: AccommodationType | null
  onChange: (type: AccommodationType) => void
  onNext: () => void
}

export default function AccommodationTypeStep({ value, onChange, onNext }: AccommodationTypeStepProps) {
  const handleSelect = (type: AccommodationType) => {
    onChange(type)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kakav smeštaj tražite?</h2>
        <p className="text-gray-500">Odaberite tip smeštaja</p>
      </div>

      {/* Svejedno - double size, prominent at top */}
      <button
        type="button"
        onClick={() => handleSelect('any' as AccommodationType)}
        className={`
          w-full flex flex-col items-center justify-center p-8 rounded-xl transition-all
          ${
            value === 'any'
              ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
              : 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
          }
        `}
      >
        <span className="text-5xl mb-3">🤷</span>
        <span className="font-semibold text-xl">Svejedno mi je</span>
        <span className={`text-sm mt-1 ${value === 'any' ? 'text-blue-100' : 'text-blue-500'}`}>
          Prikaži sve tipove smeštaja
        </span>
      </button>

      {/* Specific types grid */}
      <div className="grid grid-cols-3 gap-3">
        {SPECIFIC_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value as AccommodationType)}
            className={`
              flex flex-col items-center justify-center p-5 rounded-xl transition-all
              ${
                value === option.value
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            <span className="text-3xl mb-2">{option.icon}</span>
            <span className="font-medium text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
