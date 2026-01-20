'use client'

import type { BoardType } from '@/types'

const SPECIFIC_BOARD_TYPES = [
  { value: 'all_inclusive', label: 'All Inclusive', icon: '🍽️' },
  { value: 'half_board', label: 'Polupansion', icon: '🥘' },
  { value: 'breakfast', label: 'Doručak', icon: '🥐' },
  { value: 'room_only', label: 'Samo noćenje', icon: '🛏️' },
]

interface BoardTypeStepProps {
  value: BoardType | null
  onChange: (board: BoardType) => void
  onNext: () => void
}

export default function BoardTypeStep({ value, onChange, onNext }: BoardTypeStepProps) {
  const handleSelect = (board: BoardType) => {
    onChange(board)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kakva ishrana?</h2>
        <p className="text-gray-500">Odaberite tip ishrane</p>
      </div>

      {/* Svejedno - prominent at top */}
      <button
        type="button"
        onClick={() => handleSelect('any' as BoardType)}
        className={`
          w-full flex flex-col items-center justify-center p-6 rounded-xl transition-all
          ${
            value === 'any'
              ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
              : 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
          }
        `}
      >
        <span className="text-4xl mb-2">🤷</span>
        <span className="font-semibold text-lg">Svejedno mi je</span>
        <span className={`text-sm mt-1 ${value === 'any' ? 'text-blue-100' : 'text-blue-500'}`}>
          Prikaži sve opcije ishrane
        </span>
      </button>

      {/* Specific board types grid */}
      <div className="grid grid-cols-2 gap-3">
        {SPECIFIC_BOARD_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value as BoardType)}
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
