'use client'

import type { BoardType } from '@/types'

const BOARD_TYPES = [
  { value: 'all_inclusive', label: 'All Inclusive', icon: '🍽️' },
  { value: 'half_board', label: 'Polupansion', icon: '🥘' },
  { value: 'breakfast', label: 'Doručak', icon: '🥐' },
  { value: 'room_only', label: 'Samo noćenje', icon: '🛏️' },
  { value: 'any', label: 'Svejedno', icon: '🤷' },
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

      {/* Board type grid */}
      <div className="grid grid-cols-2 gap-3">
        {BOARD_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value as BoardType)}
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
            <span className="font-medium text-sm">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
