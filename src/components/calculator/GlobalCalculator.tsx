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
  ChevronDown,
  Hotel,
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
  Calculator,
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

interface HotelPrice {
  id: string
  room_type_id: string
  interval_id: string
  price_nd?: number
  price_bb?: number
  price_hb?: number
  price_fb?: number
  price_ai?: number
}

interface ChildrenPolicy {
  id: string
  rule_name?: string
  min_adults?: number
  max_adults?: number
  child_position?: number
  room_type_codes?: string[]
  bed_type?: string
  age_from: number
  age_to: number
  discount_type: 'FREE' | 'PERCENT' | 'FIXED'
  discount_value?: number
  priority?: number
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

export function GlobalCalculator() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [loading, setLoading] = useState(false)
  const { organizationId } = useUser()
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
  const [adultsCount, setAdultsCount] = useState<number>(2)
  const [childrenAges, setChildrenAges] = useState<number[]>([])
  const [duration, setDuration] = useState<number>(7)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([])
  const [hotelPrices, setHotelPrices] = useState<HotelPrice[]>([])
  const [childrenPolicies, setChildrenPolicies] = useState<ChildrenPolicy[]>([])
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0)
  const [supplementsExpanded, setSupplementsExpanded] = useState(false)

  // Toggle the calculator
  const toggleCalculator = () => {
    setIsOpen(!isOpen)
  }

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

  // Search on query change - only when there's a search query
  useEffect(() => {
    if (isOpen && !selectedPackage && organizationId && searchQuery.trim()) {
      const debounce = setTimeout(searchPackages, 300)
      return () => clearTimeout(debounce)
    }
    // Clear packages when search is empty
    if (!searchQuery.trim()) {
      setPackages([])
    }
  }, [isOpen, searchQuery, searchPackages, selectedPackage, organizationId])

  // Fetch package details when package is selected
  const fetchPackageDetails = useCallback(async (pkg: TravelPackage) => {
    setLoadingDetails(true)
    try {
      // Fetch room types
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, code, name, max_persons, min_adults, min_occupancy, warnings, single_surcharge_percent')
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

      // Fetch optional supplements
      const { data: supps } = await supabase
        .from('package_supplements')
        .select('id, code, name, amount, percent, per, currency, mandatory')
        .eq('package_id', pkg.id)
        .eq('mandatory', false)

      setSupplements(supps || [])

      // Fetch hotel prices
      const { data: prices } = await supabase
        .from('hotel_prices')
        .select('id, room_type_id, interval_id, price_nd, price_bb, price_hb, price_fb, price_ai')
        .eq('package_id', pkg.id)

      setHotelPrices(prices || [])

      // Fetch children policies
      const { data: policies } = await supabase
        .from('children_policy_rules')
        .select('id, rule_name, min_adults, max_adults, child_position, room_type_codes, bed_type, age_from, age_to, discount_type, discount_value, priority')
        .eq('package_id', pkg.id)
        .order('priority', { ascending: false })

      setChildrenPolicies(policies || [])

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
      } else if (intervals?.length) {
        setSelectedDate(intervals[0].start_date)
      }
      if (pkg.default_duration) {
        setDuration(pkg.default_duration)
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
    setHotelPrices([])
    setChildrenPolicies([])
    setCalculatedPrice(0)
    setSelectedRoomType('')
    setSelectedMealPlan('')
    setSelectedDepartureId('')
    setSelectedDate('')
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

  // Helper to get price from hotel_prices based on meal plan
  const getPriceForMealPlan = (price: HotelPrice, mealPlan: string): number => {
    const mealPlanMap: Record<string, keyof HotelPrice> = {
      'ND': 'price_nd',
      'BB': 'price_bb',
      'HB': 'price_hb',
      'FB': 'price_fb',
      'AI': 'price_ai',
    }
    const key = mealPlanMap[mealPlan]
    return key ? (price[key] as number) || 0 : 0
  }

  // Helper to find matching children policy
  const findChildPolicy = (childAge: number, childPosition: number, roomTypeCode?: string): ChildrenPolicy | null => {
    const matchingPolicies = childrenPolicies.filter(policy => {
      if (childAge < policy.age_from || childAge > policy.age_to) return false
      if (policy.min_adults && adultsCount < policy.min_adults) return false
      if (policy.max_adults && adultsCount > policy.max_adults) return false
      if (policy.child_position && policy.child_position !== childPosition) return false
      if (policy.room_type_codes && policy.room_type_codes.length > 0 && roomTypeCode) {
        if (!policy.room_type_codes.includes(roomTypeCode)) return false
      }
      return true
    })

    if (matchingPolicies.length === 0) return null

    matchingPolicies.sort((a, b) => {
      if (a.discount_type === 'FREE' && b.discount_type !== 'FREE') return -1
      if (b.discount_type === 'FREE' && a.discount_type !== 'FREE') return 1
      if (a.discount_type === 'PERCENT' && b.discount_type === 'PERCENT') {
        return (b.discount_value || 0) - (a.discount_value || 0)
      }
      if (a.discount_type === 'PERCENT' && b.discount_type === 'FIXED') return -1
      if (b.discount_type === 'PERCENT' && a.discount_type === 'FIXED') return 1
      if (a.discount_type === 'FIXED' && b.discount_type === 'FIXED') {
        return (a.discount_value || 0) - (b.discount_value || 0)
      }
      return 0
    })

    return matchingPolicies[0]
  }

  // Calculate child price based on policy
  const calculateChildPrice = (basePrice: number, policy: ChildrenPolicy | null): number => {
    if (!policy) return basePrice

    switch (policy.discount_type) {
      case 'FREE':
        return 0
      case 'PERCENT':
        const discountPercent = policy.discount_value || 0
        return basePrice * (1 - discountPercent / 100)
      case 'FIXED':
        const fixedPrice = policy.discount_value || 0
        return fixedPrice
      default:
        return basePrice
    }
  }

  // Calculate price when selections change
  useEffect(() => {
    if (!selectedPackage || !selectedRoomType || !selectedMealPlan || !selectedDate) {
      setCalculatedPrice(0)
      return
    }

    const selectedInterval = priceIntervals.find(interval => {
      const start = new Date(interval.start_date)
      const end = new Date(interval.end_date)
      const date = new Date(selectedDate)
      return date >= start && date <= end
    })

    if (!selectedInterval) {
      setCalculatedPrice(0)
      return
    }

    const priceEntry = hotelPrices.find(
      p => p.room_type_id === selectedRoomType &&
           p.interval_id === selectedInterval.id
    )

    if (!priceEntry) {
      setCalculatedPrice(0)
      return
    }

    const pricePerPerson = getPriceForMealPlan(priceEntry, selectedMealPlan)

    if (!pricePerPerson) {
      setCalculatedPrice(0)
      return
    }

    const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)
    const roomCode = selectedRoom?.code

    // Calculate adults price
    const adultsPrice = pricePerPerson * adultsCount * duration

    // Calculate children price with discounts
    let childrenPrice = 0
    const childDiscountMultipliers: number[] = []
    childrenAges.forEach((age, index) => {
      const childPosition = index + 1
      const policy = findChildPolicy(age, childPosition, roomCode)
      const childPricePerNight = calculateChildPrice(pricePerPerson, policy)
      childrenPrice += childPricePerNight * duration

      if (!policy) {
        childDiscountMultipliers.push(1)
      } else if (policy.discount_type === 'FREE') {
        childDiscountMultipliers.push(0)
      } else if (policy.discount_type === 'PERCENT') {
        childDiscountMultipliers.push(1 - (policy.discount_value || 0) / 100)
      } else {
        childDiscountMultipliers.push(1)
      }
    })

    const basePrice = adultsPrice + childrenPrice

    // Add supplements
    let supplementsTotal = 0
    const selectedSupplementsData = supplements.filter(s => selectedSupplements.includes(s.id))
    for (const supp of selectedSupplementsData) {
      const amount = supp.amount
      if (amount) {
        if (supp.per === 'night') {
          supplementsTotal += amount * duration
        } else if (supp.per === 'person_night') {
          supplementsTotal += amount * adultsCount * duration
          childDiscountMultipliers.forEach(multiplier => {
            supplementsTotal += amount * multiplier * duration
          })
        } else if (supp.per === 'person_stay') {
          supplementsTotal += amount * adultsCount
          childDiscountMultipliers.forEach(multiplier => {
            supplementsTotal += amount * multiplier
          })
        } else {
          supplementsTotal += amount
        }
      }
    }

    setCalculatedPrice(basePrice + supplementsTotal)
  }, [selectedPackage, selectedRoomType, selectedMealPlan, selectedDate, duration, adultsCount, childrenAges, priceIntervals, hotelPrices, supplements, selectedSupplements, childrenPolicies, roomTypes])

  return (
    <>
      {/*
        Simple structure:
        - Fixed position with top at header (64px)
        - Panel has max-height that animates from 0 to 70vh
        - Lip is always below panel
        - overflow-hidden clips the panel content
      */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        {/* Panel wrapper - animates max-height */}
        <div
          className="w-[90vw] max-w-2xl bg-white rounded-b-2xl shadow-2xl"
          style={{
            maxHeight: isOpen ? 'calc(80vh - 64px)' : '0px',
            transition: 'max-height 300ms ease-out',
            overflow: 'hidden'
          }}
        >
          {/* Panel Content - scrollable */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 112px)' }}>
            {selectedPackage ? (
              // Configuration view
              <div className="space-y-4">
                {/* Header with back button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToSearch}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {selectedPackage.hotel_name || selectedPackage.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selectedPackage.destination_city ? `${selectedPackage.destination_city}, ` : ''}
                      {selectedPackage.destination_country}
                    </p>
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <>
                    {/* Configuration Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Datum</label>
                        {departures.length > 0 ? (
                          <select
                            value={selectedDepartureId}
                            onChange={(e) => {
                              const dep = departures.find(d => d.id === e.target.value)
                              setSelectedDepartureId(e.target.value)
                              if (dep) setSelectedDate(dep.departure_date)
                            }}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                          >
                            {departures.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {format(new Date(dep.departure_date), 'd. MMM yyyy', { locale: sr })}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        )}
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Trajanje (noći)</label>
                        <div className="flex items-center border border-slate-200 rounded-xl">
                          <button
                            onClick={() => setDuration(Math.max(1, duration - 1))}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-l-xl"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-medium">{duration}</span>
                          <button
                            onClick={() => setDuration(duration + 1)}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-r-xl"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Adults */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Odrasli</label>
                        <div className="flex items-center border border-slate-200 rounded-xl">
                          <button
                            onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-l-xl"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-medium">{adultsCount}</span>
                          <button
                            onClick={() => setAdultsCount(Math.min(6, adultsCount + 1))}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-r-xl"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Deca</label>
                        <div className="flex items-center border border-slate-200 rounded-xl">
                          <button
                            onClick={() => childrenAges.length > 0 && removeChild(childrenAges.length - 1)}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-l-xl"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-medium">{childrenAges.length}</span>
                          <button
                            onClick={addChild}
                            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-r-xl"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Children Ages */}
                    {childrenAges.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Uzrast dece</label>
                        <div className="flex gap-2 flex-wrap">
                          {childrenAges.map((age, index) => (
                            <select
                              key={index}
                              value={age}
                              onChange={(e) => updateChildAge(index, parseInt(e.target.value))}
                              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                            >
                              {Array.from({ length: 18 }, (_, i) => (
                                <option key={i} value={i}>{i} god.</option>
                              ))}
                            </select>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Room Type - filtered by guest count */}
                    {(() => {
                      const totalGuests = adultsCount + childrenAges.length
                      const filteredRooms = roomTypes.filter(room => {
                        // Check max capacity
                        if (room.max_persons && totalGuests > room.max_persons) return false
                        // Check min occupancy (guests must meet minimum)
                        if (room.min_occupancy && totalGuests < room.min_occupancy) return false
                        // Check min adults
                        if (room.min_adults && adultsCount < room.min_adults) return false
                        return true
                      })

                      // Auto-select first valid room if current selection is invalid
                      const currentRoomValid = filteredRooms.some(r => r.id === selectedRoomType)
                      if (!currentRoomValid && filteredRooms.length > 0 && selectedRoomType) {
                        // Use useEffect would be cleaner, but for simplicity:
                        setTimeout(() => setSelectedRoomType(filteredRooms[0].id), 0)
                      }

                      return filteredRooms.length > 0 ? (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Tip sobe</label>
                          <select
                            value={selectedRoomType}
                            onChange={(e) => setSelectedRoomType(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            {filteredRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name || room.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : roomTypes.length > 0 ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-sm text-amber-800">
                            Nema dostupnih soba za {totalGuests} {totalGuests === 1 ? 'osobu' : totalGuests < 5 ? 'osobe' : 'osoba'}
                          </p>
                        </div>
                      ) : null
                    })()}

                    {/* Meal Plan */}
                    {selectedPackage.meal_plans && selectedPackage.meal_plans.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ishrana</label>
                        <select
                          value={selectedMealPlan}
                          onChange={(e) => setSelectedMealPlan(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          {selectedPackage.meal_plans.map((mp) => (
                            <option key={mp} value={mp}>{MEAL_LABELS[mp] || mp}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Supplements - expandable */}
                    {supplements.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSupplementsExpanded(!supplementsExpanded)}
                          className="w-full flex items-center justify-between text-sm font-medium text-slate-700 py-2 hover:text-slate-900"
                        >
                          <span>Dodaci ({supplements.length})</span>
                          <div className="flex items-center gap-2">
                            {selectedSupplements.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {selectedSupplements.length} izabrano
                              </span>
                            )}
                            <ChevronDown className={cn(
                              'w-4 h-4 transition-transform',
                              supplementsExpanded && 'rotate-180'
                            )} />
                          </div>
                        </button>
                        <div
                          className="overflow-hidden transition-all duration-200"
                          style={{
                            maxHeight: supplementsExpanded ? `${supplements.length * 56}px` : '0px'
                          }}
                        >
                          <div className="space-y-2 pt-2">
                            {supplements.map((supp) => {
                              const isSelected = selectedSupplements.includes(supp.id)
                              let priceText = ''
                              if (supp.amount) {
                                const perLabel = supp.per === 'night' ? '/noć' :
                                                supp.per === 'stay' ? '/boravak' :
                                                supp.per === 'person_night' ? '/os./noć' :
                                                supp.per === 'person_stay' ? '/os.' : ''
                                priceText = `+€${supp.amount}${perLabel}`
                              }

                              return (
                                <label
                                  key={supp.id}
                                  className={cn(
                                    'flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all',
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-slate-200 hover:bg-slate-50'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSupplement(supp.id)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span className="flex-1 text-sm">{supp.name}</span>
                                  <span className="text-sm text-slate-500">{priceText}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Price Result */}
                    {calculatedPrice > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Ukupno za {adultsCount + childrenAges.length} osoba</p>
                            <p className="text-xs text-slate-400">€{Math.round(calculatedPrice / (adultsCount + childrenAges.length))} po osobi</p>
                          </div>
                          <p className="text-3xl font-bold text-green-600">€{calculatedPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Search view
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Brzi kalkulator</h2>
                    <p className="text-sm text-slate-500">Izračunaj cenu aranžmana</p>
                  </div>
                </div>

                {/* Package Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Paket / Hotel</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pretraži pakete..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Package Results */}
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : !searchQuery.trim() ? (
                    <div className="text-center py-8 text-slate-500">
                      <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Unesite naziv paketa ili destinacije</p>
                    </div>
                  ) : packages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Nema pronađenih paketa</p>
                    </div>
                  ) : (
                    packages.slice(0, 5).map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors"
                      >
                        <div className="w-14 h-14 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden">
                          {pkg.package_images?.[0]?.url ? (
                            <img
                              src={pkg.package_images[0].url}
                              alt={pkg.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Hotel className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {pkg.hotel_name || pkg.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {pkg.destination_city ? `${pkg.destination_city}, ` : ''}{pkg.destination_country}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lip button - always visible below panel */}
        <button
          onClick={toggleCalculator}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-b-xl shadow-lg transition-colors"
        >
          <Calculator className="w-4 h-4" />
          <span className="text-sm font-medium">Kalkulator</span>
          <ChevronDown className={cn(
            'w-4 h-4 transition-transform duration-300',
            isOpen && 'rotate-180'
          )} />
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={toggleCalculator}
          className="fixed inset-0 bg-black/20 z-30"
        />
      )}
    </>
  )
}
