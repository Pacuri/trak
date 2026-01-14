'use client'

import type { AccommodationType } from '@/types'

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'apartment', label: 'Apartman', icon: '🏠' },
  { value: 'villa', label: 'Vila', icon: '🏡' },
  { value: 'any', label: 'Svejedno', icon: '🤷' },
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

      {/* Accommodation type grid */}
      <div className="grid grid-cols-2 gap-3">
        {ACCOMMODATION_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value as AccommodationType)}
            className={`
              flex flex-col items-center justify-center p-6 rounded-xl transition-all
              ${
                value === option.value
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            <span className="text-3xl mb-2">{option.icon}</span>
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
