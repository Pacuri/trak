'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type {
  Package,
  PackageType,
  PackageFormData,
  SaleMode,
  MealPlanCode,
  ApartmentFormData,
  RoomTypeFormData,
  PriceIntervalFormData,
  ChildrenPolicyFormData,
  ShiftFormData,
  TransportType,
} from '@/types/packages'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Home,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Bus,
  Image as ImageIcon,
  Eye,
  X,
  Plus,
} from 'lucide-react'

// Import all configuration components
import { PackageTypeSelector } from './PackageTypeSelector'
import { SaleModeSelector } from './SaleModeSelector'
import { ApartmentsConfig } from './ApartmentsConfig'
import { FiksniPricing } from './FiksniPricing'
import { ShiftsConfig } from './ShiftsConfig'
import { RoomTypesConfig } from './RoomTypesConfig'
import { HotelPriceMatrix } from './HotelPriceMatrix'
import { ChildrenPolicyConfig } from './ChildrenPolicyConfig'
import { PriceImageUpload } from './PriceImageUpload'

interface PackageFormWizardProps {
  initialData?: Package
  mode: 'create' | 'edit'
  onSubmit: (data: PackageFormData) => Promise<Package | null>
  loading?: boolean
  onBack?: () => void // Go back to method selector (create mode only)
}

type WizardStep = {
  id: string
  label: string
  icon: React.ReactNode
  showFor?: 'fiksni' | 'na_upit' | 'both'
  condition?: (data: PackageFormData) => boolean
}

const MEAL_PLAN_OPTIONS: { value: MealPlanCode; label: string }[] = [
  { value: 'ND', label: 'Noćenje (ND)' },
  { value: 'BB', label: 'Doručak (BB)' },
  { value: 'HB', label: 'Polupansion (HB)' },
  { value: 'FB', label: 'Pun pansion (FB)' },
  { value: 'AI', label: 'All Inclusive (AI)' },
]

export function PackageFormWizard({ initialData, mode, onSubmit, loading, onBack }: PackageFormWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')

  // Form state
  const [formData, setFormData] = useState<PackageFormData>(() => ({
    name: initialData?.name || '',
    description: initialData?.description || '',
    destination_country: initialData?.destination_country || '',
    destination_city: initialData?.destination_city || '',
    hotel_name: initialData?.hotel_name || '',
    hotel_stars: initialData?.hotel_stars || undefined,
    accommodation_name: initialData?.accommodation_name || '',
    package_type: initialData?.package_type || 'fiksni',
    sale_mode: initialData?.sale_mode || undefined,
    rental_period_start: initialData?.rental_period_start || '',
    rental_period_end: initialData?.rental_period_end || '',
    available_from: initialData?.available_from || '',
    available_to: initialData?.available_to || '',
    transport_type: initialData?.transport_type || undefined,
    departure_location: initialData?.departure_location || '',
    meal_plans: initialData?.meal_plans || [],
    transport_price_fixed: initialData?.transport_price_fixed || false,
    transport_price_per_person: initialData?.transport_price_per_person || undefined,
    allow_own_transport: initialData?.allow_own_transport || false,
    price_from: initialData?.price_from || undefined,
    is_featured: initialData?.is_featured || false,
    is_published: initialData?.is_published || false,
    images: initialData?.images?.map(img => img.url) || [],
    departures: [],
    apartments: initialData?.apartments?.map(apt => ({
      id: apt.id,
      name: apt.name,
      apartment_type: apt.apartment_type,
      max_persons: apt.max_persons,
      max_adults: apt.max_adults,
      max_children: apt.max_children,
      bedrooms: apt.bedrooms,
      beds_description: apt.beds_description,
      has_kitchen: apt.has_kitchen,
      has_balcony: apt.has_balcony,
      has_sea_view: apt.has_sea_view,
      amenities: apt.amenities,
      total_units: apt.total_units,
    })) || [],
    room_types: initialData?.room_types?.map(rt => ({
      id: rt.id,
      code: rt.code,
      name: rt.name,
      max_persons: rt.max_persons,
      description: rt.description,
    })) || [],
    price_intervals: initialData?.price_intervals?.map(interval => ({
      id: interval.id,
      name: interval.name,
      start_date: interval.start_date,
      end_date: interval.end_date,
    })) || [],
    children_policies: initialData?.children_policies?.map(policy => ({
      id: policy.id,
      age_from: policy.age_from,
      age_to: policy.age_to,
      discount_type: policy.discount_type,
      discount_value: policy.discount_value,
      label: policy.label,
    })) || [],
    shifts: initialData?.shifts?.map(shift => ({
      id: shift.id,
      name: shift.name,
      start_date: shift.start_date,
      end_date: shift.end_date,
      transport_price_per_person: shift.transport_price_per_person,
      transport_included: shift.transport_included,
      capacity: shift.capacity,
      booked: shift.booked,
      status: shift.status,
    })) || [],
  }))

  // Define wizard steps
  const allSteps: WizardStep[] = [
    { id: 'type', label: 'Tip', icon: <Building2 className="h-5 w-5" />, showFor: 'both' },
    { id: 'basic', label: 'Osnovni podaci', icon: <MapPin className="h-5 w-5" />, showFor: 'both' },
    { 
      id: 'sale_mode', 
      label: 'Način prodaje', 
      icon: <Users className="h-5 w-5" />, 
      showFor: 'fiksni' 
    },
    { 
      id: 'apartments', 
      label: 'Apartmani', 
      icon: <Home className="h-5 w-5" />, 
      showFor: 'fiksni' 
    },
    { 
      id: 'room_types', 
      label: 'Tipovi soba', 
      icon: <Building2 className="h-5 w-5" />, 
      showFor: 'na_upit' 
    },
    { id: 'pricing', label: 'Cene', icon: <DollarSign className="h-5 w-5" />, showFor: 'both' },
    { 
      id: 'children', 
      label: 'Deca', 
      icon: <Users className="h-5 w-5" />, 
      showFor: 'na_upit' 
    },
    { 
      id: 'shifts', 
      label: 'Smene', 
      icon: <Calendar className="h-5 w-5" />, 
      showFor: 'fiksni',
      condition: (data) => data.sale_mode === 'GRUPNO_SMENA'
    },
    { id: 'transport', label: 'Prevoz', icon: <Bus className="h-5 w-5" />, showFor: 'both' },
    { id: 'images', label: 'Slike', icon: <ImageIcon className="h-5 w-5" />, showFor: 'both' },
    { id: 'review', label: 'Pregled', icon: <Eye className="h-5 w-5" />, showFor: 'both' },
  ]

  // Filter steps based on package type and conditions
  const activeSteps = allSteps.filter(step => {
    if (step.showFor === 'both') return true
    if (step.showFor === formData.package_type) {
      if (step.condition) return step.condition(formData)
      return true
    }
    return false
  })

  const currentStepConfig = activeSteps[currentStep]

  const updateField = <K extends keyof PackageFormData>(field: K, value: PackageFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleMealPlan = (mp: MealPlanCode) => {
    const current = formData.meal_plans || []
    if (current.includes(mp)) {
      updateField('meal_plans', current.filter(m => m !== mp))
    } else {
      updateField('meal_plans', [...current, mp])
    }
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

  const handleNext = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
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

  const handlePriceImageImport = (data: {
    intervals?: PriceIntervalFormData[]
    roomTypes?: RoomTypeFormData[]
    childrenPolicies?: ChildrenPolicyFormData[]
  }) => {
    if (data.roomTypes?.length) {
      updateField('room_types', data.roomTypes)
    }
    if (data.intervals?.length) {
      updateField('price_intervals', data.intervals)
    }
    if (data.childrenPolicies?.length) {
      updateField('children_policies', data.childrenPolicies)
    }
  }

  const renderStepContent = () => {
    switch (currentStepConfig?.id) {
      case 'type':
        return (
          <div className="space-y-6">
            <PackageTypeSelector
              value={formData.package_type}
              onChange={(value) => updateField('package_type', value)}
              disabled={mode === 'edit'}
            />
          </div>
        )

      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Naziv paketa *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={formData.package_type === 'fiksni' ? 'npr. Vila Sunset Apartments' : 'npr. Hotel Aegean Blue'}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Opis
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="Opišite paket..."
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Država *
                </label>
                <input
                  type="text"
                  value={formData.destination_country}
                  onChange={(e) => updateField('destination_country', e.target.value)}
                  placeholder="npr. Grčka"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Grad/Region
                </label>
                <input
                  type="text"
                  value={formData.destination_city || ''}
                  onChange={(e) => updateField('destination_city', e.target.value)}
                  placeholder="npr. Halkidiki"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {formData.package_type === 'fiksni' ? 'Naziv objekta' : 'Naziv hotela'}
                </label>
                <input
                  type="text"
                  value={formData.accommodation_name || formData.hotel_name || ''}
                  onChange={(e) => {
                    updateField('accommodation_name', e.target.value)
                    updateField('hotel_name', e.target.value)
                  }}
                  placeholder={formData.package_type === 'fiksni' ? 'npr. Vila Sunset' : 'npr. Hotel Aegean Blue'}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Broj zvezdica
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateField('hotel_stars', formData.hotel_stars === star ? undefined : star)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        formData.hotel_stars && star <= formData.hotel_stars
                          ? 'text-amber-400'
                          : 'text-gray-300 hover:text-gray-400'
                      )}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Availability period for NA_UPIT */}
            {formData.package_type === 'na_upit' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dostupno od
                  </label>
                  <input
                    type="date"
                    value={formData.available_from || ''}
                    onChange={(e) => updateField('available_from', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dostupno do
                  </label>
                  <input
                    type="date"
                    value={formData.available_to || ''}
                    onChange={(e) => updateField('available_to', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            )}

            {/* Meal plans for NA_UPIT */}
            {formData.package_type === 'na_upit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipovi ishrane (pansiona)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_PLAN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMealPlan(option.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        formData.meal_plans?.includes(option.value)
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'sale_mode':
        return (
          <SaleModeSelector
            value={formData.sale_mode}
            onChange={(value) => updateField('sale_mode', value)}
          />
        )

      case 'apartments':
        return (
          <ApartmentsConfig
            apartments={formData.apartments}
            onChange={(apartments) => updateField('apartments', apartments)}
          />
        )

      case 'room_types':
        return (
          <div className="space-y-6">
            {formData.package_type === 'na_upit' && (
              <PriceImageUpload
                onImport={handlePriceImageImport}
                mealPlans={formData.meal_plans || []}
              />
            )}
            <RoomTypesConfig
              roomTypes={formData.room_types}
              onChange={(roomTypes) => updateField('room_types', roomTypes)}
            />
          </div>
        )

      case 'pricing':
        return formData.package_type === 'fiksni' ? (
          <FiksniPricing
            intervals={formData.price_intervals}
            apartments={formData.apartments}
            onChange={(intervals) => updateField('price_intervals', intervals)}
          />
        ) : (
          <HotelPriceMatrix
            intervals={formData.price_intervals}
            roomTypes={formData.room_types}
            mealPlans={formData.meal_plans || []}
            onChange={(intervals) => updateField('price_intervals', intervals)}
          />
        )

      case 'children':
        return (
          <ChildrenPolicyConfig
            policies={formData.children_policies}
            onChange={(policies) => updateField('children_policies', policies)}
          />
        )

      case 'shifts':
        return (
          <ShiftsConfig
            shifts={formData.shifts}
            onChange={(shifts) => updateField('shifts', shifts)}
            defaultCapacity={40}
            defaultTransportPrice={formData.transport_price_per_person}
          />
        )

      case 'transport':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tip prevoza
              </label>
              <select
                value={formData.transport_type || ''}
                onChange={(e) => updateField('transport_type', (e.target.value || undefined) as TransportType | undefined)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Izaberi...</option>
                <option value="autobus">Autobus</option>
                <option value="avion">Avion</option>
                <option value="sopstveni">Sopstveni prevoz</option>
                <option value="brod">Brod</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mesto polaska
              </label>
              <input
                type="text"
                value={formData.departure_location || ''}
                onChange={(e) => updateField('departure_location', e.target.value)}
                placeholder="npr. BAS Beograd"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {formData.package_type === 'fiksni' && formData.sale_mode !== 'GRUPNO_SMENA' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.transport_price_fixed || false}
                    onChange={(e) => updateField('transport_price_fixed', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span className="text-sm text-gray-700">Fiksna cena prevoza</span>
                </label>

                {formData.transport_price_fixed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cena prevoza po osobi (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.transport_price_per_person || ''}
                      onChange={(e) => updateField('transport_price_per_person', parseFloat(e.target.value) || undefined)}
                      placeholder="npr. 30"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_own_transport || false}
                    onChange={(e) => updateField('allow_own_transport', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
                  />
                  <span className="text-sm text-gray-700">Dozvoljen sopstveni prevoz</span>
                </label>
              </>
            )}
          </div>
        )

      case 'images':
        return (
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

            {formData.images.length > 0 ? (
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
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">Nema slika</p>
                <p className="text-xs text-gray-400">Dodajte URL-ove slika iznad</p>
              </div>
            )}
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Pregled paketa</h4>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Naziv:</dt>
                  <dd className="font-medium text-gray-900">{formData.name || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tip:</dt>
                  <dd className="font-medium text-gray-900">
                    {formData.package_type === 'fiksni' ? 'Fiksni' : 'Na upit'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Destinacija:</dt>
                  <dd className="font-medium text-gray-900">
                    {formData.destination_city ? `${formData.destination_city}, ` : ''}{formData.destination_country || '-'}
                  </dd>
                </div>
                {formData.package_type === 'fiksni' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Način prodaje:</dt>
                      <dd className="font-medium text-gray-900">{formData.sale_mode || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Broj apartmana:</dt>
                      <dd className="font-medium text-gray-900">{formData.apartments.length}</dd>
                    </div>
                    {formData.sale_mode === 'GRUPNO_SMENA' && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Broj smena:</dt>
                        <dd className="font-medium text-gray-900">{formData.shifts.length}</dd>
                      </div>
                    )}
                  </>
                )}
                {formData.package_type === 'na_upit' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tipovi soba:</dt>
                      <dd className="font-medium text-gray-900">{formData.room_types.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tipovi ishrane:</dt>
                      <dd className="font-medium text-gray-900">{formData.meal_plans?.join(', ') || '-'}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Cenovni intervali:</dt>
                  <dd className="font-medium text-gray-900">{formData.price_intervals.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Slike:</dt>
                  <dd className="font-medium text-gray-900">{formData.images.length}</dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => updateField('is_featured', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
              />
              <label htmlFor="is_featured" className="text-sm text-gray-700 cursor-pointer">
                Preporučena ponuda (prikazuje se na vrhu)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => updateField('is_published', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500/20"
              />
              <label htmlFor="is_published" className="text-sm text-gray-700 cursor-pointer">
                Objavi odmah (vidljivo na sajtu)
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 0 && mode === 'create' && onBack) {
                  onBack()
                } else if (currentStep > 0) {
                  handlePrev()
                } else {
                  router.back()
                }
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Novi paket' : 'Izmeni paket'}
              </h1>
              <p className="text-sm text-gray-500">
                Korak {currentStep + 1} od {activeSteps.length}: {currentStepConfig?.label}
              </p>
            </div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex gap-1">
            {activeSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  index <= currentStep ? 'bg-teal-500' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {renderStepContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 0 && mode === 'create' && onBack) {
                onBack()
              } else {
                handlePrev()
              }
            }}
            disabled={currentStep === 0 && !onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </button>

          {currentStep < activeSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Dalje
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {(isSubmitting || loading) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isSubmitting || loading ? 'Čuvam...' : 'Sačuvaj'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
