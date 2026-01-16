'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ApartmentFormData, ApartmentType } from '@/types/packages'
import { Plus, Trash2, Home, ChevronDown, ChevronUp } from 'lucide-react'

interface ApartmentsConfigProps {
  apartments: ApartmentFormData[]
  onChange: (apartments: ApartmentFormData[]) => void
}

const APARTMENT_TYPES: { value: ApartmentType; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'apartman', label: 'Apartman' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'vila', label: 'Vila' },
  { value: 'soba', label: 'Soba' },
]

const AMENITIES_OPTIONS = [
  'WiFi',
  'AC',
  'TV',
  'Parking',
  'Bazen',
  'Terasa',
  'Perilica',
  'Sušilica',
]

export function ApartmentsConfig({ apartments, onChange }: ApartmentsConfigProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    apartments.length > 0 ? 0 : null
  )

  const addApartment = () => {
    const newApartment: ApartmentFormData = {
      name: `Apartman ${apartments.length + 1}`,
      apartment_type: 'apartman',
      max_persons: 4,
      bedrooms: 1,
      has_kitchen: true,
      has_balcony: false,
      has_sea_view: false,
      amenities: [],
      total_units: 1,
    }
    onChange([...apartments, newApartment])
    setExpandedIndex(apartments.length)
  }

  const updateApartment = (index: number, data: Partial<ApartmentFormData>) => {
    const newApartments = [...apartments]
    newApartments[index] = { ...newApartments[index], ...data }
    onChange(newApartments)
  }

  const removeApartment = (index: number) => {
    onChange(apartments.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  const toggleAmenity = (index: number, amenity: string) => {
    const apt = apartments[index]
    const amenities = apt.amenities || []
    if (amenities.includes(amenity)) {
      updateApartment(index, { amenities: amenities.filter(a => a !== amenity) })
    } else {
      updateApartment(index, { amenities: [...amenities, amenity] })
    }
  }

  const totalUnits = apartments.reduce((sum, apt) => sum + (apt.total_units || 1), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Apartmani</h3>
          <p className="text-sm text-gray-500">
            Ukupno: {totalUnits} {totalUnits === 1 ? 'jedinica' : 'jedinica'}
          </p>
        </div>
        <button
          type="button"
          onClick={addApartment}
          className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Dodaj apartman
        </button>
      </div>

      {apartments.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Home className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Nema apartmana</p>
          <p className="text-xs text-gray-400">Dodajte apartmane koji su dostupni u okviru objekta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apartments.map((apt, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-teal-50 p-2">
                    <Home className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{apt.name}</h4>
                    <p className="text-sm text-gray-500">
                      {APARTMENT_TYPES.find(t => t.value === apt.apartment_type)?.label} • Max {apt.max_persons} osoba • {apt.total_units || 1} jed.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeApartment(index)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedIndex === index && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Naziv
                      </label>
                      <input
                        type="text"
                        value={apt.name}
                        onChange={(e) => updateApartment(index, { name: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tip
                      </label>
                      <select
                        value={apt.apartment_type}
                        onChange={(e) => updateApartment(index, { apartment_type: e.target.value as ApartmentType })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        {APARTMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max osoba
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={apt.max_persons}
                        onChange={(e) => updateApartment(index, { max_persons: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Broj spavaćih soba
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={apt.bedrooms || 1}
                        onChange={(e) => updateApartment(index, { bedrooms: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Broj jedinica
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={apt.total_units || 1}
                        onChange={(e) => updateApartment(index, { total_units: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Opis ležajeva
                    </label>
                    <input
                      type="text"
                      value={apt.beds_description || ''}
                      onChange={(e) => updateApartment(index, { beds_description: e.target.value })}
                      placeholder="npr. 1 bračni + 2 pomoćna kreveta"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Karakteristike
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={apt.has_kitchen}
                          onChange={(e) => updateApartment(index, { has_kitchen: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                        />
                        <span className="text-sm text-gray-600">Kuhinja</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={apt.has_balcony}
                          onChange={(e) => updateApartment(index, { has_balcony: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                        />
                        <span className="text-sm text-gray-600">Balkon</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={apt.has_sea_view}
                          onChange={(e) => updateApartment(index, { has_sea_view: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                        />
                        <span className="text-sm text-gray-600">Pogled na more</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dodatni sadržaji
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AMENITIES_OPTIONS.map((amenity) => (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(index, amenity)}
                          className={cn(
                            'rounded-full px-3 py-1 text-sm transition-colors',
                            apt.amenities?.includes(amenity)
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
