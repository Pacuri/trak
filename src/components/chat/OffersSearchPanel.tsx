'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  X,
  Package,
  MapPin,
  Calendar,
  Users,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Utensils,
  Hotel,
  Link as LinkIcon,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

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
  image_url: string | null
  meal_plans?: string[]
}

interface RoomType {
  id: string
  code: string
  name: string
  max_persons?: number
}

interface PriceInterval {
  id: string
  name?: string
  start_date: string
  end_date: string
}

interface OffersSearchPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectOffer: (offer: TravelPackage, formatted: string, trackingUrl?: string) => void
  leadId?: string  // Required for tracking sent offers
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
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Configuration selections
  const [selectedRoomType, setSelectedRoomType] = useState<string>('')
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [adultsCount, setAdultsCount] = useState<number>(2)
  const [childrenCount, setChildrenCount] = useState<number>(0)
  const [sending, setSending] = useState(false)

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
          image_url
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(15)

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
    if (isOpen && !selectedPackage) {
      const debounce = setTimeout(searchPackages, 300)
      return () => clearTimeout(debounce)
    }
  }, [isOpen, searchQuery, searchPackages, selectedPackage])

  // Fetch package details when package is selected
  const fetchPackageDetails = useCallback(async (pkg: TravelPackage) => {
    setLoadingDetails(true)
    try {
      // Fetch room types
      const { data: rooms } = await supabase
        .from('room_types')
        .select('id, code, name, max_persons')
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

      // Set defaults
      if (pkg.meal_plans?.length) {
        setSelectedMealPlan(pkg.meal_plans[0])
      }
      if (rooms?.length) {
        setSelectedRoomType(rooms[0].id)
      }
      if (intervals?.length) {
        setSelectedDate(intervals[0].start_date)
      }
    } catch (err) {
      console.error('Error fetching package details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }, [supabase])

  // Handle package selection - open configuration modal
  const handlePackageSelect = (pkg: TravelPackage) => {
    setSelectedPackage(pkg)
    fetchPackageDetails(pkg)
  }

  // Go back to search
  const handleBackToSearch = () => {
    setSelectedPackage(null)
    setRoomTypes([])
    setPriceIntervals([])
    setSelectedRoomType('')
    setSelectedMealPlan('')
    setSelectedDate('')
    setAdultsCount(2)
    setChildrenCount(0)
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
      if (childrenCount) params.set('children', String(childrenCount))

      if (params.toString()) {
        linkUrl += `?${params.toString()}`
      }

      // Get room type name
      const selectedRoom = roomTypes.find(r => r.id === selectedRoomType)

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
          duration_nights: selectedPackage.default_duration || null,
          guests_adults: adultsCount,
          guests_children: childrenCount,
          link_url: linkUrl,
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
        children: childrenCount,
        trackingUrl: tracking_url,
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
      children?: number
      trackingUrl?: string
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

    if (pkg.default_duration) {
      message += `⏱️ ${pkg.default_duration} noći\n`
    }

    if (config.adults || config.children) {
      const guests = []
      if (config.adults) guests.push(`${config.adults} odraslih`)
      if (config.children) guests.push(`${config.children} dece`)
      message += `👥 ${guests.join(', ')}\n`
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
                    {selectedPackage.default_duration && (
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedPackage.default_duration} noći
                      </p>
                    )}
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
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              selectedMealPlan === mp
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {MEAL_LABELS[mp] || mp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Selection */}
                  {priceIntervals.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Datum polaska
                      </label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {priceIntervals.map((interval) => (
                          <option key={interval.id} value={interval.start_date}>
                            {format(new Date(interval.start_date), 'd. MMM', { locale: sr })} - {format(new Date(interval.end_date), 'd. MMM yyyy', { locale: sr })}
                            {interval.name ? ` (${interval.name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* No intervals - show date picker */}
                  {priceIntervals.length === 0 && selectedPackage.valid_from && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Datum polaska
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={selectedPackage.valid_from}
                        max={selectedPackage.valid_to || undefined}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Guest Count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Odrasli
                      </label>
                      <select
                        value={adultsCount}
                        onChange={(e) => setAdultsCount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Deca
                      </label>
                      <select
                        value={childrenCount}
                        onChange={(e) => setChildrenCount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

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
                          {pkg.image_url ? (
                            <img
                              src={pkg.image_url}
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
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
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
                            {pkg.meal_plans && pkg.meal_plans.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Utensils className="w-3 h-3" />
                                {pkg.meal_plans[0]}
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
