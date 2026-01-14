'use client'

import { useState, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

interface PopularCity {
  city: string
  isPopular: boolean
}

interface CityStepProps {
  country: string
  value: string | null
  onChange: (city: string | null) => void
  onNext: () => void
}

export default function CityStep({ country, value, onChange, onNext }: CityStepProps) {
  const params = useParams()
  const slug = params.slug as string
  const [searchQuery, setSearchQuery] = useState(value || '')
  const [popularCities, setPopularCities] = useState<PopularCity[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  useEffect(() => {
    const fetchPopularCities = async () => {
      if (!country || !slug) return

      setLoadingCities(true)
      try {
        const response = await fetch(
          `/api/public/agencies/${slug}/cities?country=${encodeURIComponent(country)}`
        )

        if (response.ok) {
          const data = await response.json()
          setPopularCities(data.cities || [])
        }
      } catch (error) {
        console.error('Error fetching popular cities:', error)
      } finally {
        setLoadingCities(false)
      }
    }

    fetchPopularCities()
  }, [country, slug])

  const handleCitySelect = (city: string | null) => {
    onChange(city)
    // Auto-advance after selection
    onNext()
  }

  const handleSkip = () => {
    onChange(null)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Konkretan grad?</h2>
        <p className="text-gray-500">Izaberite grad u {country} (opciono)</p>
      </div>

      {/* Popular cities grid */}
      {loadingCities ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : popularCities.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preporučujemo
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {popularCities.map((cityData) => (
              <button
                key={cityData.city}
                type="button"
                onClick={() => handleCitySelect(cityData.city)}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-xl transition-all
                  ${
                    value === cityData.city
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : cityData.isPopular
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-100 active:scale-95'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:scale-95'
                  }
                `}
              >
                {cityData.isPopular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Popularno
                  </span>
                )}
                <span className="font-medium text-sm text-center">{cityData.city}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* City input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {popularCities.length > 0 ? 'Ili unesite drugi grad' : 'Unesite grad'}
        </label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`npr. grad u ${country}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleCitySelect(searchQuery.trim())
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                onChange(null)
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => handleCitySelect(searchQuery.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
          >
            Potvrdi &quot;{searchQuery.trim()}&quot;
          </button>
        )}
        
        <button
          type="button"
          onClick={handleSkip}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all"
        >
          Preskoči (nije bitno)
        </button>
      </div>
    </div>
  )
}
