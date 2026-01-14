'use client'

import { useState } from 'react'
import type { QualificationData } from '@/types'

const DURATION_OPTIONS = [
  { value: 5, label: '3-5 noći', description: 'Kratak odmor' },
  { value: 7, label: '7 noći', description: 'Nedeljni odmor', popular: true },
  { value: 12, label: '10-14 noći', description: 'Duži odmor' },
]

interface DurationStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
}

export default function DurationStep({ value, onChange, onNext }: DurationStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleDurationSelect = (duration: number) => {
    onChange({ duration })
    
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliko noći?</h2>
        <p className="text-gray-500">Odaberite trajanje putovanja</p>
      </div>

      {/* Duration options - 3 vertical full-width buttons */}
      <div className="space-y-3">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleDurationSelect(option.value)}
            className={`
              w-full px-6 py-5 rounded-xl text-left transition-all
              ${
                value.duration === option.value
                  ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                  : option.popular
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{option.label}</div>
                <div className={`text-sm mt-1 ${value.duration === option.value ? 'text-blue-100' : 'text-gray-500'}`}>
                  {option.description}
                </div>
              </div>
              {option.popular && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  value.duration === option.value 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-200 text-blue-700'
                }`}>
                  Popularno
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
