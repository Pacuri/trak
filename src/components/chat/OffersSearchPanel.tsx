'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  X,
  Package,
  MapPin,
  Calendar,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Hotel,
  Link as LinkIcon,
  Send,
  Bus,
  Plane,
  Car,
  Baby,
  Plus,
  Minus,
  Check,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface TravelPackage {
  id: string
  name: string
  destination_country: string
  destination_city?: string
  hotel_name?: string
  price_from: number | null
  default_duration: number | null
  valid_from?: string
  valid_to?: string
  package_images?: { url: string }[]
  meal_plans?: string[]
  transport_type?: string
  departure_location?: string
  single_surcharge_percent?: number
  tax_disclaimer?: string
}

interface RoomType {
  id: string
  code: string
  name: string
  max_persons?: number
  min_adults?: number
  min_occupancy?: number
  warnings?: string[]
  single_surcharge_percent?: number
  distance_from_beach?: number
  has_elevator?: boolean
}

interface PriceInterval {
  id: string
  name?: string
  start_date: string
  end_date: string
}

interface Departure {
  id: string
  departure_date: string
  return_date?: string
  departure_location?: string
  available_spots?: number
  price_modifier?: number
}

interface Supplement {
  id: string
  code: string
  name: string
  amount?: number
  percent?: number
  per?: string
  currency?: string
  mandatory: boolean
}

interface OffersSearchPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectOffer: (offer: TravelPackage, formatted: string, trackingUrl?: string) => void
  leadId?: string
  initialDestination?: string
  initialDates?: string
}

const MEAL_LABELS: Record<string, string> = {
  ND: 'Samo smeštaj',
  BB: 'Doručak',
  HB: 'Polupansion',
  FB: 'Pun pansion',
  AI: 'All Inclusive',
}

const TRANSPORT_LABELS: Record<string, { label: string; icon: typeof Bus }> = {
  autobus: { label: 'Autobus', icon: Bus },
  avion: { label: 'Avion', icon: Plane },
  sopstveni: { label: 'Sopstveni', icon: Car },
}

export function OffersSearchPanel({
  isOpen,
  onClose,
  onSelectOffer,
  leadId,
  initialDestination,
  initialDates,
}: OffersSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState(initialDestination || '')
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [loading, setLoading] = useState(false)
  const { organizationId, user } = useUser()
  const supabase = useMemo(() => createClient(), [])

  // Configuration modal state
  const [selectedPackage, setSelectedPackage] = useState<TravelPackage | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [priceIntervals, setPriceIntervals] = useState<PriceInterval[]>([])
  const [departures, setDepartures] = useState<Departure[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Configuration selections
  const [selectedRoomType, setSelectedRoomType] = useState<string>('')
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('')
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDepartureCity, setSelectedDepartureCity] = useState<string>('')
  const [adultsCount, setAdultsCount] = useState<number>(2)
  const [childrenAges, setChildrenAges] = useState<number[]>([])
  const [duration, setDuration] = useState<number>(7)
  const [sending, setSending] = useState(false)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([])


  // Search packages
  const searchPackages = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      let query = supabase
        .from('packages')
        .select(`
          id,
          name,
          destination_country,
          destination_city,
          hotel_name,
          price_from,
          default_duration,
          valid_from,
          valid_to,
          meal_plans,
          transport_type,
          departure_location,
          single_surcharge_percent,
          tax_disclaimer,
          package_images(url)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(20)

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,destination_country.ilike.%${searchQuery}%,destination_city.ilike.%${searchQuery}%,hotel_name.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setPackages(data || [])
    } catch (err) {
      console.error('Error searching packages:', err)
      setPackages([])
    } finally {
      setLoading(false)
    }
  }, [supabase, organizationId, searchQuery])

  // Initial load and search on query change
  useEffect(() => {
    if (isOpen && !selectedPackage && organizationId) {
      const debounce = setTimeout(searchPackages, 300)
      return () => clearTimeout(debounce)
    }
  }, [isOpen, searchQuery, searchPackages, selectedPackage, organizationId])

  // Fetch package details when package is selected
  const fetchPackageDetails = useCallback(async (pkg: TravelPackage) => {
    setLoadingDetails(true)
    try {
      // Fetch room types with constraints and warnings
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, code, name, max_persons, min_adults, min_occupancy, warnings, single_surcharge_percent, distance_from_beach, has_elevator')
        .eq('package_id', pkg.id)
        .order('sort_order', { ascending: true })

      setRoomTypes(rooms || [])

      // Fetch price intervals
      const { data: intervals } = await supabase
        .from('price_intervals')
        .select('id, name, start_date, end_date')
        .eq('package_id', pkg.id)
        .order('start_date', { ascending: true })

      setPriceIntervals(intervals || [])

      // Fetch departures
      const { data: deps } = await supabase
        .from('package_departures')
        .select('id, departure_date, return_date, departure_location, available_spots, price_modifier')
        .eq('package_id', pkg.id)
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date', { ascending: true })

      setDepartures(deps || [])

      // Fetch optional supplements (add-ons like sea view, baby cot, etc.)
      const { data: supps } = await supabase
        .from('package_supplements')
        .select('id, code, name, amount, percent, per, currency, mandatory')
        .eq('package_id', pkg.id)
        .eq('mandatory', false)

      setSupplements(supps || [])

      // Set defaults
      if (pkg.meal_plans?.length) {
        setSelectedMealPlan(pkg.meal_plans[0])
      }
      if (rooms?.length) {
        setSelectedRoomType(rooms[0].id)
      }
      if (deps?.length) {
        setSelectedDepartureId(deps[0].id)
        setSelectedDate(deps[0].departure_date)
        setSelectedDepartureCity(deps[0].departure_location || pkg.departure_location || '')
      } else if (intervals?.length) {
        setSelectedDate(intervals[0].start_date)
      }
      if (pkg.default_duration) {
        setDuration(pkg.default_duration)
      }
      if (pkg.departure_location) {
        setSelectedDepartureCity(pkg.departure_location)
      }
    } catch (err) {
      console.error('Error fetching package details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }, [supabase])

  // Handle package selection
  const handlePackageSelect = (pkg: TravelPackage) => {
    setSelectedPackage(pkg)
    fetchPackageDetails(pkg)
  }

  // Go back to search
  const handleBackToSearch = () => {
    setSelectedPackage(null)
    setRoomTypes([])
    setPriceIntervals([])
    setDepartures([])
    setSupplements([])
    setSelectedRoomType('')
    setSelectedMealPlan('')
    setSelectedDepartureId('')
    setSelectedDate('')
    setSelectedDepartureCity('')
    setAdultsCount(2)
    setChildrenAges([])
    setDuration(7)
    setSelectedSupplements([])
  }

  // Children age handlers
  const addChild = () => {
    if (childrenAges.length < 4) {
      setChildrenAges([...childrenAges, 5])
    }
  }

  const removeChild = (index: number) => {
    setChildrenAges(childrenAges.filter((_, i) => i !== index))
  }

  const updateChildAge = (index: number, age: number) => {
    const newAges = [...childrenAges]
    newAges[index] = age
    setChildrenAges(newAges)
  }

  // Supplement toggle
  const toggleSupplement = (supplementId: string) => {
    setSelectedSupplements(prev =>
      prev.includes(supplementId)
        ? prev.filter(id => id !== supplementId)
        : [...prev, supplementId]
    )
  }

  // Get agency slug for link
  const getAgencySlug = useCallback(async () => {
    if (!organizationId) return null
    const { data } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', organizationId)
      .single()
    return data?.slug
  }, [supabase, organizationId])

  // Send configured offer
  const handleSendOffer = async () => {
    if (!selectedPackage || !leadId) return

    setSending(true)
    try {
      const slug = await getAgencySlug()
      if (!slug) throw new Error('Agency slug not found')

      // Build the offer link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trak.rs'
      let linkUrl = `${baseUrl}/a/${slug}/paket/${selectedPackage.id}`

      // Add query params for configured options
      const params = new URLSearchParams()
      if (selectedDate) params.set('date', selectedDate)
      if (selectedRoomType) params.set('room_type_id', selectedRoomType)
      if (selectedMealPlan) params.set('meal_plan', selectedMealPlan)
      if (adultsCount) params.set('adults', String(adultsCount))
      if (childrenAges.length > 0) {
        params.set('children', String(childrenAges.length))
        params.set('children_ages', childrenAges.join(','))
      }
      if (duration) params.set('duration', String(duration))
      if (selectedDepartureCity) params.set('departure_city', selectedDepartureCity)

      if (params.toString()) {
        linkUrl += `?${params.toString()}`
      }

      // Get room type name
      const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)

      // Get selected supplements data
      const selectedSupplementsData = supplements.filter(s => selectedSupplements.includes(s.id))

      // Record the sent offer and get tracking URL
      const response = await fetch(`/api/leads/${leadId}/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: selectedPackage.id,
          package_name: selectedPackage.name,
          destination: selectedPackage.destination_country,
          room_type_id: selectedRoomType || null,
          room_type_name: selectedRoom?.name || null,
          meal_plan: selectedMealPlan || null,
          selected_date: selectedDate || null,
          duration_nights: duration || null,
          guests_adults: adultsCount,
          guests_children: childrenAges.length,
          children_ages: childrenAges.length > 0 ? childrenAges : null,
          departure_city: selectedDepartureCity || null,
          link_url: linkUrl,
          // Include selected supplements/add-ons
          supplements: selectedSupplementsData.length > 0 ? selectedSupplementsData.map(s => ({
            id: s.id,
            name: s.name,
            amount: s.amount,
            percent: s.percent,
            per: s.per,
            currency: s.currency,
          })) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to record sent offer')
      }

      const { tracking_url } = await response.json()

      // Format message for chat
      const formatted = formatOfferForMessage(selectedPackage, {
        roomType: selectedRoom,
        mealPlan: selectedMealPlan,
        date: selectedDate,
        adults: adultsCount,
        childrenAges: childrenAges,
        duration: duration,
        departureCity: selectedDepartureCity,
        trackingUrl: tracking_url,
        supplements: selectedSupplementsData,
      })

      onSelectOffer(selectedPackage, formatted, tracking_url)
      handleBackToSearch()
      onClose()
    } catch (err) {
      console.error('Error sending offer:', err)
      alert('Greška pri slanju ponude')
    } finally {
      setSending(false)
    }
  }

  // Format offer for message
  const formatOfferForMessage = (
    pkg: TravelPackage,
    config: {
      roomType?: RoomType
      mealPlan?: string
      date?: string
      adults?: number
      childrenAges?: number[]
      duration?: number
      departureCity?: string
      trackingUrl?: string
      supplements?: Supplement[]
    }
  ): string => {
    let message = `🏨 **${pkg.hotel_name || pkg.name}**\n`
    message += `📍 ${pkg.destination_city ? `${pkg.destination_city}, ` : ''}${pkg.destination_country}\n`

    if (config.roomType) {
      message += `🛏️ ${config.roomType.name}\n`
    }

    if (config.mealPlan) {
      message += `🍽️ ${MEAL_LABELS[config.mealPlan] || config.mealPlan}\n`
    }

    if (config.date) {
      message += `📅 ${format(new Date(config.date), 'd. MMMM yyyy', { locale: sr })}\n`
    }

    if (config.duration) {
      message += `⏱️ ${config.duration} noći\n`
    }

    if (config.departureCity) {
      message += `🚌 Polazak: ${config.departureCity}\n`
    }

    const guests = []
    if (config.adults) guests.push(`${config.adults} odraslih`)
    if (config.childrenAges && config.childrenAges.length > 0) {
      guests.push(`${config.childrenAges.length} dece (${config.childrenAges.map(a => `${a}g`).join(', ')})`)
    }
    if (guests.length > 0) {
      message += `👥 ${guests.join(', ')}\n`
    }

    // Add selected supplements/add-ons
    if (config.supplements && config.supplements.length > 0) {
      message += `\n✨ **Dodaci:**\n`
      config.supplements.forEach(s => {
        const priceText = s.amount
          ? `€${s.amount}${s.per === 'night' ? '/noć' : s.per === 'stay' ? '/boravak' : s.per === 'person_night' ? '/os./noć' : ''}`
          : s.percent ? `${s.percent}%` : ''
        message += `  • ${s.name}${priceText ? ` (${priceText})` : ''}\n`
      })
    }

    message += `\n🔗 ${config.trackingUrl || ''}`

    return message.trim()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            {selectedPackage ? (
              <button
                onClick={handleBackToSearch}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Nazad</span>
              </button>
            ) : (
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Pronađi ponudu
              </h3>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search input - only show when not configuring */}
          {!selectedPackage && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži destinacije, hotele..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedPackage ? (
            // Configuration modal content
            <div className="p-4 space-y-4">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {/* Package summary */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Hotel className="w-4 h-4 text-slate-500" />
                      <h4 className="font-semibold text-slate-900">
                        {selectedPackage.hotel_name || selectedPackage.name}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedPackage.destination_city ? `${selectedPackage.destination_city}, ` : ''}
                      {selectedPackage.destination_country}
                    </p>
                  </div>

                  {/* Exact date selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Datum polaska
                    </label>
                    {departures.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          value={selectedDepartureId}
                          onChange={(e) => {
                            const dep = departures.find(d => d.id === e.target.value)
                            setSelectedDepartureId(e.target.value)
                            if (dep) {
                              setSelectedDate(dep.departure_date)
                              if (dep.departure_location) {
                                setSelectedDepartureCity(dep.departure_location)
                              }
                            }
                          }}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Izaberite polazak</option>
                          {departures.map((dep) => (
                            <option key={dep.id} value={dep.id}>
                              {format(new Date(dep.departure_date), 'd. MMM yyyy', { locale: sr })}
                              {dep.departure_location ? ` - ${dep.departure_location}` : ''}
                              {dep.available_spots !== undefined && dep.available_spots !== null && ` (${dep.available_spots} mesta)`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">ili izaberite tačan datum:</p>
                      </div>
                    ) : null}
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value)
                        setSelectedDepartureId('')
                      }}
                      min={selectedPackage.valid_from || undefined}
                      max={selectedPackage.valid_to || undefined}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trajanje (noći)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDuration(Math.max(1, duration - 1))}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-20 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setDuration(duration + 1)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Departure city */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mesto polaska
                    </label>
                    <input
                      type="text"
                      value={selectedDepartureCity}
                      onChange={(e) => setSelectedDepartureCity(e.target.value)}
                      placeholder="npr. Beograd"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Room Type Selection */}
                  {roomTypes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tip sobe
                      </label>
                      <select
                        value={selectedRoomType}
                        onChange={(e) => setSelectedRoomType(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sve sobe</option>
                        {roomTypes.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} {room.max_persons ? `(max ${room.max_persons})` : ''}
                          </option>
                        ))}
                      </select>

                      {/* Room warnings */}
                      {(() => {
                        const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)
                        if (!selectedRoom?.warnings?.length) return null
                        return (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">Upozorenje</p>
                                <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
                                  {selectedRoom.warnings.map((warning, i) => (
                                    <li key={i}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Room constraints validation */}
                      {(() => {
                        const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)
                        if (!selectedRoom) return null

                        const totalGuests = adultsCount + childrenAges.length
                        const issues: string[] = []

                        // Check minimum adults
                        if (selectedRoom.min_adults && adultsCount < selectedRoom.min_adults) {
                          issues.push(`Ova soba zahteva minimum ${selectedRoom.min_adults} odraslih osoba`)
                        }

                        // Check minimum occupancy
                        if (selectedRoom.min_occupancy && totalGuests < selectedRoom.min_occupancy) {
                          issues.push(`Ova soba zahteva minimum ${selectedRoom.min_occupancy} gostiju`)
                        }

                        // Check max occupancy
                        if (selectedRoom.max_persons && totalGuests > selectedRoom.max_persons) {
                          issues.push(`Ova soba prima maksimalno ${selectedRoom.max_persons} gostiju`)
                        }

                        if (issues.length === 0) return null

                        return (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Neispravna konfiguracija</p>
                                <ul className="text-sm text-red-700 mt-1 space-y-0.5">
                                  {issues.map((issue, i) => (
                                    <li key={i}>• {issue}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Meal Plan Selection */}
                  {selectedPackage.meal_plans && selectedPackage.meal_plans.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Ishrana
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPackage.meal_plans.map((mp) => (
                          <button
                            key={mp}
                            onClick={() => setSelectedMealPlan(mp)}
                            className={cn(
                              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                              selectedMealPlan === mp
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            )}
                          >
                            {MEAL_LABELS[mp] || mp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Adults count */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Broj odraslih
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">{adultsCount}</span>
                      <button
                        onClick={() => setAdultsCount(Math.min(6, adultsCount + 1))}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Children with ages */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Deca (sa godinama)
                    </label>
                    <div className="space-y-2">
                      {childrenAges.map((age, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Baby className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">Dete {index + 1}:</span>
                          <select
                            value={age}
                            onChange={(e) => updateChildAge(index, parseInt(e.target.value))}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 18 }, (_, i) => (
                              <option key={i} value={i}>{i} god.</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeChild(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {childrenAges.length < 4 && (
                        <button
                          onClick={addChild}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Dodaj dete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional Supplements (Add-ons) */}
                  {supplements.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Sparkles className="w-4 h-4 inline mr-1.5 text-amber-500" />
                        Dodaci (opciono)
                      </label>
                      <div className="space-y-2">
                        {supplements.map((supp) => {
                          const isSelected = selectedSupplements.includes(supp.id)
                          // Format price display
                          let priceText = ''
                          if (supp.amount) {
                            const perLabel = supp.per === 'night' ? '/noć' :
                                            supp.per === 'stay' ? '/boravak' :
                                            supp.per === 'person_night' ? '/os./noć' :
                                            supp.per === 'person_stay' ? '/os.' : ''
                            priceText = `€${supp.amount}${perLabel}`
                          } else if (supp.percent) {
                            priceText = `${supp.percent}%`
                          }

                          return (
                            <button
                              key={supp.id}
                              type="button"
                              onClick={() => toggleSupplement(supp.id)}
                              className={cn(
                                'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left',
                                isSelected
                                  ? 'border-amber-400 bg-amber-50'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'w-5 h-5 rounded-md flex items-center justify-center transition-colors',
                                  isSelected
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-100'
                                )}>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <span className={cn(
                                  'font-medium',
                                  isSelected ? 'text-amber-900' : 'text-slate-700'
                                )}>
                                  {supp.name}
                                </span>
                              </div>
                              {priceText && (
                                <span className={cn(
                                  'text-sm font-medium',
                                  isSelected ? 'text-amber-700' : 'text-slate-500'
                                )}>
                                  {priceText}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Izaberite dodatke koji će biti uključeni u ponudu
                      </p>
                    </div>
                  )}

                  {/* Single Occupancy Surcharge Notice */}
                  {(() => {
                    if (adultsCount !== 1 || childrenAges.length > 0) return null

                    const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)
                    const surchargePercent = selectedRoom?.single_surcharge_percent || selectedPackage.single_surcharge_percent

                    if (!surchargePercent) return null

                    return (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-purple-800">Doplata za jednu osobu</p>
                            <p className="text-sm text-purple-700 mt-0.5">
                              Za jednokrevetno korišćenje dvokrevetne sobe, doplata iznosi {surchargePercent}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Tax Disclaimer */}
                  {selectedPackage.tax_disclaimer && (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-600">{selectedPackage.tax_disclaimer}</p>
                      </div>
                    </div>
                  )}

                  {/* Link Preview */}
                  <div className="bg-blue-50 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-2">
                      <LinkIcon className="w-4 h-4" />
                      Link će biti praćen
                    </div>
                    <p className="text-xs text-blue-600">
                      Kada klijent klikne na link, videćete to u sistemu.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Package search results
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nema pronađenih ponuda</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Pokušajte sa drugim pojmom</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Image or placeholder */}
                        <div className="w-16 h-16 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden">
                          {pkg.package_images?.[0]?.url ? (
                            <img
                              src={pkg.package_images[0].url}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Hotel className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {pkg.hotel_name || pkg.name}
                          </h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {pkg.destination_city ? `${pkg.destination_city}, ` : ''}{pkg.destination_country}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                            {pkg.default_duration && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {pkg.default_duration} noći
                              </span>
                            )}
                            {pkg.price_from && (
                              <span className="font-medium text-slate-700">
                                od €{pkg.price_from.toLocaleString()}
                              </span>
                            )}
                            {pkg.transport_type && (
                              <span className="flex items-center gap-1">
                                {pkg.transport_type === 'avion' ? <Plane className="w-3 h-3" /> : <Bus className="w-3 h-3" />}
                                {TRANSPORT_LABELS[pkg.transport_type]?.label || pkg.transport_type}
                              </span>
                            )}
                            {pkg.departure_location && (
                              <span className="text-slate-400">
                                iz {pkg.departure_location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 bg-slate-50">
          {selectedPackage ? (
            <button
              onClick={handleSendOffer}
              disabled={sending || !leadId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Pošalji ponudu
                </>
              )}
            </button>
          ) : (
            <p className="text-xs text-slate-500 text-center">
              Izaberite paket da ga konfigurišete i pošaljete
            </p>
          )}
        </div>
      </div>
    </>
  )
}
