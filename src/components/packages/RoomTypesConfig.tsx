'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { RoomTypeFormData } from '@/types/packages'
import { Plus, Trash2, Bed, ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react'

interface RoomTypesConfigProps {
  roomTypes: RoomTypeFormData[]
  onChange: (roomTypes: RoomTypeFormData[]) => void
}

// Common hotel room type presets
const ROOM_TYPE_PRESETS = [
  { code: '1/1', name: 'Jednokrevetna', max_persons: 1 },
  { code: '1/2', name: 'Dvokrevetna', max_persons: 2 },
  { code: '1/3', name: 'Trokrevetna', max_persons: 3 },
  { code: '1/4', name: 'Četvorokrevetna', max_persons: 4 },
  { code: '1/2+1', name: 'Dvokrevetna + pomoćni', max_persons: 3 },
  { code: '1/2+2', name: 'Dvokrevetna + 2 pomoćna', max_persons: 4 },
]

export function RoomTypesConfig({ roomTypes, onChange }: RoomTypesConfigProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    roomTypes.length > 0 ? 0 : null
  )
  const [showPresets, setShowPresets] = useState(false)
  const [newImageUrls, setNewImageUrls] = useState<Record<number, string>>({})

  const addRoomType = (preset?: typeof ROOM_TYPE_PRESETS[0]) => {
    const newRoomType: RoomTypeFormData = preset
      ? { ...preset, description: '', images: [] }
      : {
          code: `1/${roomTypes.length + 2}`,
          name: `Tip sobe ${roomTypes.length + 1}`,
          max_persons: 2,
          description: '',
          images: [],
        }
    onChange([...roomTypes, newRoomType])
    setExpandedIndex(roomTypes.length)
    setShowPresets(false)
  }

  const updateRoomType = (index: number, data: Partial<RoomTypeFormData>) => {
    const newRoomTypes = [...roomTypes]
    newRoomTypes[index] = { ...newRoomTypes[index], ...data }
    onChange(newRoomTypes)
  }

  const removeRoomType = (index: number) => {
    onChange(roomTypes.filter((_, i) => i !== index))
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  // Image management
  const addImage = (index: number) => {
    const url = newImageUrls[index]?.trim()
    if (!url) return
    const currentImages = roomTypes[index].images || []
    updateRoomType(index, { images: [...currentImages, url] })
    setNewImageUrls({ ...newImageUrls, [index]: '' })
  }

  const removeImage = (roomIndex: number, imageIndex: number) => {
    const currentImages = roomTypes[roomIndex].images || []
    updateRoomType(roomIndex, {
      images: currentImages.filter((_, i) => i !== imageIndex)
    })
  }

  // Check which presets are already used
  const usedCodes = new Set(roomTypes.map(rt => rt.code))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tipovi soba</h3>
          <p className="text-sm text-gray-500">
            Definišite tipove soba dostupne u hotelu
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Dodaj tip sobe
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Presets dropdown */}
          {showPresets && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-10">
              <div className="p-2">
                <p className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
                  Predefnisani tipovi
                </p>
                {ROOM_TYPE_PRESETS.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    disabled={usedCodes.has(preset.code)}
                    onClick={() => addRoomType(preset)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      usedCodes.has(preset.code)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span>
                      <span className="font-medium">{preset.code}</span>
                      <span className="ml-2 text-gray-500">{preset.name}</span>
                    </span>
                    <span className="text-gray-400 text-xs">{preset.max_persons} os.</span>
                  </button>
                ))}
                <hr className="my-2 border-gray-100" />
                <button
                  type="button"
                  onClick={() => addRoomType()}
                  className="w-full px-3 py-2 rounded-lg text-sm text-left text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  + Prilagođeni tip sobe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {showPresets && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowPresets(false)}
        />
      )}

      {roomTypes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Bed className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Nema tipova soba</p>
          <p className="text-xs text-gray-400">
            Dodajte tipove soba (npr. 1/2, 1/3, 1/4) za ovaj hotel
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {roomTypes.map((roomType, index) => (
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
                  <div className="rounded-lg bg-blue-50 p-2">
                    <Bed className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      <span className="text-blue-600 font-semibold">{roomType.code}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      {roomType.name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Max {roomType.max_persons} osoba</span>
                      {roomType.images && roomType.images.length > 0 && (
                        <span className="flex items-center gap-1 text-teal-600">
                          <ImageIcon className="h-3 w-3" />
                          {roomType.images.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRoomType(index)
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
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Kod
                      </label>
                      <input
                        type="text"
                        value={roomType.code}
                        onChange={(e) => updateRoomType(index, { code: e.target.value })}
                        placeholder="npr. 1/2, 1/3"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Naziv
                      </label>
                      <input
                        type="text"
                        value={roomType.name}
                        onChange={(e) => updateRoomType(index, { name: e.target.value })}
                        placeholder="npr. Dvokrevetna soba"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Max osoba
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={roomType.max_persons}
                        onChange={(e) => updateRoomType(index, { max_persons: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Opis (opciono)
                    </label>
                    <textarea
                      value={roomType.description || ''}
                      onChange={(e) => updateRoomType(index, { description: e.target.value })}
                      rows={2}
                      placeholder="npr. Soba sa francuskim ležajem ili twin kreveti..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>

                  {/* Images section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ImageIcon className="inline-block w-4 h-4 mr-1" />
                      Slike sobe
                    </label>
                    <div className="space-y-3">
                      {/* Image URL input */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="url"
                            value={newImageUrls[index] || ''}
                            onChange={(e) => setNewImageUrls({ ...newImageUrls, [index]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage(index))}
                            placeholder="Unesite URL slike..."
                            className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => addImage(index)}
                          disabled={!newImageUrls[index]?.trim()}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Image gallery */}
                      {roomType.images && roomType.images.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {roomType.images.map((imageUrl, imgIndex) => (
                            <div key={imgIndex} className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={imageUrl}
                                alt={`${roomType.name} ${imgIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index, imgIndex)}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {imgIndex === 0 && (
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-xs bg-teal-600 text-white rounded">
                                  Glavna
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Nema slika. Dodajte URL-ove slika za ovaj tip sobe.
                        </p>
                      )}
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
