'use client'

interface ChildrenStepProps {
  value: number
  onChange: (children: number) => void
  onNext: () => void
}

const CHILD_COUNTS = [0, 1, 2, 3, 4, 5, 6]

export default function ChildrenStep({ value, onChange, onNext }: ChildrenStepProps) {
  const handleSelect = (count: number) => {
    onChange(count)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliko dece?</h2>
        <p className="text-gray-500">Odaberite broj dece (0-17 godina)</p>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-4 gap-3">
        {CHILD_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => handleSelect(count)}
            className={`
              aspect-square flex items-center justify-center rounded-xl text-2xl font-bold transition-all
              ${
                value === count
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : count === 0
                  ? 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            {count}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-xl text-center">
        <p className="text-blue-800">
          <span className="font-semibold">{value}</span>{' '}
          {value === 0
            ? 'dece'
            : value === 1
            ? 'dete'
            : value < 5
            ? 'dece'
            : 'dece'}
        </p>
      </div>
    </div>
  )
}
