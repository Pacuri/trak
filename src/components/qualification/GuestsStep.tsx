'use client'

import { Minus, Plus } from 'lucide-react'

interface GuestsStepProps {
  value: { adults: number; children: number; childAges: number[] }
  onChange: (adults: number, children: number, childAges?: number[]) => void
}

export default function GuestsStep({ value, onChange }: GuestsStepProps) {
  const handleAdultsChange = (delta: number) => {
    const newAdults = Math.max(1, Math.min(10, value.adults + delta))
    onChange(newAdults, value.children, value.childAges)
  }

  const handleChildrenChange = (delta: number) => {
    const newChildren = Math.max(0, Math.min(6, value.children + delta))
    const newChildAges =
      newChildren > value.children
        ? [...value.childAges, 5] // Default age 5
        : value.childAges.slice(0, newChildren)
    onChange(value.adults, newChildren, newChildAges)
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...value.childAges]
    newAges[index] = age
    onChange(value.adults, value.children, newAges)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ko putuje?</h2>
        <p className="text-gray-500">Odaberite broj putnika</p>
      </div>

      {/* Adults counter */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <p className="font-medium text-gray-900">Odrasli</p>
          <p className="text-sm text-gray-500">18+ godina</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => handleAdultsChange(-1)}
            disabled={value.adults <= 1}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="w-8 text-center text-xl font-semibold">{value.adults}</span>
          <button
            type="button"
            onClick={() => handleAdultsChange(1)}
            disabled={value.adults >= 10}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Children counter */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <p className="font-medium text-gray-900">Deca</p>
          <p className="text-sm text-gray-500">0-17 godina</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => handleChildrenChange(-1)}
            disabled={value.children <= 0}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="w-8 text-center text-xl font-semibold">{value.children}</span>
          <button
            type="button"
            onClick={() => handleChildrenChange(1)}
            disabled={value.children >= 6}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Child ages */}
      {value.children > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Uzrast dece</p>
          <div className="grid grid-cols-3 gap-3">
            {value.childAges.map((age, index) => (
              <div key={index} className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Dete {index + 1}</label>
                <select
                  value={age}
                  onChange={(e) => handleChildAgeChange(index, Number(e.target.value))}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {Array.from({ length: 18 }, (_, i) => (
                    <option key={i} value={i}>
                      {i} god.
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total summary */}
      <div className="bg-blue-50 p-4 rounded-xl text-center">
        <p className="text-blue-800">
          <span className="font-semibold">{value.adults + value.children}</span>{' '}
          {value.adults + value.children === 1 ? 'putnik' : 'putnika'} ukupno
        </p>
      </div>
    </div>
  )
}
