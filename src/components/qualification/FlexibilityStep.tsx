'use client'

import { useState } from 'react'
import type { QualificationData } from '@/types'

interface FlexibilityStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
}

export default function FlexibilityStep({ value, onChange, onNext }: FlexibilityStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleFlexibilitySelect = (flexible: boolean) => {
    onChange({ flexible })
    
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Fleksibilni ste sa datumima?</h2>
        <p className="text-gray-500">Odaberite opciju</p>
      </div>

      {/* Flexibility options - 2 full-width buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleFlexibilitySelect(true)}
          className={`
            w-full px-6 py-5 rounded-xl text-left transition-all
            ${
              value.flexible === true
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
            }
          `}
        >
          <div className="font-semibold text-lg">Da, ± par dana</div>
          <div className={`text-sm mt-1 ${value.flexible === true ? 'text-blue-100' : 'text-gray-500'}`}>
            Mogu da prilagodim datum za nekoliko dana
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleFlexibilitySelect(false)}
          className={`
            w-full px-6 py-5 rounded-xl text-left transition-all
            ${
              value.flexible === false
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
            }
          `}
        >
          <div className="font-semibold text-lg">Imam tačan termin</div>
          <div className={`text-sm mt-1 ${value.flexible === false ? 'text-blue-100' : 'text-gray-500'}`}>
            Datum mora biti tačno kako sam izabrao
          </div>
        </button>
      </div>
    </div>
  )
}
