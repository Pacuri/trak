'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Hotel,
  Utensils,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Baby,
  Image as ImageIcon,
  X,
  Bed,
  Loader2,
  Minus,
  Plus,
  Edit2,
} from 'lucide-react'
import type { QualificationData } from '@/types'

// Price calculation result type
interface GroupPriceResult {
  success: boolean
  total: number
  perPersonAvg: number
  breakdown: {
    adultsCount: number
    adultsTotal: number
    adultPricePerPerson: number
    childrenCount: number
    childrenTotal: number
    childrenDetails: {
      age: number
      originalPrice: number
      discountedPrice: number
      discountType: string
      discountValue: number | null
      ruleName: string
      isFree: boolean
    }[]
  }
  interval?: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  roomType?: {
    id: string
    code: string
    name: string
  }
  mealPlan?: string
  durationNights: number
  priceType: string
  error?: string
}

const MEAL_LABELS: Record<string, string> = {
  ND: 'Samo smeštaj',
  BB: 'Doručak',
  HB: 'Polupansion',
  FB: 'Pun pansion',
  AI: 'All Inclusive',
}

interface RoomTypeImage {
  id: string
  room_type_id: string
  url: string
  alt_text?: string
  position: number
  is_primary: boolean
}

interface RoomType {
  id: string
  code: string
  name: string
  max_persons?: number
  description?: string
  images?: RoomTypeImage[]
}

interface HotelPrice {
  interval_id: string
  room_type_id: string
  price_nd?: number
  price_bb?: number
  price_hb?: number
  price_fb?: number
  price_ai?: number
}

interface PriceInterval {
  id: string
  name?: string
  start_date: string
  end_date: string
}

interface PublicPackage {
  id: string
  name: string
  description?: string
  destination_country: string
  destination_city?: string
  hotel_name?: string
  hotel_stars?: number
  package_type: string
  board_type?: string
  transport_type?: string
  departure_location?: string
  price_from?: number
  currency: string
  price_type?: string
  valid_from?: string | null
  valid_to?: string | null
  default_duration?: number
  meal_plans?: string[]
  included_services?: string[]
  images: { id: string; url: string; position: number; is_primary?: boolean }[]
  price_intervals: PriceInterval[]
  room_types: RoomType[]
  hotel_prices: HotelPrice[]
  children_policies: any[]
  supplements: any[]
  fees: any[]
  discounts: any[]
  notes: any[]
}

export default function PaketPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const packageId = params.packageId as string

  const [pkg, setPkg] = useState<PublicPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [qualification, setQualification] = useState<QualificationData | null>(null)

  // Selection state
  const [selectedDate, setSelectedDate] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [isAutoSelectedDate, setIsAutoSelectedDate] = useState(false)

  // Per-room meal plan selection - map of room_type_id to selected meal plan
  const [roomMealPlans, setRoomMealPlans] = useState<Map<string, string>>(new Map())

  // Room gallery modal state
  const [roomGalleryOpen, setRoomGalleryOpen] = useState<RoomType | null>(null)
  const [roomGalleryIndex, setRoomGalleryIndex] = useState(0)

  // Editable guest state
  const [editableAdults, setEditableAdults] = useState<number>(2)
  const [editableChildAges, setEditableChildAges] = useState<number[]>([])
  const [showGuestEditor, setShowGuestEditor] = useState(false)

  // Price calculation state - map of room_type_id to result
  const [priceResults, setPriceResults] = useState<Map<string, GroupPriceResult>>(new Map())
  const [priceLoading, setPriceLoading] = useState(false)

  // Track which room's price breakdown is expanded
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Set<string>>(new Set())

  // Load qualification from sessionStorage
  useEffect(() => {
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      const qualData = JSON.parse(storedQualification) as QualificationData
      setQualification(qualData)
      // Initialize editable guest state from qualification
      setEditableAdults(qualData.guests?.adults || 2)
      setEditableChildAges(qualData.guests?.childAges || [])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchPackage() {
      try {
        setLoading(true)
        const res = await fetch(`/api/public/agencies/${slug}/packages/${packageId}`)
        if (!res.ok) throw new Error('Paket nije pronađen')
        const data = await res.json()
        if (!cancelled) {
          setPkg(data)
          // Initialize per-room meal plan defaults
          if (data.room_types && data.meal_plans?.length > 0) {
            const defaultMealPlan = data.meal_plans[0]
            const initialMealPlans = new Map<string, string>()
            data.room_types.forEach((room: RoomType) => {
              initialMealPlans.set(room.id, defaultMealPlan)
            })
            setRoomMealPlans(initialMealPlans)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Greška pri učitavanju')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (slug && packageId) fetchPackage()
    return () => { cancelled = true }
  }, [slug, packageId])

  // Auto-select the cheapest date based on qualification month (or first available if no qualification)
  useEffect(() => {
    if (!pkg || selectedDate) return

    const defaultMealPlan = pkg.meal_plans?.[0] || 'AI'
    const priceKey = `price_${defaultMealPlan.toLowerCase()}` as keyof HotelPrice
    // NOTE: This uses default meal plan just for finding cheapest date, actual prices use per-room meal plan

    // Get the user's selected month from qualification (may be null)
    const selectedMonth = qualification?.dates?.month // e.g., "jun", "jul", "jun-jul"

    // Find intervals that match the user's selected month(s)
    let matchingIntervals = pkg.price_intervals || []

    if (selectedMonth && matchingIntervals.length > 0) {
      const filtered = matchingIntervals.filter(interval => {
        const startDate = new Date(interval.start_date)
        const endDate = new Date(interval.end_date)

        // Get month names in Serbian
        const monthNames = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']
        const startMonth = monthNames[startDate.getMonth()]
        const endMonth = monthNames[endDate.getMonth()]

        // Check if the interval overlaps with the selected month(s)
        const selectedMonths = selectedMonth.toLowerCase().split('-').map(m => m.trim())
        return selectedMonths.some(m =>
          startMonth.includes(m) || endMonth.includes(m) || m.includes(startMonth) || m.includes(endMonth)
        )
      })

      // Only use filtered if we found matches, otherwise use all intervals
      if (filtered.length > 0) {
        matchingIntervals = filtered
      }
    }

    // Find the cheapest price across matching intervals
    let cheapestPrice = Infinity
    let cheapestDate = ''

    for (const interval of matchingIntervals) {
      // Find the minimum price for this interval across all room types
      const intervalPrices = pkg.hotel_prices?.filter(hp => hp.interval_id === interval.id) || []

      for (const priceRow of intervalPrices) {
        const price = priceRow[priceKey] as number | undefined
        if (price && price > 0 && price < cheapestPrice) {
          cheapestPrice = price
          // Use the start date of the interval as the selected date
          cheapestDate = interval.start_date
        }
      }
    }

    // If we found a cheapest date, auto-select it
    if (cheapestDate) {
      setSelectedDate(cheapestDate)
      setIsAutoSelectedDate(true)
    } else if (pkg.valid_from) {
      // Fallback: use package valid_from date
      setSelectedDate(pkg.valid_from)
      setIsAutoSelectedDate(true)
    }
  }, [pkg, qualification, selectedDate])

  // Find the price interval for selected date
  const getIntervalForDate = useCallback((date: string) => {
    if (!pkg?.price_intervals || !date) return null
    const d = new Date(date)
    return pkg.price_intervals.find(interval => {
      const start = new Date(interval.start_date)
      const end = new Date(interval.end_date)
      return d >= start && d <= end
    })
  }, [pkg])

  // Get price for a room type based on selected date and meal plan
  const getPriceForRoom = useCallback((roomTypeId: string, mealPlan: string) => {
    if (!pkg?.hotel_prices || !selectedDate) return null
    const interval = getIntervalForDate(selectedDate)
    if (!interval) return null

    const priceRow = pkg.hotel_prices.find(
      hp => hp.room_type_id === roomTypeId && hp.interval_id === interval.id
    )
    if (!priceRow) return null

    const priceKey = `price_${mealPlan.toLowerCase()}` as keyof HotelPrice
    return priceRow[priceKey] as number | undefined
  }, [pkg, selectedDate, getIntervalForDate])

  // Get available meal plans for a room type (based on which prices are set)
  const getAvailableMealPlansForRoom = useCallback((roomTypeId: string) => {
    if (!pkg?.hotel_prices || !selectedDate || !pkg.meal_plans) return pkg?.meal_plans || []
    const interval = getIntervalForDate(selectedDate)
    if (!interval) return pkg.meal_plans

    const priceRow = pkg.hotel_prices.find(
      hp => hp.room_type_id === roomTypeId && hp.interval_id === interval.id
    )
    if (!priceRow) return pkg.meal_plans

    // Filter to only meal plans that have a price set
    return pkg.meal_plans.filter(mp => {
      const priceKey = `price_${mp.toLowerCase()}` as keyof HotelPrice
      const price = priceRow[priceKey] as number | undefined
      return price && price > 0
    })
  }, [pkg, selectedDate, getIntervalForDate])

  // Calculate total price for ALL rooms when date/guests/mealplan change - use API for accurate children pricing
  useEffect(() => {
    if (!pkg || !selectedDate || !pkg.room_types || pkg.room_types.length === 0) {
      setPriceResults(new Map())
      return
    }

    const fetchPrices = async () => {
      setPriceLoading(true)
      try {
        // Fetch prices for all room types in parallel, using each room's selected meal plan
        const promises = pkg.room_types!.map(async (room) => {
          const roomMealPlan = roomMealPlans.get(room.id) || pkg.meal_plans?.[0] || 'AI'
          const params = new URLSearchParams({
            package_id: packageId,
            adults: String(editableAdults),
            date: selectedDate,
            duration_nights: String(pkg.default_duration || 7),
            room_type_id: room.id,
            meal_plan: roomMealPlan,
          })

          if (editableChildAges.length > 0) {
            params.set('child_ages', editableChildAges.join(','))
          }

          try {
            const res = await fetch(`/api/public/packages/calculate-price?${params}`)
            if (res.ok) {
              const data = await res.json()
              return { roomId: room.id, result: data as GroupPriceResult }
            }
          } catch (err) {
            console.error(`Price calculation error for room ${room.id}:`, err)
          }
          return { roomId: room.id, result: null }
        })

        const results = await Promise.all(promises)
        const newMap = new Map<string, GroupPriceResult>()
        results.forEach(({ roomId, result }) => {
          if (result) {
            newMap.set(roomId, result)
          }
        })
        setPriceResults(newMap)
      } catch (err) {
        console.error('Price calculation error:', err)
        setPriceResults(new Map())
      } finally {
        setPriceLoading(false)
      }
    }

    // Debounce the API call
    const timeout = setTimeout(fetchPrices, 300)
    return () => clearTimeout(timeout)
  }, [pkg, packageId, selectedDate, roomMealPlans, editableAdults, editableChildAges])

  // Guest editor handlers
  const handleAddChild = () => {
    if (editableChildAges.length < 4) {
      setEditableChildAges([...editableChildAges, 5]) // Default age 5
    }
  }

  const handleRemoveChild = () => {
    if (editableChildAges.length > 0) {
      setEditableChildAges(editableChildAges.slice(0, -1))
    }
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...editableChildAges]
    newAges[index] = age
    setEditableChildAges(newAges)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Paket nije pronađen'}</h2>
          <Link href={`/a/${slug}/results`} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium">
            <ArrowLeft className="w-4 h-4" /> Nazad na rezultate
          </Link>
        </div>
      </div>
    )
  }

  const images = pkg.images || []
  const currentImage = images[currentImageIndex]
  const locationText = [pkg.destination_city, pkg.destination_country].filter(Boolean).join(', ')
  const hasValidRange = pkg.valid_from && pkg.valid_to

  const nextImage = () => setCurrentImageIndex((i) => (i + 1) % images.length)
  const prevImage = () => setCurrentImageIndex((i) => (i - 1 + images.length) % images.length)

  // Get warnings/notes
  const warnings = pkg.notes?.filter(n => n.note_type === 'warning') || []
  const infoNotes = pkg.notes?.filter(n => n.note_type === 'info') || []

  // Guest info - use editable state
  const adults = editableAdults
  const children = editableChildAges.length
  const childAges = editableChildAges
  const totalGuests = adults + children

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/a/${slug}/results`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Nazad na rezultate
          </Link>

          {/* Guest summary badge - clickable to edit */}
          <div className="relative">
            <button
              onClick={() => setShowGuestEditor(!showGuestEditor)}
              className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                <User className="w-4 h-4" />
                <span>{adults} {adults === 1 ? 'odrasla osoba' : 'odraslih'}</span>
              </div>
              {children > 0 && (
                <div className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                  <Baby className="w-4 h-4" />
                  <span>{children} {children === 1 ? 'dete' : 'dece'}</span>
                  {childAges.length > 0 && (
                    <span className="text-gray-400">({childAges.join(', ')} god)</span>
                  )}
                </div>
              )}
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>

            {/* Guest editor dropdown */}
            {showGuestEditor && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 w-72">
                <h4 className="font-semibold text-gray-900 mb-3">Putnici</h4>

                {/* Adults */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium text-gray-900">Odrasli</div>
                    <div className="text-xs text-gray-500">18+ godina</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditableAdults(Math.max(1, editableAdults - 1))}
                      disabled={editableAdults <= 1}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{editableAdults}</span>
                    <button
                      onClick={() => setEditableAdults(Math.min(10, editableAdults + 1))}
                      disabled={editableAdults >= 10}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium text-gray-900">Deca</div>
                    <div className="text-xs text-gray-500">0-17 godina</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRemoveChild}
                      disabled={editableChildAges.length === 0}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{editableChildAges.length}</span>
                    <button
                      onClick={handleAddChild}
                      disabled={editableChildAges.length >= 4}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Child ages */}
                {editableChildAges.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700">Uzrast dece</div>
                    {editableChildAges.map((age, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Dete {idx + 1}</span>
                        <select
                          value={age}
                          onChange={(e) => handleChildAgeChange(idx, parseInt(e.target.value))}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        >
                          {Array.from({ length: 18 }, (_, i) => (
                            <option key={i} value={i}>{i} god.</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowGuestEditor(false)}
                  className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Primeni
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LARGE Hero image - photo centric approach */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] bg-gray-900">
        {currentImage?.url ? (
          <Image
            src={currentImage.url}
            alt={pkg.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
            <Hotel className="w-24 h-24 mb-4 text-gray-500" />
            <span className="text-gray-400 text-xl">{locationText}</span>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Image navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Image thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-24 lg:bottom-28 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.slice(0, 7).map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrentImageIndex(i)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
            {images.length > 7 && (
              <div className="w-16 h-12 rounded-lg bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                +{images.length - 7}
              </div>
            )}
          </div>
        )}

        {/* Hotel info overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              <span>{locationText}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">
              {pkg.hotel_name || pkg.name}
            </h1>

            {pkg.hotel_stars && (
              <div className="text-amber-400 text-xl mb-4">
                {'★'.repeat(pkg.hotel_stars)}{'☆'.repeat(5 - pkg.hotel_stars)}
              </div>
            )}

            {/* Quick features on hero */}
            <div className="flex flex-wrap gap-3">
              {pkg.meal_plans && pkg.meal_plans.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Utensils className="w-4 h-4" />
                  <span>{pkg.meal_plans.map(mp => MEAL_LABELS[mp] || mp).join(', ')}</span>
                </div>
              )}
              {pkg.default_duration && (
                <div className="flex items-center gap-1.5 text-sm text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{pkg.default_duration} noći</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Description section */}
        {pkg.description && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">O smeštaju</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{pkg.description}</p>
          </div>
        )}

        {/* Availability section - Booking.com style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Dostupnost i cene</h2>
            {hasValidRange && (
              <p className="text-sm text-gray-500 mt-1">
                Dostupno od {new Date(pkg.valid_from!).toLocaleDateString('sr-Latn')} do {new Date(pkg.valid_to!).toLocaleDateString('sr-Latn')}
              </p>
            )}
          </div>

          {/* Date selection */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Datum dolaska
                </label>
                <input
                  type="date"
                  min={pkg.valid_from || undefined}
                  max={pkg.valid_to || undefined}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setIsAutoSelectedDate(false)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            {!selectedDate && (
              <p className="text-amber-600 text-sm mt-3 flex items-center gap-1">
                <Info className="w-4 h-4" />
                Izaberite datum da vidite dostupnost i cene
              </p>
            )}

            {isAutoSelectedDate && selectedDate && (
              <p className="text-green-600 text-sm mt-3 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Automatski odabran najpovoljniji datum za vas
              </p>
            )}
          </div>

          {/* Room types - Booking.com style cards */}
          {/* Filter rooms that can accommodate the total number of guests */}
          <div className="divide-y divide-gray-200">
            {pkg.room_types?.filter((room) => {
              // If max_persons is not set, show the room (assume it fits)
              if (!room.max_persons) return true
              // Only show rooms that can fit all guests
              return room.max_persons >= totalGuests
            }).map((room) => {
              const currentMealPlan = roomMealPlans.get(room.id) || pkg.meal_plans?.[0] || 'AI'
              const availableMealPlans = getAvailableMealPlansForRoom(room.id)
              const pricePerNight = getPriceForRoom(room.id, currentMealPlan)
              const nights = pkg.default_duration || 7
              // Get API-calculated price for this room
              const roomPriceResult = priceResults.get(room.id)
              const hasCalculatedPrice = roomPriceResult?.success
              const roomImages = room.images || []
              const primaryImage = roomImages[0]?.url

              return (
                <div key={room.id} className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* Room image thumbnail */}
                    <div className="lg:w-48 flex-shrink-0">
                      {primaryImage ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomGalleryOpen(room)
                            setRoomGalleryIndex(0)
                          }}
                          className="relative w-full aspect-video lg:aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                        >
                          <Image
                            src={primaryImage}
                            alt={room.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 1024px) 100vw, 192px"
                          />
                          {roomImages.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {roomImages.length}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full transition-opacity">
                              Pogledaj slike
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="w-full aspect-video lg:aspect-[4/3] rounded-lg bg-gray-100 flex items-center justify-center">
                          <Bed className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Room details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              Max {room.max_persons || '?'} osoba
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-blue-600 font-medium">{room.code}</span>
                          </div>
                        </div>
                      </div>

                      {room.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{room.description}</p>
                      )}

                      {/* Meal plan selector for this room */}
                      {availableMealPlans.length > 1 && selectedDate && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            <Utensils className="w-3 h-3 inline mr-1" />
                            Ishrana
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {availableMealPlans.map((mp) => {
                              const isSelected = currentMealPlan === mp
                              const mpPrice = getPriceForRoom(room.id, mp)
                              return (
                                <button
                                  key={mp}
                                  type="button"
                                  onClick={() => {
                                    setRoomMealPlans(prev => {
                                      const next = new Map(prev)
                                      next.set(room.id, mp)
                                      return next
                                    })
                                  }}
                                  className={`
                                    flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium transition-all min-w-[100px]
                                    ${isSelected
                                      ? 'bg-teal-600 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }
                                  `}
                                >
                                  <span>{MEAL_LABELS[mp] || mp}</span>
                                  {mpPrice && (
                                    <span className={`text-xs mt-0.5 ${isSelected ? 'text-teal-100' : 'text-gray-500'}`}>
                                      €{mpPrice}/noć
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Show single meal plan if only one available */}
                      {availableMealPlans.length === 1 && selectedDate && (
                        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                          <Utensils className="w-4 h-4" />
                          <span>{MEAL_LABELS[availableMealPlans[0]] || availableMealPlans[0]}</span>
                        </div>
                      )}

                      {/* Room images mini gallery */}
                      {roomImages.length > 1 && (
                        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                          {roomImages.slice(0, 5).map((img, i) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => {
                                setRoomGalleryOpen(room)
                                setRoomGalleryIndex(i)
                              }}
                              className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
                            >
                              <Image src={img.url} alt="" fill className="object-cover" sizes="48px" />
                            </button>
                          ))}
                          {roomImages.length > 5 && (
                            <button
                              type="button"
                              onClick={() => {
                                setRoomGalleryOpen(room)
                                setRoomGalleryIndex(5)
                              }}
                              className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0 hover:bg-gray-300 transition-colors"
                            >
                              +{roomImages.length - 5}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pricing and CTA */}
                    <div className="lg:w-56 flex-shrink-0 flex flex-col items-end justify-between">
                      <div className="text-right mb-3 w-full">
                        {selectedDate ? (
                          pricePerNight ? (
                            <>
                              <div className="text-sm text-gray-500">od</div>
                              <div className="text-2xl font-bold text-gray-900">€{pricePerNight}</div>
                              <div className="text-xs text-gray-500">po osobi / noć</div>

                              {/* Show loading state */}
                              {priceLoading && !hasCalculatedPrice && (
                                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-end gap-2 text-gray-500">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Računam...</span>
                                </div>
                              )}

                              {/* Show calculated price breakdown */}
                              {hasCalculatedPrice && roomPriceResult && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  {/* Total */}
                                  <div className="text-2xl font-bold text-teal-600">
                                    €{Math.round(roomPriceResult.total).toLocaleString('sr-Latn')}
                                  </div>
                                  <div className="text-xs text-gray-500">{totalGuests} os. × {nights} noći</div>

                                  {/* Expandable breakdown toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setExpandedBreakdowns(prev => {
                                        const next = new Set(prev)
                                        if (next.has(room.id)) {
                                          next.delete(room.id)
                                        } else {
                                          next.add(room.id)
                                        }
                                        return next
                                      })
                                    }}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-1 transition-colors"
                                  >
                                    <span>Detalji cene</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        expandedBreakdowns.has(room.id) ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </button>

                                  {/* Animated breakdown details */}
                                  <div
                                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                                      expandedBreakdowns.has(room.id)
                                        ? 'max-h-40 opacity-100 mt-2'
                                        : 'max-h-0 opacity-0'
                                    }`}
                                  >
                                    <div className="text-xs text-gray-500 space-y-0.5 pt-2 border-t border-gray-100">
                                      <div className="flex justify-between">
                                        <span>{roomPriceResult.breakdown.adultsCount} odraslih</span>
                                        <span>€{Math.round(roomPriceResult.breakdown.adultsTotal).toLocaleString('sr-Latn')}</span>
                                      </div>
                                      {roomPriceResult.breakdown.childrenDetails.map((child, i) => (
                                        <div key={i} className="flex justify-between">
                                          <span>
                                            Dete ({child.age} god.)
                                            {child.isFree && <span className="text-green-600 ml-1">BESPLATNO</span>}
                                            {!child.isFree && child.discountType === 'PERCENT' && child.discountValue && (
                                              <span className="text-green-600 ml-1">-{child.discountValue}%</span>
                                            )}
                                          </span>
                                          <span>€{Math.round(child.discountedPrice).toLocaleString('sr-Latn')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">Cena nije dostupna</span>
                          )
                        ) : (
                          <span className="text-gray-400 text-sm">Izaberi datum za cenu</span>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="flex flex-col gap-2 w-full lg:w-auto">
                        {selectedDate && pricePerNight ? (
                          <Link
                            href={`/a/${slug}/inquiry/${packageId}?date=${selectedDate}&room_type_id=${room.id}&meal_plan=${currentMealPlan}&adults=${adults}&children=${children}${childAges.length > 0 ? `&childAges=${childAges.join(',')}` : ''}`}
                            className="w-full lg:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                          >
                            Pošalji upit
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="w-full lg:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-gray-200 text-gray-400 font-medium rounded-lg cursor-not-allowed"
                          >
                            Pošalji upit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* No rooms message */}
          {(!pkg.room_types || pkg.room_types.length === 0) && (
            <div className="p-8 text-center text-gray-500">
              <Bed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Tipovi soba nisu definisani</p>
            </div>
          )}

          {/* No rooms fit the group size */}
          {pkg.room_types && pkg.room_types.length > 0 &&
           pkg.room_types.filter(r => !r.max_persons || r.max_persons >= totalGuests).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700 mb-1">Nema soba za {totalGuests} {totalGuests === 1 ? 'osobu' : 'osobe'}</p>
              <p className="text-sm">Probajte sa manjim brojem putnika ili kontaktirajte agenciju za posebnu ponudu.</p>
              <button
                onClick={() => setShowGuestEditor(true)}
                className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium underline"
              >
                Promeni broj putnika
              </button>
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Važne napomene</h3>
                <ul className="space-y-1">
                  {warnings.map((note: any) => (
                    <li key={note.id} className="text-amber-700 text-sm">{note.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Included services */}
        {pkg.included_services && pkg.included_services.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Cena uključuje
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pkg.included_services.map((service, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {service}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Show more details toggle */}
        {(pkg.children_policies?.length > 0 || pkg.supplements?.length > 0 || pkg.fees?.length > 0 || pkg.discounts?.length > 0 || infoNotes.length > 0) && (
          <div className="mb-6">
            <button
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="w-full flex items-center justify-center gap-2 py-3 text-teal-600 hover:text-teal-700 font-medium"
            >
              {showMoreDetails ? (
                <>
                  <ChevronUp className="w-5 h-5" />
                  Sakrij dodatne informacije
                </>
              ) : (
                <>
                  <ChevronDown className="w-5 h-5" />
                  Prikaži dodatne informacije (popusti za decu, doplate, takse...)
                </>
              )}
            </button>

            {showMoreDetails && (
              <div className="mt-4 space-y-6">
                {/* Children policies */}
                {pkg.children_policies?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Politika za decu</h3>
                    <div className="space-y-3">
                      {pkg.children_policies.map((policy: any) => (
                        <div key={policy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">
                              {policy.rule_name || `${policy.age_from}-${policy.age_to} godina`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Uzrast: {policy.age_from} – {policy.age_to} god.
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            policy.discount_type === 'FREE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {policy.discount_type === 'FREE'
                              ? 'BESPLATNO'
                              : policy.discount_type === 'PERCENT'
                                ? `${policy.discount_value}% popusta`
                                : `−€${policy.discount_value}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supplements */}
                {pkg.supplements?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Doplate</h3>
                    <div className="space-y-2">
                      {pkg.supplements.map((supp: any) => {
                        const perLabels: Record<string, string> = {
                          'night': '/noć',
                          'stay': '/boravak',
                          'person_night': '/os./noć',
                          'person_stay': '/os./boravak',
                        }
                        const priceText = supp.amount != null
                          ? `€${supp.amount}${perLabels[supp.per] || ''}`
                          : supp.percent != null
                            ? `${supp.percent}%${perLabels[supp.per] || ''}`
                            : '—'

                        return (
                          <div key={supp.id} className={`flex items-center justify-between p-3 rounded-lg ${supp.mandatory ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                            <div>
                              <div className="font-medium text-gray-900">{supp.name}</div>
                              {supp.source_text && <div className="text-sm text-gray-500">{supp.source_text}</div>}
                            </div>
                            <div className="font-semibold text-gray-900">{priceText}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Fees */}
                {pkg.fees?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Takse i naknade</h3>
                    <div className="space-y-2">
                      {pkg.fees.map((fee: any) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{fee.name}</div>
                            {fee.rules?.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {fee.rules.map((r: any) => `${r.age_from}-${r.age_to} god: €${r.amount}`).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discounts */}
                {pkg.discounts?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Aktivni popusti</h3>
                    <div className="space-y-2">
                      {pkg.discounts.map((discount: any) => (
                        <div key={discount.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                          <div>
                            <div className="font-medium text-gray-900">{discount.name}</div>
                            {discount.source_text && <div className="text-sm text-gray-600">{discount.source_text}</div>}
                          </div>
                          <div className="font-semibold text-green-700">
                            {discount.percent != null ? `−${discount.percent}%` : discount.fixed_amount != null ? `−€${discount.fixed_amount}` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info notes */}
                {infoNotes.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Dodatne informacije</h3>
                    <ul className="space-y-2">
                      {infoNotes.map((note: any) => (
                        <li key={note.id} className="text-gray-700 text-sm flex items-start gap-2">
                          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          {note.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA for mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-20">
          <Link
            href={`/a/${slug}/inquiry/${packageId}${selectedDate ? `?date=${selectedDate}&meal_plan=${pkg.meal_plans?.[0] || 'AI'}&adults=${adults}&children=${children}${childAges.length > 0 ? `&childAges=${childAges.join(',')}` : ''}` : ''}`}
            className="block w-full text-center px-6 py-3.5 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Pošalji upit →
          </Link>
        </div>

        {/* Spacer for mobile fixed CTA */}
        <div className="h-20 lg:hidden" />
      </div>

      {/* Room Gallery Modal */}
      {roomGalleryOpen && roomGalleryOpen.images && roomGalleryOpen.images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <div>
              <h3 className="text-lg font-semibold">{roomGalleryOpen.name}</h3>
              <p className="text-sm text-white/70">
                {roomGalleryIndex + 1} / {roomGalleryOpen.images.length} slike
              </p>
            </div>
            <button
              onClick={() => setRoomGalleryOpen(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main image */}
          <div className="flex-1 relative flex items-center justify-center px-4">
            <Image
              src={roomGalleryOpen.images[roomGalleryIndex].url}
              alt={roomGalleryOpen.images[roomGalleryIndex].alt_text || roomGalleryOpen.name}
              fill
              className="object-contain"
              sizes="100vw"
            />

            {/* Navigation arrows */}
            {roomGalleryOpen.images.length > 1 && (
              <>
                <button
                  onClick={() => setRoomGalleryIndex((i) => (i - 1 + roomGalleryOpen.images!.length) % roomGalleryOpen.images!.length)}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => setRoomGalleryIndex((i) => (i + 1) % roomGalleryOpen.images!.length)}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {roomGalleryOpen.images.length > 1 && (
            <div className="p-4 flex justify-center gap-2 overflow-x-auto">
              {roomGalleryOpen.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setRoomGalleryIndex(i)}
                  className={`relative w-16 h-12 rounded-md overflow-hidden flex-shrink-0 ${
                    i === roomGalleryIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                  } transition-all`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
