'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Calendar, Loader2, Star, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Package, PackageType, PackageFormData, DepartureFormData, MealPlan, TransportType } from '@/types/packages'
import { 
  PACKAGE_UI_TEXT, 
  MEAL_PLAN_LABELS, 
  TRANSPORT_LABELS,
  DAY_OF_WEEK_LABELS,
} from '@/lib/package-labels'
import { PackageTypeSelector } from './PackageTypeSelector'
import { DepartureRow } from './DepartureRow'
import { GenerateDeparturesDialog } from './GenerateDeparturesDialog'

interface PackageFormProps {
  initialData?: Package
  mode: 'create' | 'edit'
  onSubmit: (data: PackageFormData) => Promise<Package | null>
  loading?: boolean
}

export function PackageForm({ initialData, mode, onSubmit, loading }: PackageFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<PackageFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    destination_country: initialData?.destination_country || '',
    destination_city: initialData?.destination_city || '',
    hotel_name: initialData?.hotel_name || '',
    hotel_stars: initialData?.hotel_stars || undefined,
    package_type: initialData?.package_type || 'fiksni',
    board_type: initialData?.board_type || undefined,
    transport_type: initialData?.transport_type || undefined,
    departure_location: initialData?.departure_location || '',
    rental_period_start: initialData?.rental_period_start || '',
    rental_period_end: initialData?.rental_period_end || '',
    departure_pattern: initialData?.departure_pattern || 'weekly',
    departure_day: initialData?.departure_day ?? 6, // Saturday by default
    default_duration: initialData?.default_duration || 7,
    default_capacity: initialData?.default_capacity || 40,
    price_from: initialData?.price_from || undefined,
    is_featured: initialData?.is_featured || false,
    images: initialData?.images?.map(img => img.url) || [],
    departures: initialData?.departures?.map(d => ({
      id: d.id,
      departure_date: d.departure_date,
      return_date: d.return_date,
      departure_time: d.departure_time || '',
      price_override: d.price_override,
      original_price: d.original_price,
      child_price: d.child_price,
      total_spots: d.total_spots,
    })) || [],
    // New pricing system fields (empty defaults for legacy form)
    apartments: [],
    room_types: [],
    price_intervals: [],
    children_policies: [],
    shifts: [],
  })
  
  const [newImageUrl, setNewImageUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const result = await onSubmit(formData)
      if (result) {
        router.push('/dashboard/packages')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = <K extends keyof PackageFormData>(field: K, value: PackageFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addDeparture = () => {
    const defaultDuration = formData.default_duration || 7
    const today = new Date()
    const departureDate = today.toISOString().split('T')[0]
    const returnDate = new Date(today.getTime() + defaultDuration * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    
    updateField('departures', [
      ...formData.departures,
      {
        departure_date: departureDate,
        return_date: returnDate,
        total_spots: formData.package_type === 'fiksni' ? formData.default_capacity : undefined,
      }
    ])
  }

  const updateDeparture = (index: number, data: Partial<DepartureFormData>) => {
    const newDepartures = [...formData.departures]
    newDepartures[index] = { ...newDepartures[index], ...data }
    updateField('departures', newDepartures)
  }

  const removeDeparture = (index: number) => {
    updateField('departures', formData.departures.filter((_, i) => i !== index))
  }

  const handleGenerated = (_count: number) => {
    // Generated departures are stored via API; parent may refetch. No local merge.
  }

  const addImage = () => {
    if (newImageUrl.trim()) {
      updateField('images', [...formData.images, newImageUrl.trim()])
      setNewImageUrl('')
    }
  }

  const removeImage = (index: number) => {
    updateField('images', formData.images.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? PACKAGE_UI_TEXT.create_title : PACKAGE_UI_TEXT.edit_title}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {mode === 'create' 
              ? 'Kreirajte novi paket sa polascima' 
              : 'Izmenite detalje paketa'}
          </p>
        </div>
      </div>
      
      {/* Package Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{PACKAGE_UI_TEXT.type_label}</h2>
        <PackageTypeSelector
          value={formData.package_type}
          onChange={(value) => updateField('package_type', value)}
          disabled={mode === 'edit'}
        />
      </div>
      
      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{PACKAGE_UI_TEXT.basic_info}</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.name_label} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              placeholder={PACKAGE_UI_TEXT.name_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.description_label}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder={PACKAGE_UI_TEXT.description_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.country_label} *
            </label>
            <input
              type="text"
              value={formData.destination_country}
              onChange={(e) => updateField('destination_country', e.target.value)}
              required
              placeholder={PACKAGE_UI_TEXT.country_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.city_label}
            </label>
            <input
              type="text"
              value={formData.destination_city}
              onChange={(e) => updateField('destination_city', e.target.value)}
              placeholder={PACKAGE_UI_TEXT.city_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.hotel_label}
            </label>
            <input
              type="text"
              value={formData.hotel_name}
              onChange={(e) => updateField('hotel_name', e.target.value)}
              placeholder={PACKAGE_UI_TEXT.hotel_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.stars_label}
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateField('hotel_stars', star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      formData.hotel_stars && star <= formData.hotel_stars
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
              {formData.hotel_stars && (
                <button
                  type="button"
                  onClick={() => updateField('hotel_stars', undefined)}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  Obriši
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Travel Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{PACKAGE_UI_TEXT.travel_details}</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.meal_label}
            </label>
            <select
              value={formData.board_type || ''}
              onChange={(e) => updateField('board_type', e.target.value as MealPlan || undefined)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Izaberi...</option>
              {Object.entries(MEAL_PLAN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.transport_label}
            </label>
            <select
              value={formData.transport_type || ''}
              onChange={(e) => updateField('transport_type', e.target.value as TransportType || undefined)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Izaberi...</option>
              {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {PACKAGE_UI_TEXT.departure_location_label}
            </label>
            <input
              type="text"
              value={formData.departure_location}
              onChange={(e) => updateField('departure_location', e.target.value)}
              placeholder={PACKAGE_UI_TEXT.departure_location_placeholder}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
        </div>
        
        {/* Fiksni-specific fields */}
        {formData.package_type === 'fiksni' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Podešavanja zakupa</h3>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  {PACKAGE_UI_TEXT.departure_day_label}
                </label>
                <select
                  value={formData.departure_day ?? 6}
                  onChange={(e) => updateField('departure_day', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  {PACKAGE_UI_TEXT.default_duration_label}
                </label>
                <input
                  type="number"
                  value={formData.default_duration || 7}
                  onChange={(e) => updateField('default_duration', parseInt(e.target.value) || 7)}
                  min={1}
                  max={30}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  {PACKAGE_UI_TEXT.default_capacity_label}
                </label>
                <input
                  type="number"
                  value={formData.default_capacity || 40}
                  onChange={(e) => updateField('default_capacity', parseInt(e.target.value) || 40)}
                  min={1}
                  max={500}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">
                  {PACKAGE_UI_TEXT.price_from_label}
                </label>
                <input
                  type="number"
                  value={formData.price_from || ''}
                  onChange={(e) => updateField('price_from', parseFloat(e.target.value) || undefined)}
                  min={0}
                  placeholder="Opciono"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => updateField('is_featured', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
            />
            <span className="text-sm text-gray-700">{PACKAGE_UI_TEXT.featured_label}</span>
          </label>
        </div>
      </div>
      
      {/* Departures */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{PACKAGE_UI_TEXT.departures}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addDeparture}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {PACKAGE_UI_TEXT.add_departure}
            </button>
            {formData.package_type === 'fiksni' && initialData?.id && (
              <button
                type="button"
                onClick={() => setShowGenerateDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <Calendar className="h-4 w-4" />
                {PACKAGE_UI_TEXT.generate_weekly}
              </button>
            )}
          </div>
        </div>
        
        {formData.departures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{PACKAGE_UI_TEXT.no_departures}</p>
            <p className="text-sm mt-1">{PACKAGE_UI_TEXT.no_departures_description}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Polazak</div>
              <div className="col-span-3">Povratak</div>
              {formData.package_type === 'fiksni' && (
                <div className="col-span-2">Mesta</div>
              )}
              <div className={formData.package_type === 'fiksni' ? "col-span-2" : "col-span-4"}>
                Cena (€)
              </div>
              <div className="col-span-2"></div>
            </div>
            
            {/* Rows */}
            {formData.departures.map((departure, index) => (
              <DepartureRow
                key={index}
                departure={departure}
                index={index}
                packageType={formData.package_type}
                onUpdate={updateDeparture}
                onRemove={removeDeparture}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Images */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{PACKAGE_UI_TEXT.images}</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Unesite URL slike..."
                className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <button
              type="button"
              onClick={addImage}
              disabled={!newImageUrl.trim()}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {formData.images.map((url, index) => (
                <div key={index} className="relative group aspect-video">
                  <img
                    src={url}
                    alt={`Slika ${index + 1}`}
                    className={cn(
                      'h-full w-full rounded-lg object-cover',
                      index === 0 && 'ring-2 ring-teal-500'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && (
                    <span className="absolute top-1 left-1 bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Glavna
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {PACKAGE_UI_TEXT.cancel_button}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {(isSubmitting || loading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting || loading ? PACKAGE_UI_TEXT.saving : PACKAGE_UI_TEXT.save_button}
        </button>
      </div>
      
      {/* Generate Dialog */}
      <GenerateDeparturesDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        packageId={initialData?.id ?? ''}
        packageType={formData.package_type}
        onGenerated={handleGenerated}
      />
    </form>
  )
}
