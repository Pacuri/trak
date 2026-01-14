'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

// Popular destinations in Serbia market
const POPULAR_COUNTRIES = [
  { country: 'Grčka', emoji: '🇬🇷' },
  { country: 'Turska', emoji: '🇹🇷' },
  { country: 'Egipat', emoji: '🇪🇬' },
  { country: 'Crna Gora', emoji: '🇲🇪' },
  { country: 'Albanija', emoji: '🇦🇱' },
  { country: 'Hrvatska', emoji: '🇭🇷' },
  { country: 'Španija', emoji: '🇪🇸' },
  { country: 'Italija', emoji: '🇮🇹' },
  { country: 'UAE', emoji: '🇦🇪' },
  { country: 'Tajland', emoji: '🇹🇭' },
  { country: 'Maldivi', emoji: '🇲🇻' },
  { country: 'Tunis', emoji: '🇹🇳' },
]

interface CountryStepProps {
  value: string
  onChange: (country: string) => void
  onNext: () => void
}

export default function CountryStep({ value, onChange, onNext }: CountryStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredCountries = POPULAR_COUNTRIES.filter((d) =>
    d.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCountrySelect = (country: string) => {
    onChange(country)
    // Auto-advance after selection
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gde želite da putujete?</h2>
        <p className="text-gray-500">Izaberite državu</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Pretraži države..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        />
      </div>

      {/* Popular countries grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {filteredCountries.map((destination) => (
          <button
            key={destination.country}
            type="button"
            onClick={() => handleCountrySelect(destination.country)}
            className={`
              flex flex-col items-center justify-center p-4 rounded-xl transition-all
              ${
                value === destination.country
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
              }
            `}
          >
            <span className="text-2xl mb-1">{destination.emoji}</span>
            <span className="text-sm font-medium">{destination.country}</span>
          </button>
        ))}
      </div>

      {/* Custom country input */}
      {searchQuery && !filteredCountries.some((d) => d.country.toLowerCase() === searchQuery.toLowerCase()) && (
        <button
          type="button"
          onClick={() => handleCountrySelect(searchQuery)}
          className="w-full p-4 text-left rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all"
        >
          <span className="text-gray-500">+ Dodaj &quot;{searchQuery}&quot; kao državu</span>
        </button>
      )}
    </div>
  )
}
