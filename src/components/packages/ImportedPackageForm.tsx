'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Check,
  AlertTriangle,
  Star,
  MapPin,
  Bed,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  DollarSign,
  Users,
  Bus,
  FileText,
  Sparkles,
  Waves,
  Building,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { ImportPackageFormData, ImportTransportFormData, BusinessModel, Currency } from '@/types/import'
import { ChildrenPolicyRulesEditor, type ChildrenPolicyRuleFormData } from './ChildrenPolicyRulesEditor'
import { TransportPriceListSelector } from './TransportPriceListSelector'
import { formatCurrency, EXCHANGE_RATES } from '@/types/import'

interface ImportedPackageFormProps {
  package: ImportPackageFormData
  index: number
  currency: Currency
  businessModel: BusinessModel
  marginPercent?: number
  transport?: ImportTransportFormData
  organizationId: string
  onChange: (updates: Partial<ImportPackageFormData>) => void
  onTransportListCreated?: (listId: string) => void
  onImagesChange?: (images: { url: string; is_primary: boolean }[]) => void
}

type Section = 'basic' | 'description' | 'rooms' | 'intervals' | 'prices' | 'children' | 'transport' | 'images'

interface PackageImage {
  id: string
  url: string
  position: number
  is_primary: boolean
}

export function ImportedPackageForm({
  package: pkg,
  index,
  currency,
  businessModel,
  marginPercent,
  transport,
  organizationId,
  onChange,
  onTransportListCreated,
  onImagesChange,
}: ImportedPackageFormProps) {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['basic']))
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [transportListId, setTransportListId] = useState<string | undefined>()
  const [images, setImages] = useState<PackageImage[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleSection = (section: Section) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getSectionStatus = (section: Section): 'complete' | 'warning' | 'error' => {
    switch (section) {
      case 'basic':
        return pkg.hotel_name && pkg.destination_country ? 'complete' : 'error'
      case 'description':
        // Description is optional but show complete if we have generated one
        return pkg.generated_description || pkg.hotel_description ? 'complete' : 'warning'
      case 'rooms':
        return pkg.room_types.length > 0 ? 'complete' : 'error'
      case 'intervals':
        return pkg.price_intervals.length > 0 ? 'complete' : 'error'
      case 'prices':
        return Object.keys(pkg.price_matrix).length > 0 ? 'complete' : 'error'
      case 'children':
        return pkg.children_policies.length > 0 ? 'complete' : 'warning'
      case 'transport':
        return 'complete' // Transport is optional
      case 'images':
        return images.length > 0 ? 'complete' : 'warning'
      default:
        return 'complete'
    }
  }

  // Notify parent of image changes
  const notifyImagesChange = (newImages: PackageImage[]) => {
    onImagesChange?.(newImages.map(img => ({ url: img.url, is_primary: img.is_primary })))
  }

  // Image handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      const newImages: PackageImage[] = []
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          const newImage: PackageImage = {
            id: `new_${Date.now()}_${Math.random()}`,
            url: data.url,
            position: images.length + newImages.length,
            is_primary: images.length === 0 && newImages.length === 0,
          }
          newImages.push(newImage)
        }
      }
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages]
        setImages(updatedImages)
        notifyImagesChange(updatedImages)
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageUrlAdd = () => {
    const url = prompt('Unesite URL slike:')
    if (url && url.trim()) {
      const newImage: PackageImage = {
        id: `new_${Date.now()}`,
        url: url.trim(),
        position: images.length,
        is_primary: images.length === 0,
      }
      const updatedImages = [...images, newImage]
      setImages(updatedImages)
      notifyImagesChange(updatedImages)
    }
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      if (filtered.length > 0 && !filtered.some(img => img.is_primary)) {
        filtered[0].is_primary = true
      }
      notifyImagesChange(filtered)
      return filtered
    })
  }

  const setPrimaryImage = (id: string) => {
    setImages(prev => {
      const updated = prev.map(img => ({
        ...img,
        is_primary: img.id === id,
      }))
      notifyImagesChange(updated)
      return updated
    })
  }

  const SectionHeader = ({ 
    section, 
    title, 
    icon: Icon,
    subtitle,
  }: { 
    section: Section
    title: string
    icon: React.ElementType
    subtitle?: string
  }) => {
    const status = getSectionStatus(section)
    const isExpanded = expandedSections.has(section)

    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className={cn(
          'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
          isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          status === 'complete' ? 'bg-green-100 text-green-600' :
          status === 'warning' ? 'bg-amber-100 text-amber-600' :
          'bg-red-100 text-red-600'
        )}>
          {status === 'complete' ? (
            <Check className="h-4 w-4" />
          ) : status === 'warning' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">{title}</span>
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Package header */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium opacity-80">#{index + 1}</span>
          <h3 className="text-lg font-semibold">{pkg.hotel_name}</h3>
          {pkg.stars && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: pkg.stars }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm opacity-80 mt-1">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {pkg.destination_city ? `${pkg.destination_city}, ` : ''}{pkg.destination_country}
          </span>
          <span>•</span>
          <span>Pouzdanost: {Math.round(pkg.confidence * 100)}%</span>
        </div>
      </div>

      {/* Issues banner */}
      {pkg.issues.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">Potrebna pažnja:</span>
              <ul className="mt-0.5">
                {pkg.issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-gray-100">
        {/* Basic Info */}
        <div>
          <SectionHeader
            section="basic"
            title="Osnovni podaci"
            icon={MapPin}
            subtitle={`${pkg.hotel_name} • ${pkg.destination_country}`}
          />
          {expandedSections.has('basic') && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Naziv hotela *
                  </label>
                  <input
                    type="text"
                    value={pkg.hotel_name}
                    onChange={(e) => onChange({ hotel_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Zvezdice
                  </label>
                  <select
                    value={pkg.stars || ''}
                    onChange={(e) => onChange({ stars: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Bez zvezdica</option>
                    <option value="2">2 ★★</option>
                    <option value="3">3 ★★★</option>
                    <option value="4">4 ★★★★</option>
                    <option value="5">5 ★★★★★</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Država *
                  </label>
                  <input
                    type="text"
                    value={pkg.destination_country}
                    onChange={(e) => onChange({ destination_country: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Grad/Region
                  </label>
                  <input
                    type="text"
                    value={pkg.destination_city || ''}
                    onChange={(e) => onChange({ destination_city: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hotel Description & Amenities */}
        <div>
          <SectionHeader
            section="description"
            title="Opis hotela"
            icon={FileText}
            subtitle={pkg.generated_description ? 'AI generisan opis' : 'Opciono'}
          />
          {expandedSections.has('description') && (
            <div className="px-4 pb-4 space-y-4">
              {/* AI Generated Description */}
              {pkg.generated_description && (
                <div className="relative">
                  <div className="absolute -top-2 left-3 px-2 bg-white">
                    <span className="flex items-center gap-1 text-xs font-medium text-purple-600">
                      <Sparkles className="h-3 w-3" />
                      AI generisan opis
                    </span>
                  </div>
                  <div className="border-2 border-purple-200 rounded-lg p-3 pt-4 bg-purple-50/50">
                    <textarea
                      value={pkg.generated_description}
                      onChange={(e) => onChange({ generated_description: e.target.value })}
                      rows={4}
                      className="w-full bg-transparent text-sm text-gray-700 resize-none focus:outline-none"
                      placeholder="AI generisan opis hotela..."
                    />
                    <p className="text-xs text-purple-500 mt-2">
                      Ovaj opis je automatski generisan. Možete ga izmeniti po potrebi.
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted Description (if different from generated) */}
              {pkg.hotel_description && pkg.hotel_description !== pkg.generated_description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Izvučen opis iz dokumenta
                  </label>
                  <textarea
                    value={pkg.hotel_description}
                    onChange={(e) => onChange({ hotel_description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    placeholder="Opis iz originalnog dokumenta..."
                  />
                </div>
              )}

              {/* Distance info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Waves className="h-4 w-4 text-blue-500" />
                    Udaljenost od plaže (m)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pkg.distance_from_beach || ''}
                    onChange={(e) => onChange({ distance_from_beach: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="npr. 100"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Building className="h-4 w-4 text-gray-500" />
                    Udaljenost od centra (m)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pkg.distance_from_center || ''}
                    onChange={(e) => onChange({ distance_from_center: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="npr. 500"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sadržaji hotela
                </label>
                <div className="flex flex-wrap gap-2">
                  {(pkg.hotel_amenities || []).map((amenity, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-sm"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => {
                          const newAmenities = (pkg.hotel_amenities || []).filter((_, idx) => idx !== i)
                          onChange({ hotel_amenities: newAmenities })
                        }}
                        className="ml-1 text-teal-500 hover:text-teal-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Dodaj sadržaj"
                    className="px-2.5 py-1 border border-dashed border-gray-300 rounded-full text-sm focus:border-teal-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const value = (e.target as HTMLInputElement).value.trim()
                        if (value) {
                          onChange({ hotel_amenities: [...(pkg.hotel_amenities || []), value] })
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pritisnite Enter za dodavanje (npr. bazen, spa, plaža, WiFi, parking)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Room Types */}
        <div>
          <SectionHeader
            section="rooms"
            title="Tipovi soba"
            icon={Bed}
            subtitle={`${pkg.room_types.length} tip${pkg.room_types.length === 1 ? '' : 'a'} soba`}
          />
          {expandedSections.has('rooms') && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {pkg.room_types.map((rt, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <label className="block text-xs text-gray-500 mb-1">Kod</label>
                      <input
                        type="text"
                        value={rt.code}
                        onChange={(e) => {
                          const newRoomTypes = [...pkg.room_types]
                          newRoomTypes[i] = { ...rt, code: e.target.value }
                          onChange({ room_types: newRoomTypes })
                        }}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-semibold text-center focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="flex-1 grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Naziv</label>
                        <input
                          type="text"
                          value={rt.name}
                          onChange={(e) => {
                            const newRoomTypes = [...pkg.room_types]
                            newRoomTypes[i] = { ...rt, name: e.target.value }
                            onChange({ room_types: newRoomTypes })
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max osoba</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={rt.max_persons}
                          onChange={(e) => {
                            const newRoomTypes = [...pkg.room_types]
                            newRoomTypes[i] = { ...rt, max_persons: parseInt(e.target.value) || 1 }
                            onChange({ room_types: newRoomTypes })
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRoomTypes = pkg.room_types.filter((_, idx) => idx !== i)
                        onChange({ room_types: newRoomTypes })
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newCode = `1/${pkg.room_types.length + 2}`
                    onChange({
                      room_types: [
                        ...pkg.room_types,
                        { code: newCode, name: '', max_persons: 2, description: '' }
                      ]
                    })
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-teal-600 border border-dashed border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  + Dodaj tip sobe
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price Intervals */}
        <div>
          <SectionHeader
            section="intervals"
            title="Cenovni intervali"
            icon={Calendar}
            subtitle={`${pkg.price_intervals.length} interval${pkg.price_intervals.length === 1 ? '' : 'a'}`}
          />
          {expandedSections.has('intervals') && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {pkg.price_intervals.map((interval, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 grid gap-2 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Naziv</label>
                        <input
                          type="text"
                          value={interval.name}
                          onChange={(e) => {
                            const newIntervals = [...pkg.price_intervals]
                            newIntervals[i] = { ...interval, name: e.target.value }
                            onChange({ price_intervals: newIntervals })
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Od</label>
                        <input
                          type="date"
                          value={interval.start_date}
                          onChange={(e) => {
                            const newIntervals = [...pkg.price_intervals]
                            newIntervals[i] = { ...interval, start_date: e.target.value }
                            onChange({ price_intervals: newIntervals })
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Do</label>
                        <input
                          type="date"
                          value={interval.end_date}
                          onChange={(e) => {
                            const newIntervals = [...pkg.price_intervals]
                            newIntervals[i] = { ...interval, end_date: e.target.value }
                            onChange({ price_intervals: newIntervals })
                          }}
                          className="py-1.5 focus:border-teal-500 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newIntervals = pkg.price_intervals.filter((_, idx) => idx !== i)
                        onChange({ price_intervals: newIntervals })
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      price_intervals: [
                        ...pkg.price_intervals,
                        { name: `Period ${pkg.price_intervals.length + 1}`, start_date: '', end_date: '' }
                      ]
                    })
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-teal-600 border border-dashed border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  + Dodaj interval
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price Matrix */}
        <div>
          <SectionHeader
            section="prices"
            title="Cene"
            icon={DollarSign}
            subtitle={`${Object.keys(pkg.price_matrix).length} interval${Object.keys(pkg.price_matrix).length === 1 ? '' : 'a'} × ${pkg.room_types.length} soba`}
          />
          {expandedSections.has('prices') && (
            <div className="px-4 pb-4 overflow-x-auto">
              {/* Currency info */}
              <div className="mb-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                <div>
                  Valuta: <strong>{currency}</strong>
                  {currency !== 'EUR' && (
                    <span className="ml-2 text-gray-500">
                      (1 EUR = {EXCHANGE_RATES[currency]} {currency})
                    </span>
                  )}
                  {businessModel === 'vlastita_marza' && marginPercent && (
                    <span className="ml-2 text-green-600">
                      + {marginPercent}% marža
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">Klikni na cenu za izmenu</span>
              </div>

              {/* Price table */}
              {Object.entries(pkg.price_matrix).map(([intervalName, rooms]) => (
                <div key={intervalName} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{intervalName}</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Soba</th>
                        {pkg.meal_plans.map(mp => (
                          <th key={mp} className="px-3 py-2 text-center font-medium text-gray-600">{mp}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rooms).map(([roomCode, meals]) => (
                        <tr key={roomCode} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-900">{roomCode}</td>
                          {pkg.meal_plans.map(mp => (
                            <td key={mp} className="px-1 py-1 text-center">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={meals[mp] ?? ''}
                                onChange={(e) => {
                                  const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value)
                                  const newMatrix = { ...pkg.price_matrix }
                                  newMatrix[intervalName] = { ...newMatrix[intervalName] }
                                  newMatrix[intervalName][roomCode] = { ...newMatrix[intervalName][roomCode] }
                                  if (newValue !== undefined) {
                                    newMatrix[intervalName][roomCode][mp] = newValue
                                  } else {
                                    delete newMatrix[intervalName][roomCode][mp]
                                  }
                                  onChange({ price_matrix: newMatrix })
                                }}
                                className="w-20 rounded border border-gray-200 px-2 py-1 text-sm text-center focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                placeholder="-"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Children Policies */}
        <div>
          <SectionHeader
            section="children"
            title="Politika za decu"
            icon={Users}
            subtitle={`${pkg.children_policies.length} pravil${pkg.children_policies.length === 1 ? 'o' : 'a'}`}
          />
          {expandedSections.has('children') && (
            <div className="px-4 pb-4">
              <ChildrenPolicyRulesEditor
                rules={pkg.children_policies as ChildrenPolicyRuleFormData[]}
                onChange={(rules) => onChange({ children_policies: rules })}
                roomTypeCodes={pkg.room_types.map(rt => rt.code)}
              />
            </div>
          )}
        </div>

        {/* Transport */}
        <div>
          <SectionHeader
            section="transport"
            title="Transport"
            icon={Bus}
            subtitle={transportListId ? 'Izabran cenovnik' : 'Opciono'}
          />
          {expandedSections.has('transport') && (
            <div className="px-4 pb-4">
              <TransportPriceListSelector
                selectedListId={transportListId}
                onSelect={setTransportListId}
                organizationId={organizationId}
                importedTransport={transport}
                onCreateFromImport={(listId) => {
                  setTransportListId(listId)
                  onTransportListCreated?.(listId)
                }}
              />
            </div>
          )}
        </div>

        {/* Images */}
        <div>
          <SectionHeader
            section="images"
            title="Slike"
            icon={ImageIcon}
            subtitle={`${images.length} slik${images.length === 1 ? 'a' : 'e'}`}
          />
          {expandedSections.has('images') && (
            <div className="px-4 pb-4">
              {/* Upload area */}
              <div className="mb-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    uploadingImage
                      ? 'border-teal-300 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 mx-auto text-teal-500 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto text-gray-300" />
                  )}
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {uploadingImage ? 'Učitavam...' : 'Kliknite za upload slika'}
                  </p>
                  <p className="text-xs text-gray-500">ili prevucite slike ovde</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={handleImageUrlAdd}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    ili dodajte URL slike
                  </button>
                </div>
              </div>

              {/* Images grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className={cn(
                        'relative aspect-video rounded-lg overflow-hidden bg-gray-100 group',
                        img.is_primary && 'ring-2 ring-teal-500'
                      )}
                    >
                      <Image
                        src={img.url}
                        alt={`Slika ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {/* Controls overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(img.id)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                            title="Postavi kao glavnu"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                          title="Obriši"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Primary badge */}
                      {img.is_primary && (
                        <span className="absolute top-2 left-2 bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded">
                          Glavna
                        </span>
                      )}
                      {/* Position indicator */}
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Nema učitanih slika</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
