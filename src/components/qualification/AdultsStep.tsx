'use client'

interface AdultsStepProps {
  value: number
  onChange: (adults: number) => void
  onNext: () => void
}

const ADULT_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function AdultsStep({ value, onChange, onNext }: AdultsStepProps) {
  const handleSelect = (count: number) => {
    onChange(count)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Koliko odraslih?</h2>
        <p className="text-gray-500">Odaberite broj odraslih osoba (18+ godina)</p>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-5 gap-3">
        {ADULT_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => handleSelect(count)}
            className={`
              aspect-square flex items-center justify-center rounded-xl text-2xl font-bold transition-all
              ${
                value === count
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            {count}
          </button>
        ))}
      </div>

      {/* Summary */}
      {value > 0 && (
        <div className="bg-blue-50 p-4 rounded-xl text-center">
          <p className="text-blue-800">
            <span className="font-semibold">{value}</span>{' '}
            {value === 1 ? 'odrasla osoba' : value < 5 ? 'odrasle osobe' : 'odraslih osoba'}
          </p>
        </div>
      )}
    </div>
  )
}
