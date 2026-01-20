'use client'

import { useState, useRef } from 'react'
import type { QualificationData } from '@/types'

interface DurationStepProps {
  value: QualificationData['dates']
  onChange: (dates: Partial<QualificationData['dates']>) => void
  onNext: () => void
}

export default function DurationStep({ value, onChange, onNext }: DurationStepProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [customValue, setCustomValue] = useState<string>(
    value.duration !== 7 && value.duration !== 10 ? String(value.duration) : ''
  )
  const [showCustom, setShowCustom] = useState(
    value.duration !== 7 && value.duration !== 10
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDurationSelect = (duration: number) => {
    setShowCustom(false)
    onChange({ duration })

    // Trigger slide animation
    setIsAnimating(true)

    // Auto-advance after animation
    setTimeout(() => {
      onNext()
    }, 200)
  }

  const handleCustomClick = () => {
    setShowCustom(true)
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomValue(val)
    const numVal = parseInt(val, 10)
    if (!isNaN(numVal) && numVal > 0 && numVal <= 30) {
      onChange({ duration: numVal })
    }
  }

  const handleCustomSubmit = () => {
    const numVal = parseInt(customValue, 10)
    if (!isNaN(numVal) && numVal > 0 && numVal <= 30) {
      setIsAnimating(true)
      setTimeout(() => {
        onNext()
      }, 200)
    }
  }

  const isCustomSelected = showCustom || (value.duration !== 7 && value.duration !== 10)

  return (
    <div className={`space-y-6 transition-transform duration-200 ${isAnimating ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliko noći?</h2>
        <p className="text-gray-500">Odaberite trajanje putovanja</p>
      </div>

      {/* Duration options - 7, 10 (Popularno), Custom */}
      <div className="space-y-3">
        {/* 7 nights */}
        <button
          type="button"
          onClick={() => handleDurationSelect(7)}
          className={`
            w-full px-6 py-5 rounded-xl text-center transition-all font-semibold text-lg
            ${
              value.duration === 7 && !showCustom
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
            }
          `}
        >
          7 noći
        </button>

        {/* 10 nights - Popular */}
        <button
          type="button"
          onClick={() => handleDurationSelect(10)}
          className={`
            w-full px-6 py-5 rounded-xl transition-all font-semibold text-lg
            ${
              value.duration === 10 && !showCustom
                ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                : 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
            }
          `}
        >
          <div className="flex items-center justify-center gap-3">
            <span>10 noći</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              value.duration === 10 && !showCustom
                ? 'bg-blue-500 text-white'
                : 'bg-blue-200 text-blue-700'
            }`}>
              Popularno
            </span>
          </div>
        </button>

        {/* Custom input - prominent blue style */}
        {!showCustom ? (
          <button
            type="button"
            onClick={handleCustomClick}
            className={`
              w-full px-6 py-5 rounded-xl transition-all font-semibold text-lg
              ${
                isCustomSelected
                  ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                  : 'bg-blue-100 text-blue-700 border-2 border-blue-400 hover:bg-blue-200 active:scale-95'
              }
            `}
          >
            ✏️ Unesite broj noći
          </button>
        ) : (
          <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-blue-700 text-center">
              Unesite broj noći (1-30)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max="30"
                value={customValue}
                onChange={handleCustomChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomSubmit()
                  }
                }}
                className="flex-1 px-4 py-3 text-xl font-semibold text-center border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="npr. 14"
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customValue || parseInt(customValue, 10) <= 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Dalje
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
