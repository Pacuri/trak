'use client'

import type { TransportType } from '@/types'

const TRANSPORT_TYPES = [
  { value: 'flight', label: 'Avionom', icon: '✈️' },
  { value: 'bus', label: 'Autobusom', icon: '🚌' },
  { value: 'own', label: 'Sopstveni prevoz', icon: '🚗' },
]

interface TransportTypeStepProps {
  value: TransportType | null
  onChange: (transport: TransportType) => void
  onNext: () => void
}

export default function TransportTypeStep({ value, onChange, onNext }: TransportTypeStepProps) {
  const handleSelect = (transport: TransportType) => {
    onChange(transport)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kakav prevoz?</h2>
        <p className="text-gray-500">Odaberite tip prevoza</p>
      </div>

      {/* Transport type grid */}
      <div className="grid grid-cols-3 gap-3">
        {TRANSPORT_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value as TransportType)}
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
            <span className="font-medium text-sm text-center">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
