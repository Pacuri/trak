'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Save,
  Package as PackageIcon,
  Bed,
  DollarSign,
  Calendar,
  Loader2,
  Plus,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Star,
  Baby,
  FileText,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bus,
  Upload,
  Eye,
  ExternalLink,
  GripVertical,
  Utensils,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePackages } from '@/hooks/use-packages'
import { DeparturesTable, DepartureModal, GenerateDeparturesDialog } from '@/components/packages'
import { ChildrenPolicyRulesEditor, type ChildrenPolicyRuleFormData } from '@/components/packages/ChildrenPolicyRulesEditor'
import { TransportPriceListSelector } from '@/components/packages/TransportPriceListSelector'
import type {
  Package,
  RoomType,
  PriceInterval,
  HotelPrice,
  ChildrenPolicy,
  PackageDeparture,
  PackageDepartureFormData,
  Departure,
} from '@/types/packages'
import {
  MEAL_PLAN_LABELS,
  formatDate,
} from '@/lib/package-labels'

type Section = 'basic' | 'description' | 'rooms' | 'intervals' | 'prices' | 'children' | 'transport' | 'departures' | 'images'

const MEAL_OPTIONS = [
  { value: 'ND', label: 'Samo smeštaj (ND)' },
  { value: 'BB', label: 'Doručak (BB)' },
  { value: 'HB', label: 'Polupansion (HB)' },
  { value: 'FB', label: 'Pun pansion (FB)' },
  { value: 'AI', label: 'All Inclusive (AI)' },
]

const TRANSPORT_OPTIONS = [
  { value: 'autobus', label: 'Autobus' },
  { value: 'avion', label: 'Avion' },
  { value: 'sopstveni', label: 'Sopstveni prevoz' },
]

interface PackageImage {
  id: string
  url: string
  position: number
  is_primary: boolean
  alt_text?: string
}

export default function EditPackagePage() {
  const params = useParams()
  const router = useRouter()
  const packageId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    getPackage,
    createPackageDeparture,
    updatePackageDeparture,
    deletePackageDeparture,
    updateCapacity,
    loading,
    error
  } = usePackages()

  const [pkg, setPkg] = useState<Package | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['basic']))
  const [showPreview, setShowPreview] = useState<'card' | 'page' | null>(null)

  // Form state for basic info
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    destination_country: '',
    destination_city: '',
    hotel_name: '',
    hotel_stars: 0,
    departure_location: '',
    default_duration: 7,
    valid_from: '',
    valid_to: '',
    price_from: 0,
    distance_from_beach: undefined as number | undefined,
    distance_from_center: undefined as number | undefined,
    hotel_amenities: [] as string[],
  })

  // Room types state
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])

  // Price intervals state
  const [priceIntervals, setPriceIntervals] = useState<PriceInterval[]>([])

  // Hotel prices state (matrix of prices)
  const [hotelPrices, setHotelPrices] = useState<HotelPrice[]>([])

  // Meal plans available
  const [mealPlans, setMealPlans] = useState<string[]>([])

  // Transport types available
  const [transportTypes, setTransportTypes] = useState<string[]>([])

  // Transport price list ID
  const [transportListId, setTransportListId] = useState<string | undefined>()

  // Children policies - using detailed form data
  const [childrenPolicies, setChildrenPolicies] = useState<ChildrenPolicyRuleFormData[]>([])

  // Images state
  const [images, setImages] = useState<PackageImage[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Departure modal state
  const [departureModalOpen, setDepartureModalOpen] = useState(false)
  const [editingDeparture, setEditingDeparture] = useState<Departure | null>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)

  const loadPackage = useCallback(async () => {
    setIsLoading(true)
    const data = await getPackage(packageId)
    if (data) {
      setPkg(data)
      setFormData({
        name: data.name || '',
        description: data.description || '',
        destination_country: data.destination_country || '',
        destination_city: data.destination_city || '',
        hotel_name: data.hotel_name || '',
        hotel_stars: data.hotel_stars || 0,
        departure_location: data.departure_location || '',
        default_duration: data.default_duration || 7,
        valid_from: data.valid_from || '',
        valid_to: data.valid_to || '',
        price_from: data.price_from || 0,
        distance_from_beach: (data as any).distance_from_beach || undefined,
        distance_from_center: (data as any).distance_from_center || undefined,
        hotel_amenities: (data as any).hotel_amenities || [],
      })
      setRoomTypes(data.room_types || [])
      setPriceIntervals(data.price_intervals || [])
      setHotelPrices(data.hotel_prices || [])
      setMealPlans(data.meal_plans || ['HB'])
      // Load transport types - can be array or single string
      const transportData = (data as any).transport_types || data.transport_type
      if (Array.isArray(transportData)) {
        setTransportTypes(transportData)
      } else if (transportData) {
        setTransportTypes([transportData])
      } else {
        setTransportTypes([])
      }
      // Load transport price list ID
      setTransportListId((data as any).transport_price_list_id || undefined)
      // Convert children policies to form data format
      setChildrenPolicies((data.children_policies || []).map((cp: any) => ({
        rule_name: cp.rule_name || '',
        min_adults: cp.min_adults,
        max_adults: cp.max_adults,
        child_position: cp.child_position,
        room_type_codes: cp.room_type_codes,
        bed_type: cp.bed_type,
        age_from: cp.age_from ?? 0,
        age_to: cp.age_to ?? 18,
        discount_type: cp.discount_type || 'PERCENT',
        discount_value: cp.discount_value,
        source_text: cp.source_text || '',
      })))
      setImages(data.images || [])
    }
    setIsLoading(false)
  }, [getPackage, packageId])

  useEffect(() => {
    loadPackage()
  }, [loadPackage])

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
        return formData.name && formData.destination_country ? 'complete' : 'error'
      case 'description':
        return formData.description ? 'complete' : 'warning'
      case 'rooms':
        return roomTypes.length > 0 ? 'complete' : 'error'
      case 'intervals':
        return priceIntervals.length > 0 ? 'complete' : 'warning'
      case 'prices':
        return hotelPrices.length > 0 ? 'complete' : 'warning'
      case 'children':
        return childrenPolicies.length > 0 ? 'complete' : 'warning'
      case 'transport':
        return transportListId ? 'complete' : 'warning'
      case 'departures':
        return (pkg?.departures?.length || 0) > 0 ? 'complete' : 'warning'
      case 'images':
        return images.length > 0 ? 'complete' : 'warning'
      default:
        return 'complete'
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!pkg) return

    setIsSaving(true)
    try {
      // Update basic package info directly via API
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          destination_country: formData.destination_country,
          destination_city: formData.destination_city || null,
          hotel_name: formData.hotel_name || null,
          hotel_stars: formData.hotel_stars || null,
          // Save first selected meal plan as board_type for backwards compatibility
          board_type: mealPlans[0] || null,
          meal_plans: mealPlans,
          // Save first selected transport as transport_type for backwards compatibility
          transport_type: transportTypes[0] || null,
          transport_types: transportTypes,
          transport_price_list_id: transportListId || null,
          departure_location: formData.departure_location || null,
          default_duration: formData.default_duration || null,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_to || null,
          price_from: calculatedPriceFrom || null,
          // Include images as URLs
          images: images.map(img => img.url),
        }),
      })

      if (response.ok) {
        setSaveSuccess(true)
        setHasChanges(false)
        setTimeout(() => setSaveSuccess(false), 2000)
        // Reload to get fresh data
        await loadPackage()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Greška pri čuvanju')
      }
    } catch (err: any) {
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Room type handlers
  const addRoomType = () => {
    const newRoom = {
      id: `new_${Date.now()}`,
      code: `S${roomTypes.length + 1}`,
      name: 'Nova soba',
      max_persons: 2,
    } as RoomType
    setRoomTypes([...roomTypes, newRoom])
    setHasChanges(true)
  }

  const updateRoomType = (id: string, field: keyof RoomType, value: any) => {
    setRoomTypes(prev => prev.map(rt => rt.id === id ? { ...rt, [field]: value } : rt))
    setHasChanges(true)
  }

  const removeRoomType = (id: string) => {
    setRoomTypes(prev => prev.filter(rt => rt.id !== id))
    setHotelPrices(prev => prev.filter(hp => hp.room_type_id !== id))
    setHasChanges(true)
  }

  // Price interval handlers
  const addPriceInterval = () => {
    const newInterval = {
      id: `new_${Date.now()}`,
      name: 'Novi period',
      start_date: '',
      end_date: '',
    } as PriceInterval
    setPriceIntervals([...priceIntervals, newInterval])
    setHasChanges(true)
  }

  const updatePriceInterval = (id: string, field: keyof PriceInterval, value: any) => {
    setPriceIntervals(prev => prev.map(pi => pi.id === id ? { ...pi, [field]: value } : pi))
    setHasChanges(true)
  }

  const removePriceInterval = (id: string) => {
    setPriceIntervals(prev => prev.filter(pi => pi.id !== id))
    setHotelPrices(prev => prev.filter(hp => hp.interval_id !== id))
    setHasChanges(true)
  }

  // Hotel price handlers
  const updateHotelPrice = (intervalId: string, roomTypeId: string, mealPlan: string, value: number) => {
    const priceKey = `price_${mealPlan.toLowerCase()}` as keyof HotelPrice

    setHotelPrices(prev => {
      const existingIndex = prev.findIndex(
        hp => hp.interval_id === intervalId && hp.room_type_id === roomTypeId
      )

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], [priceKey]: value }
        return updated
      } else {
        const newPrice = {
          id: `new_${Date.now()}`,
          interval_id: intervalId,
          room_type_id: roomTypeId,
          [priceKey]: value,
        } as unknown as HotelPrice
        return [...prev, newPrice]
      }
    })
    setHasChanges(true)
  }

  const getHotelPrice = (intervalId: string, roomTypeId: string, mealPlan: string): number => {
    const priceKey = `price_${mealPlan.toLowerCase()}` as keyof HotelPrice
    const price = hotelPrices.find(
      hp => hp.interval_id === intervalId && hp.room_type_id === roomTypeId
    )
    return (price?.[priceKey] as number) || 0
  }

  // Calculate minimum price from price matrix (lowest room + lowest meal plan)
  const calculatedPriceFrom = (() => {
    if (hotelPrices.length === 0 || mealPlans.length === 0) return 0

    let minPrice = Infinity

    for (const hp of hotelPrices) {
      for (const mp of mealPlans) {
        const priceKey = `price_${mp.toLowerCase()}` as keyof HotelPrice
        const price = hp[priceKey] as number
        if (price && price > 0 && price < minPrice) {
          minPrice = price
        }
      }
    }

    return minPrice === Infinity ? 0 : minPrice
  })()

  // Meal plan handlers
  const toggleMealPlan = (plan: string) => {
    setMealPlans(prev => {
      if (prev.includes(plan)) {
        return prev.filter(p => p !== plan)
      }
      return [...prev, plan]
    })
    setHasChanges(true)
  }

  // Transport type handlers
  const toggleTransportType = (type: string) => {
    setTransportTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      }
      return [...prev, type]
    })
    setHasChanges(true)
  }

  // Children policy handlers - now using the detailed editor
  const handleChildrenPoliciesChange = (rules: ChildrenPolicyRuleFormData[]) => {
    setChildrenPolicies(rules)
    setHasChanges(true)
  }

  // Image handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    try {
      for (const file of Array.from(files)) {
        // Create FormData for upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('package_id', packageId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          const newImage: PackageImage = {
            id: `new_${Date.now()}_${Math.random()}`,
            url: data.url,
            position: images.length,
            is_primary: images.length === 0,
          }
          setImages(prev => [...prev, newImage])
          setHasChanges(true)
        }
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
      setImages(prev => [...prev, newImage])
      setHasChanges(true)
    }
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      // Update primary if needed
      if (filtered.length > 0 && !filtered.some(img => img.is_primary)) {
        filtered[0].is_primary = true
      }
      return filtered
    })
    setHasChanges(true)
  }

  const setPrimaryImage = (id: string) => {
    setImages(prev => prev.map(img => ({
      ...img,
      is_primary: img.id === id,
    })))
    setHasChanges(true)
  }

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return
    setImages(prev => {
      const newImages = [...prev]
      const [removed] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, removed)
      return newImages.map((img, i) => ({ ...img, position: i }))
    })
    setHasChanges(true)
  }

  // Departure handlers
  const handleDepartureSubmit = async (data: PackageDepartureFormData) => {
    if (editingDeparture) {
      await updatePackageDeparture(packageId, editingDeparture.id, data)
    } else {
      await createPackageDeparture(packageId, data)
    }
    await loadPackage()
    setDepartureModalOpen(false)
    setEditingDeparture(null)
  }

  const handleDeleteDeparture = async (departureId: string) => {
    const ok = await deletePackageDeparture(packageId, departureId)
    if (ok) {
      await loadPackage()
    }
  }

  const handleUpdateCapacity = async (departureId: string, available: number) => {
    const success = await updateCapacity(packageId, departureId, available)
    if (success) {
      await loadPackage()
    }
  }

  // Section Header Component
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="text-center py-12">
        <PackageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Paket nije pronađen</h2>
        <Link href="/dashboard/packages" className="text-teal-600 hover:underline mt-2 inline-block">
          Nazad na listu
        </Link>
      </div>
    )
  }

  const departures = pkg.departures || []
  const primaryImage = images.find(img => img.is_primary) || images[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/packages/${packageId}`}>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Izmeni paket</h1>
            <p className="text-gray-500">{pkg.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Preview buttons */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setShowPreview('card')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                showPreview === 'card' ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Eye className="h-4 w-4" />
              Kartica
            </button>
            <button
              onClick={() => setShowPreview('page')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                showPreview === 'page' ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <ExternalLink className="h-4 w-4" />
              Stranica
            </button>
          </div>

          {hasChanges && (
            <span className="text-sm text-amber-600">Imate nesačuvane izmene</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              saveSuccess
                ? 'bg-green-600 text-white'
                : hasChanges
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? 'Sačuvano!' : 'Sačuvaj izmene'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {showPreview === 'card' ? 'Pregled kartice' : 'Pregled stranice'}
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-100">
              {showPreview === 'card' ? (
                <div className="max-w-sm mx-auto">
                  {/* Card Preview */}
                  <div className="rounded-2xl overflow-hidden shadow-lg bg-white">
                    <div className="relative h-40">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={formData.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      {formData.hotel_stars > 0 && (
                        <div className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-600">
                          {'★'.repeat(formData.hotel_stars)}
                        </div>
                      )}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                          {formData.hotel_name || formData.name || 'Naziv paketa'}
                        </h3>
                        <p className="text-white/90 text-sm flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[formData.destination_city, formData.destination_country].filter(Boolean).join(', ') || 'Destinacija'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-gray-500 uppercase">Dostupno</p>
                          <p className="text-sm font-semibold">
                            {formData.valid_from ? new Date(formData.valid_from).toLocaleDateString('sr-Latn') : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-gray-500 uppercase">Trajanje</p>
                          <p className="text-sm font-semibold">{formData.default_duration} noći</p>
                        </div>
                      </div>
                      {mealPlans.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {mealPlans.map(mp => (
                            <span key={mp} className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium text-emerald-700">
                              <Utensils className="w-3 h-3" />
                              {MEAL_OPTIONS.find(m => m.value === mp)?.label.split('(')[1]?.replace(')', '') || mp}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Cena od</p>
                        <span className="text-2xl font-bold text-emerald-600">
                          €{calculatedPriceFrom || 0}
                        </span>
                        <p className="text-xs text-gray-400">po osobi</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {/* Page Preview */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Hero */}
                    <div className="relative h-64 bg-gray-900">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={formData.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                          <MapPin className="w-4 h-4" />
                          {[formData.destination_city, formData.destination_country].filter(Boolean).join(', ')}
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                          {formData.hotel_name || formData.name}
                        </h1>
                        {formData.hotel_stars > 0 && (
                          <div className="text-amber-400 text-lg">
                            {'★'.repeat(formData.hotel_stars)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                      {formData.description && (
                        <div>
                          <h2 className="text-lg font-semibold mb-2">O smeštaju</h2>
                          <p className="text-gray-600 whitespace-pre-line">{formData.description}</p>
                        </div>
                      )}

                      {/* Quick info */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Clock className="w-6 h-6 mx-auto text-teal-600 mb-2" />
                          <div className="text-lg font-semibold">{formData.default_duration}</div>
                          <div className="text-sm text-gray-500">noći</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Bed className="w-6 h-6 mx-auto text-teal-600 mb-2" />
                          <div className="text-lg font-semibold">{roomTypes.length}</div>
                          <div className="text-sm text-gray-500">tipova soba</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <DollarSign className="w-6 h-6 mx-auto text-teal-600 mb-2" />
                          <div className="text-lg font-semibold">€{calculatedPriceFrom}</div>
                          <div className="text-sm text-gray-500">od / osoba</div>
                        </div>
                      </div>

                      {/* Room types */}
                      {roomTypes.length > 0 && (
                        <div>
                          <h2 className="text-lg font-semibold mb-3">Tipovi soba</h2>
                          <div className="space-y-2">
                            {roomTypes.map(room => (
                              <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium">{room.name}</div>
                                  <div className="text-sm text-gray-500">Max {room.max_persons} osoba</div>
                                </div>
                                <span className="text-sm text-blue-600 font-medium">{room.code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Card with Collapsible Sections */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Package header */}
        <div className="px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{formData.hotel_name || formData.name}</h3>
            {formData.hotel_stars > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: formData.hotel_stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm opacity-80 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {formData.destination_city ? `${formData.destination_city}, ` : ''}{formData.destination_country || 'Nije definisano'}
            </span>
          </div>
        </div>

        {/* Sections */}
        <div className="divide-y divide-gray-100">
          {/* Basic Info */}
          <div>
            <SectionHeader
              section="basic"
              title="Osnovni podaci"
              icon={MapPin}
              subtitle={`${formData.hotel_name || formData.name} • ${formData.destination_country || 'Nije definisano'}`}
            />
            {expandedSections.has('basic') && (
              <div className="px-4 pb-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Naziv paketa *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="npr. Letovanje Grčka 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Naziv hotela
                    </label>
                    <input
                      type="text"
                      value={formData.hotel_name}
                      onChange={(e) => handleInputChange('hotel_name', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="npr. Hotel Sunset Beach"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Zvezdice
                    </label>
                    <select
                      value={formData.hotel_stars || ''}
                      onChange={(e) => handleInputChange('hotel_stars', e.target.value ? parseInt(e.target.value) : 0)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">Bez zvezdica</option>
                      <option value="2">2 ★★</option>
                      <option value="3">3 ★★★</option>
                      <option value="4">4 ★★★★</option>
                      <option value="5">5 ★★★★★</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Država *
                    </label>
                    <input
                      type="text"
                      value={formData.destination_country}
                      onChange={(e) => handleInputChange('destination_country', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="npr. Grčka"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Grad/Region
                    </label>
                    <input
                      type="text"
                      value={formData.destination_city || ''}
                      onChange={(e) => handleInputChange('destination_city', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="npr. Halkidiki"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ishrana (pansioni)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MEAL_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleMealPlan(option.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            mealPlans.includes(option.value)
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Odaberite sve dostupne opcije ishrane
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prevoz
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TRANSPORT_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleTransportType(option.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            transportTypes.includes(option.value)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Odaberite sve dostupne opcije prevoza
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mesto polaska
                    </label>
                    <input
                      type="text"
                      value={formData.departure_location}
                      onChange={(e) => handleInputChange('departure_location', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      placeholder="npr. Beograd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Trajanje (noći)
                    </label>
                    <input
                      type="number"
                      value={formData.default_duration}
                      onChange={(e) => handleInputChange('default_duration', parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Važi od
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => handleInputChange('valid_from', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Važi do
                    </label>
                    <input
                      type="date"
                      value={formData.valid_to}
                      onChange={(e) => handleInputChange('valid_to', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cena od (EUR)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        {calculatedPriceFrom > 0 ? (
                          <span className="font-semibold text-emerald-600">€{calculatedPriceFrom}</span>
                        ) : (
                          <span className="text-gray-400">Nije definisano</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        automatski
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Izračunava se iz najniže cene sobe + pansiona
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <SectionHeader
              section="description"
              title="Opis paketa"
              icon={FileText}
              subtitle={formData.description ? 'Opis postoji' : 'Opciono'}
            />
            {expandedSections.has('description') && (
              <div className="px-4 pb-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Opis
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    placeholder="Opis paketa..."
                  />
                </div>

                {/* Distance info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Udaljenost od plaže (m)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.distance_from_beach || ''}
                      onChange={(e) => handleInputChange('distance_from_beach', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="npr. 100"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Udaljenost od centra (m)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.distance_from_center || ''}
                      onChange={(e) => handleInputChange('distance_from_center', e.target.value ? parseInt(e.target.value) : undefined)}
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
                    {(formData.hotel_amenities || []).map((amenity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-sm"
                      >
                        {amenity}
                        <button
                          type="button"
                          onClick={() => {
                            const newAmenities = (formData.hotel_amenities || []).filter((_, idx) => idx !== i)
                            handleInputChange('hotel_amenities', newAmenities)
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
                            handleInputChange('hotel_amenities', [...(formData.hotel_amenities || []), value])
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pritisnite Enter za dodavanje
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
              subtitle={`${roomTypes.length} tip${roomTypes.length === 1 ? '' : 'a'} soba`}
            />
            {expandedSections.has('rooms') && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {roomTypes.map((rt) => (
                    <div key={rt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <label className="block text-xs text-gray-500 mb-1">Kod</label>
                        <input
                          type="text"
                          value={rt.code}
                          onChange={(e) => updateRoomType(rt.id, 'code', e.target.value)}
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-semibold text-center focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                      <div className="flex-1 grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Naziv</label>
                          <input
                            type="text"
                            value={rt.name}
                            onChange={(e) => updateRoomType(rt.id, 'name', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Max osoba</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={rt.max_persons || 2}
                            onChange={(e) => updateRoomType(rt.id, 'max_persons', parseInt(e.target.value) || 1)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRoomType(rt.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRoomType}
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
              subtitle={`${priceIntervals.length} interval${priceIntervals.length === 1 ? '' : 'a'}`}
            />
            {expandedSections.has('intervals') && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  {priceIntervals.map((interval) => (
                    <div key={interval.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 grid gap-2 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Naziv</label>
                          <input
                            type="text"
                            value={interval.name || ''}
                            onChange={(e) => updatePriceInterval(interval.id, 'name', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Od</label>
                          <input
                            type="date"
                            value={interval.start_date}
                            onChange={(e) => updatePriceInterval(interval.id, 'start_date', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Do</label>
                          <input
                            type="date"
                            value={interval.end_date}
                            onChange={(e) => updatePriceInterval(interval.id, 'end_date', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePriceInterval(interval.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPriceInterval}
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
              subtitle={`${priceIntervals.length} interval${priceIntervals.length === 1 ? '' : 'a'} × ${roomTypes.length} soba`}
            />
            {expandedSections.has('prices') && (
              <div className="px-4 pb-4 overflow-x-auto">
                {/* Price table */}
                {priceIntervals.length > 0 && roomTypes.length > 0 && mealPlans.length > 0 ? (
                  priceIntervals.map((interval) => (
                    <div key={interval.id} className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{interval.name || 'Period'}</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Soba</th>
                            {mealPlans.map(mp => (
                              <th key={mp} className="px-3 py-2 text-center font-medium text-gray-600">
                                {MEAL_OPTIONS.find(o => o.value === mp)?.label.split('(')[1]?.replace(')', '') || mp}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {roomTypes.map((room) => (
                            <tr key={room.id} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-medium text-gray-900">{room.code}</td>
                              {mealPlans.map(mp => (
                                <td key={mp} className="px-1 py-1 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={getHotelPrice(interval.id, room.id, mp) || ''}
                                    onChange={(e) => updateHotelPrice(interval.id, room.id, mp, parseFloat(e.target.value) || 0)}
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
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    <p className="text-sm">Dodajte sobe i intervale da biste definisali cene</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Children Policies - Using the detailed editor */}
          <div>
            <SectionHeader
              section="children"
              title="Politika za decu"
              icon={Baby}
              subtitle={`${childrenPolicies.length} pravil${childrenPolicies.length === 1 ? 'o' : 'a'}`}
            />
            {expandedSections.has('children') && (
              <div className="px-4 pb-4">
                <ChildrenPolicyRulesEditor
                  rules={childrenPolicies}
                  onChange={handleChildrenPoliciesChange}
                  roomTypeCodes={roomTypes.map(rt => rt.code)}
                />
              </div>
            )}
          </div>

          {/* Transport Prices */}
          <div>
            <SectionHeader
              section="transport"
              title="Cene prevoza"
              icon={Bus}
              subtitle={transportListId ? 'Izabran cenovnik' : 'Opciono'}
            />
            {expandedSections.has('transport') && (
              <div className="px-4 pb-4">
                <TransportPriceListSelector
                  selectedListId={transportListId}
                  onSelect={(listId) => {
                    setTransportListId(listId)
                    setHasChanges(true)
                  }}
                  organizationId={pkg?.organization_id || ''}
                />
              </div>
            )}
          </div>

          {/* Departures */}
          <div>
            <SectionHeader
              section="departures"
              title="Polasci"
              icon={Bus}
              subtitle={`${departures.length} polazak${departures.length === 1 ? '' : 'a'}`}
            />
            {expandedSections.has('departures') && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => { setEditingDeparture(null); setDepartureModalOpen(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 border border-dashed border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Dodaj polazak
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateDialogOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Generiši
                  </button>
                </div>

                <DeparturesTable
                  departures={departures}
                  packageType={pkg.package_type}
                  onEditDeparture={(d) => { setEditingDeparture(d); setDepartureModalOpen(true) }}
                  onUpdateCapacity={handleUpdateCapacity}
                  onDeleteDeparture={handleDeleteDeparture}
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
                      {uploadingImage ? 'Uploading...' : 'Kliknite za upload slika'}
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
                          alt={img.alt_text || `Slika ${index + 1}`}
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
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, index - 1)}
                              className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                              title="Pomeri levo"
                            >
                              <ChevronUp className="h-4 w-4 -rotate-90" />
                            </button>
                          )}
                          {index < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, index + 1)}
                              className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                              title="Pomeri desno"
                            >
                              <ChevronDown className="h-4 w-4 -rotate-90" />
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

      {/* Modals */}
      <DepartureModal
        open={departureModalOpen}
        onOpenChange={setDepartureModalOpen}
        packageId={packageId}
        packageDefaults={{
          default_duration: formData.default_duration,
          departure_location: formData.departure_location,
        }}
        initial={editingDeparture ? (editingDeparture as unknown as PackageDeparture) : undefined}
        onSubmit={handleDepartureSubmit}
      />

      <GenerateDeparturesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        packageId={packageId}
        packageType={pkg.package_type}
        onGenerated={loadPackage}
      />
    </div>
  )
}
