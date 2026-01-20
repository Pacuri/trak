'use client'

import { useEffect, useState } from 'react'

interface ChildAgesStepProps {
  childCount: number
  value: number[]
  onChange: (ages: number[]) => void
  onNext: () => void
}

// Age options from 0 to 17
const AGE_OPTIONS = Array.from({ length: 18 }, (_, i) => i)

export default function ChildAgesStep({ childCount, value, onChange, onNext }: ChildAgesStepProps) {
  // Track which ages have been explicitly selected
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Initialize ages array if needed
  useEffect(() => {
    if (value.length !== childCount) {
      // Initialize with default ages (e.g., 5 years old)
      const initialAges = Array(childCount).fill(5)
      onChange(initialAges)
    }
  }, [childCount, value.length, onChange])

  const handleAgeChange = (index: number, age: number) => {
    const newAges = [...value]
    newAges[index] = age
    onChange(newAges)

    // Track that this index was explicitly selected
    const newSelected = new Set(selectedIndices)
    newSelected.add(index)
    setSelectedIndices(newSelected)
  }

  // All ages must be explicitly selected to proceed
  const allSelected = selectedIndices.size === childCount

  const getChildLabel = (index: number): string => {
    if (childCount === 1) return 'Dete'
    const ordinals = ['Prvo', 'Drugo', 'Treće', 'Četvrto', 'Peto', 'Šesto']
    return `${ordinals[index] || `${index + 1}.`} dete`
  }

  const formatAge = (age: number): string => {
    if (age === 0) return 'Beba (< 1 god)'
    if (age === 1) return '1 godina'
    if (age < 5) return `${age} godine`
    return `${age} godina`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Koliko godina {childCount === 1 ? 'ima dete' : 'imaju deca'}?
        </h2>
        <p className="text-gray-500">
          Starost dece utiče na cenu (mnogi hoteli nude popuste)
        </p>
      </div>

      {/* Age selectors for each child */}
      <div className="space-y-4">
        {Array.from({ length: childCount }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getChildLabel(index)}
            </label>

            {/* Age buttons grid */}
            <div className="grid grid-cols-6 gap-2">
              {AGE_OPTIONS.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => handleAgeChange(index, age)}
                  className={`
                    py-2 px-1 rounded-lg text-sm font-medium transition-all
                    ${
                      value[index] === age
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    }
                  `}
                >
                  {age}
                </button>
              ))}
            </div>

            {/* Selected age display */}
            <div className="mt-2 text-center">
              <span className="text-sm text-blue-600 font-medium">
                {formatAge(value[index] ?? 5)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info about discounts */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Savet:</span> Deca do 2 godine često putuju besplatno,
          a za decu od 2-12 godina mnogi hoteli nude značajne popuste (30-70%).
        </p>
      </div>

      {/* Progress indicator */}
      {childCount > 1 && !allSelected && (
        <div className="text-center text-sm text-gray-500">
          {selectedIndices.size} od {childCount} uzrasta odabrano
        </div>
      )}

      {/* Continue button - only enabled when all ages are selected */}
      <button
        type="button"
        onClick={onNext}
        disabled={!allSelected}
        className={`
          w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all
          ${
            allSelected
              ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {allSelected ? 'Dalje' : `Odaberite uzrast za ${childCount === 1 ? 'dete' : 'svu decu'}`}
      </button>
    </div>
  )
}
