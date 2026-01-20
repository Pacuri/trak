'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, Search, MessageCircle, ArrowRight, ChevronDown, ChevronUp, X } from 'lucide-react'
import Link from 'next/link'
import type { Offer, QualificationData } from '@/types'
import { useAgencySettings } from '@/hooks/use-agency-settings'
import InstantOfferCard from '@/components/public/InstantOfferCard'
import InquiryOfferCard from '@/components/public/InquiryOfferCard'
import type { AgencyInquirySettings } from '@/types/inquiry'
import type { Departure } from '@/types/packages'

// Extended Offer type with calculated prices
export interface ExtendedOffer extends Offer {
  valid_from?: string | null
  valid_to?: string | null
  // package_id is already in Offer, don't redeclare
  duration_nights?: number | null
  calculated_total?: number | null
  calculated_per_person?: number | null
  price_calculation_error?: string | null
}

// Map departure to Offer format for backwards compatibility with existing UI
function mapDepartureToOffer(departure: Departure): ExtendedOffer {
  // For na_upit packages, use valid_from/valid_to if available
  const extendedDep = departure as any

  return {
    id: departure.id,
    organization_id: departure.organization_id,
    name: departure.package_name || departure.hotel_name || 'Ponuda',
    description: null,
    star_rating: departure.hotel_stars || null,
    country: departure.destination_country || '',
    city: departure.destination_city || null,
    departure_date: departure.departure_date,
    return_date: departure.return_date,
    price_per_person: departure.effective_price || departure.price_override || 0,
    original_price: departure.original_price || null,
    currency: 'EUR',
    total_spots: departure.total_spots,
    available_spots: departure.available_spots,
    accommodation_type: null, // Not directly mapped
    board_type: departure.board_type as any || null,
    transport_type: departure.transport_type as any || null,
    inventory_type: departure.package_type === 'fiksni' ? 'owned' : 'inquiry',
    is_recommended: departure.is_featured || false,
    views_total: 0,
    views_last_24h: 0,
    status: departure.status as any || 'active',
    created_at: departure.created_at,
    updated_at: departure.updated_at,
    images: departure.primary_image_url
      ? [{ id: '1', offer_id: departure.id, url: departure.primary_image_url, alt_text: null, position: 0, is_primary: true, created_at: '' }]
      : (departure as any).images || [],
    // Extended fields for na_upit packages
    valid_from: extendedDep.valid_from || null,
    valid_to: extendedDep.valid_to || null,
    package_id: extendedDep.package_id || null,
    duration_nights: extendedDep.duration_nights || null,
    // Calculated prices from API
    calculated_total: extendedDep.calculated_total || null,
    calculated_per_person: extendedDep.calculated_per_person || null,
    price_calculation_error: extendedDep.price_calculation_error || null,
  }
}

// No longer splitting by type - showing unified list sorted by relevance

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [offers, setOffers] = useState<ExtendedOffer[]>([])
  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [matchingCount, setMatchingCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [inquirySettings, setInquirySettings] = useState<AgencyInquirySettings | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [editedQualification, setEditedQualification] = useState<QualificationData | null>(null)
  
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)

  // Fetch inquiry settings
  useEffect(() => {
    async function fetchInquirySettings() {
      try {
        const response = await fetch(`/api/public/agencies/${slug}/landing`)
        if (response.ok) {
          const data = await response.json()
          setInquirySettings({
            allow_custom_inquiries: data.inquiry_settings.allow_custom_inquiries,
            show_inquiry_with_results: data.inquiry_settings.show_inquiry_with_results,
            inquiry_response_text: data.inquiry_settings.inquiry_response_text,
            inquiry_notification_email: null,
            inquiry_notification_phone: null,
          })
        }
      } catch (err) {
        console.error('Error fetching inquiry settings:', err)
      }
    }
    fetchInquirySettings()
  }, [slug])

  // Build query params from qualification data
  const buildQueryParams = useCallback((qualData: QualificationData, pageNum: number) => {
    const queryParams = new URLSearchParams()
    queryParams.set('page', String(pageNum))
    queryParams.set('limit', '6')

    // Guest params for price calculation
    queryParams.set('adults', String(qualData.guests.adults))
    if (qualData.guests.childAges && qualData.guests.childAges.length > 0) {
      queryParams.set('child_ages', qualData.guests.childAges.join(','))
    }
    if (qualData.dates.duration) {
      queryParams.set('duration', String(qualData.dates.duration))
    }

    if (qualData.destination.country) {
      queryParams.set('country', qualData.destination.country)
    }
    if (qualData.destination.city) {
      queryParams.set('city', qualData.destination.city)
    }
    if (qualData.dates.month) {
      queryParams.set('month', qualData.dates.month)
    }
    if (qualData.dates.exactStart) {
      queryParams.set('departure_from', qualData.dates.exactStart)
    }
    if (qualData.dates.exactEnd) {
      queryParams.set('departure_to', qualData.dates.exactEnd)
    }
    if (qualData.budget.min) {
      queryParams.set('min_price', String(qualData.budget.min))
    }
    if (qualData.budget.max) {
      queryParams.set('max_price', String(qualData.budget.max))
    }
    if (qualData.accommodation.type) {
      queryParams.set('accommodation_type', qualData.accommodation.type)
    }
    if (qualData.accommodation.board) {
      queryParams.set('board_type', qualData.accommodation.board)
    }
    if (qualData.accommodation.transport) {
      queryParams.set('transport_type', qualData.accommodation.transport)
    }

    return queryParams
  }, [])

  // Fetch departures from packages API only
  const fetchOffers = useCallback(async (qualData: QualificationData, pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const queryParams = buildQueryParams(qualData, pageNum)
      
      // Use packages API only (no fallback to offers)
      const packagesResponse = await fetch(
        `/api/public/agencies/${slug}/packages?${queryParams.toString()}`
      )

      if (!packagesResponse.ok) {
        throw new Error('Failed to fetch packages')
      }

      const packagesData = await packagesResponse.json()
      
      // Map departures to offers format for UI compatibility
      const mappedOffers = (packagesData.departures || []).map(mapDepartureToOffer)
      
      if (append) {
        setOffers(prev => [...prev, ...mappedOffers])
      } else {
        setOffers(mappedOffers)
        setMatchingCount(packagesData.matchingCount || 0)
        setIsFallback(packagesData.isFallback || false)
      }
      
      setHasMore(packagesData.hasMore || false)
      setPage(pageNum)
    } catch (err) {
      console.error('Error fetching packages:', err)
      if (pageNum === 1) {
        setError('Greška pri učitavanju ponuda')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [slug, buildQueryParams])

  // Initial load
  useEffect(() => {
    const storedQualification = sessionStorage.getItem('qualification')
    if (!storedQualification) {
      router.push(`/a/${slug}/qualify`)
      return
    }

    const qualData = JSON.parse(storedQualification) as QualificationData
    setQualification(qualData)
    fetchOffers(qualData, 1)
  }, [slug, router, fetchOffers])

  // Load more function
  const loadMore = useCallback(() => {
    if (!qualification || loadingMore || !hasMore) return
    fetchOffers(qualification, page + 1, true)
  }, [qualification, loadingMore, hasMore, page, fetchOffers])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMore])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-gray-600">Tražimo najbolje ponude za vas...</p>
        </div>
      </div>
    )
  }

  if (!qualification) {
    return null
  }

  const guestCount = qualification.guests.adults + qualification.guests.children

  // Find the first recommended offer index for badge display
  const firstRecommendedIndex = offers.findIndex(offer => offer.is_recommended)

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/a/${slug}/qualify`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Promeni pretragu</span>
            </Link>
            <button
              onClick={() => {
                setPage(1)
                if (qualification) fetchOffers(qualification, 1)
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Osveži</span>
            </button>
          </div>
        </div>
      </header>

      {/* Search summary with expandable filters */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4">
          {/* Summary row */}
          <div className="py-3 flex items-center justify-between">
            <p className="text-blue-800 text-sm">
              <span className="font-semibold">{qualification.destination.country}</span>
              {qualification.destination.city && ` • ${qualification.destination.city}`}
              {' • '}
              <span>{guestCount} {guestCount === 1 ? 'putnik' : 'putnika'}</span>
              {qualification.dates.month && ` • ${qualification.dates.month}`}
              {qualification.dates.duration && ` • ${qualification.dates.duration} noći`}
            </p>
            <button
              onClick={() => {
                if (!showFilters) {
                  setEditedQualification(qualification)
                }
                setShowFilters(!showFilters)
              }}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
            >
              <span>Promeni</span>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable filter panel */}
          {showFilters && editedQualification && (
            <div className="pb-5 pt-4 animate-in slide-in-from-top-2 duration-200">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Guests & Duration row */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-100">
                  {/* Adults */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-lg">👤</span>
                      Odrasli
                    </label>
                    <div className="flex items-center bg-gray-50 rounded-xl p-1">
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          guests: { ...prev.guests, adults: Math.max(1, prev.guests.adults - 1) }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-xl font-bold text-gray-900">{editedQualification.guests.adults}</span>
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          guests: { ...prev.guests, adults: Math.min(10, prev.guests.adults + 1) }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-lg">👶</span>
                      Deca
                    </label>
                    <div className="flex items-center bg-gray-50 rounded-xl p-1">
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          guests: {
                            ...prev.guests,
                            children: Math.max(0, prev.guests.children - 1),
                            childAges: prev.guests.childAges.slice(0, Math.max(0, prev.guests.children - 1))
                          }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-xl font-bold text-gray-900">{editedQualification.guests.children}</span>
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          guests: {
                            ...prev.guests,
                            children: Math.min(6, prev.guests.children + 1),
                            childAges: [...prev.guests.childAges, 5]
                          }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-lg">🌙</span>
                      Noći
                    </label>
                    <div className="flex items-center bg-gray-50 rounded-xl p-1">
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          dates: { ...prev.dates, duration: Math.max(1, prev.dates.duration - 1) }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-xl font-bold text-gray-900">{editedQualification.dates.duration}</span>
                      <button
                        onClick={() => setEditedQualification(prev => prev ? {
                          ...prev,
                          dates: { ...prev.dates, duration: Math.min(30, prev.dates.duration + 1) }
                        } : null)}
                        className="w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-600 font-medium text-lg hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Month */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-lg">📅</span>
                      Mesec
                    </label>
                    <select
                      value={editedQualification.dates.month || ''}
                      onChange={(e) => setEditedQualification(prev => prev ? {
                        ...prev,
                        dates: { ...prev.dates, month: e.target.value || null }
                      } : null)}
                      className="w-full h-12 px-4 rounded-xl bg-gray-50 border-0 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">Bilo kada</option>
                      <option value="jan">Januar</option>
                      <option value="feb">Februar</option>
                      <option value="mar">Mart</option>
                      <option value="apr">April</option>
                      <option value="maj">Maj</option>
                      <option value="jun">Jun</option>
                      <option value="jul">Jul</option>
                      <option value="avg">Avgust</option>
                      <option value="sep">Septembar</option>
                      <option value="okt">Oktobar</option>
                      <option value="nov">Novembar</option>
                      <option value="dec">Decembar</option>
                    </select>
                  </div>
                </div>

                {/* Child ages (if children > 0) */}
                {editedQualification.guests.children > 0 && (
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-amber-800">Uzrast dece:</span>
                      {editedQualification.guests.childAges.map((age, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 shadow-sm">
                          <span className="text-xs text-amber-600 font-medium">{idx + 1}.</span>
                          <select
                            value={age}
                            onChange={(e) => {
                              const newAges = [...editedQualification.guests.childAges]
                              newAges[idx] = parseInt(e.target.value)
                              setEditedQualification(prev => prev ? {
                                ...prev,
                                guests: { ...prev.guests, childAges: newAges }
                              } : null)
                            }}
                            className="bg-transparent border-0 text-gray-900 font-medium text-sm focus:ring-0 cursor-pointer pr-6"
                          >
                            {Array.from({ length: 18 }, (_, i) => (
                              <option key={i} value={i}>{i} god</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* More filters toggle & content */}
                <div className="px-4 py-3 bg-gray-50">
                  <button
                    onClick={() => setShowMoreFilters(!showMoreFilters)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <span>{showMoreFilters ? 'Manje opcija' : 'Više opcija'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Extended filters */}
                  {showMoreFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-in slide-in-from-top-1 duration-150">
                      {/* Accommodation type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Smeštaj</label>
                        <select
                          value={editedQualification.accommodation.type || 'any'}
                          onChange={(e) => setEditedQualification(prev => prev ? {
                            ...prev,
                            accommodation: { ...prev.accommodation, type: e.target.value === 'any' ? null : e.target.value as any }
                          } : null)}
                          className="w-full h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="any">Svejedno</option>
                          <option value="hotel">🏨 Hotel</option>
                          <option value="apartment">🏠 Apartman</option>
                          <option value="villa">🏡 Vila</option>
                        </select>
                      </div>

                      {/* Board type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ishrana</label>
                        <select
                          value={editedQualification.accommodation.board || 'any'}
                          onChange={(e) => setEditedQualification(prev => prev ? {
                            ...prev,
                            accommodation: { ...prev.accommodation, board: e.target.value === 'any' ? null : e.target.value as any }
                          } : null)}
                          className="w-full h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="any">Svejedno</option>
                          <option value="all_inclusive">🍽️ All Inclusive</option>
                          <option value="half_board">🥘 Polupansion</option>
                          <option value="breakfast">🥐 Doručak</option>
                          <option value="room_only">🛏️ Samo noćenje</option>
                        </select>
                      </div>

                      {/* Transport type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prevoz</label>
                        <select
                          value={editedQualification.accommodation.transport || 'any'}
                          onChange={(e) => setEditedQualification(prev => prev ? {
                            ...prev,
                            accommodation: { ...prev.accommodation, transport: e.target.value === 'any' ? null : e.target.value as any }
                          } : null)}
                          className="w-full h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="any">Svejedno</option>
                          <option value="bus">🚌 Autobus</option>
                          <option value="plane">✈️ Avion</option>
                          <option value="self">🚗 Sopstveni</option>
                        </select>
                      </div>

                      {/* Budget */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budžet / osoba</label>
                        <select
                          value={editedQualification.budget.max ? `${editedQualification.budget.min || 0}-${editedQualification.budget.max}` : 'unlimited'}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === 'unlimited') {
                              setEditedQualification(prev => prev ? {
                                ...prev,
                                budget: { ...prev.budget, min: null, max: null }
                              } : null)
                            } else if (val === '1000+') {
                              setEditedQualification(prev => prev ? {
                                ...prev,
                                budget: { ...prev.budget, min: 1000, max: null }
                              } : null)
                            } else {
                              const [min, max] = val.split('-').map(Number)
                              setEditedQualification(prev => prev ? {
                                ...prev,
                                budget: { ...prev.budget, min, max }
                              } : null)
                            }
                          }}
                          className="w-full h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="unlimited">Nije bitno</option>
                          <option value="0-300">Do €300</option>
                          <option value="300-500">€300-500</option>
                          <option value="500-700">€500-700</option>
                          <option value="700-1000">€700-1000</option>
                          <option value="1000+">€1000+</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => {
                      setShowFilters(false)
                      setEditedQualification(null)
                    }}
                    className="px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium rounded-xl transition-colors"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={() => {
                      setQualification(editedQualification)
                      sessionStorage.setItem('qualification', JSON.stringify(editedQualification))
                      setShowFilters(false)
                      setPage(1)
                      fetchOffers(editedQualification, 1)
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    Primeni filtere
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => {
                setError(null)
                if (qualification) fetchOffers(qualification, 1)
              }}
              className="mt-4 text-red-600 underline"
            >
              Pokušaj ponovo
            </button>
          </div>
        ) : (
          <>
            {/* Fallback message when no exact matches */}
            {isFallback && matchingCount === 0 && offers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Preporučujemo za vas
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Nismo pronašli ponude koje tačno odgovaraju vašoj pretrazi, ali evo naših najboljih ponuda
                </p>
              </div>
            )}

            {/* Matching offers indicator */}
            {matchingCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-medium">
                  ✓ Pronašli smo {matchingCount} {matchingCount === 1 ? 'ponudu' : matchingCount < 5 ? 'ponude' : 'ponuda'} koje odgovaraju vašoj pretrazi
                </p>
              </div>
            )}

            {/* Unified results list - sorted by relevance */}
            {offers.length > 0 && (
              <section className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {offers.map((offer, index) =>
                    offer.inventory_type === 'owned' ? (
                      <InstantOfferCard
                        key={offer.id}
                        offer={offer}
                        qualification={qualification}
                        slug={slug}
                        index={index}
                        isFirstRecommended={index === firstRecommendedIndex}
                      />
                    ) : (
                      <InquiryOfferCard
                        key={offer.id}
                        offer={offer}
                        qualification={qualification}
                        slug={slug}
                        responseTimeMinutes={currentResponseTime}
                        isWithinWorkingHours={isWithinWorkingHours}
                        index={index}
                        isFirstRecommended={index === firstRecommendedIndex}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* No offers at all - show prominent inquiry CTA */}
            {offers.length === 0 && inquirySettings?.allow_custom_inquiries && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Nema dostupnih ponuda
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Trenutno nemamo ponude koje odgovaraju vašim kriterijumima, ali naš agent može pronaći savršeno putovanje za vas.
                </p>
                <Link
                  href={`/a/${slug}/inquiry`}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="w-5 h-5" />
                  Pošalji upit agentu
                </Link>
                <p className="text-gray-500 text-sm mt-4">
                  ⏱️ {inquirySettings.inquiry_response_text}
                </p>
                <Link
                  href={`/a/${slug}/qualify`}
                  className="inline-block mt-6 text-teal-600 hover:text-teal-700 font-medium"
                >
                  Izmeni pretragu
                </Link>
              </div>
            )}

            {/* No offers and inquiries not allowed */}
            {offers.length === 0 && !inquirySettings?.allow_custom_inquiries && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Nema dostupnih ponuda
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Trenutno nemamo ponude koje odgovaraju vašim kriterijumima. Pokušajte sa drugačijim filterima.
                </p>
                <Link
                  href={`/a/${slug}/qualify`}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Izmeni pretragu
                </Link>
              </div>
            )}

            {/* Load more trigger and spinner */}
            {offers.length > 0 && (
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Učitavanje više ponuda...</span>
                  </div>
                )}
                {!loadingMore && hasMore && (
                  <button
                    onClick={loadMore}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Učitaj više ponuda
                  </button>
                )}
                {!hasMore && (
                  <p className="text-gray-400 text-sm">
                    Prikazano svih {offers.length} ponuda
                  </p>
                )}
              </div>
            )}

            {/* Inquiry link at bottom when offers exist */}
            {offers.length > 0 && inquirySettings?.show_inquiry_with_results && inquirySettings?.allow_custom_inquiries && (
              <div className="text-center pt-4 pb-8 border-t border-gray-100">
                <p className="text-gray-500 text-sm mb-2">
                  Niste pronašli što tražite?
                </p>
                <Link
                  href={`/a/${slug}/inquiry`}
                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                >
                  Pošaljite nam upit
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
