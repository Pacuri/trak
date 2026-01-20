'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  MessageCircle,
  ArrowRight,
  Calendar,
  Euro,
} from 'lucide-react'
import type { Offer } from '@/types'
import { useAgencySettings } from '@/hooks/use-agency-settings'
import ResultsSection from '@/components/public/ResultsSection'
import type { AgencyInquirySettings } from '@/types/inquiry'
import type { Departure } from '@/types/packages'

function mapDepartureToOffer(departure: Departure & { package_id?: string }): Offer {
  const extendedDep = departure as any

  return {
    id: departure.id,
    organization_id: departure.organization_id,
    name: departure.package_name || departure.hotel_name || 'Ponuda',
    package_id: departure.package_id,
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
    accommodation_type: null,
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
    duration_nights: extendedDep.duration_nights || null,
  } as Offer & { valid_from?: string; valid_to?: string; duration_nights?: number }
}

function splitByType(offers: Offer[]): { owned: Offer[]; inquiry: Offer[] } {
  return {
    owned: offers.filter((o) => o.inventory_type === 'owned'),
    inquiry: offers.filter((o) => o.inventory_type === 'inquiry'),
  }
}

const BOARD_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sve' },
  { value: 'all_inclusive', label: 'All Inclusive' },
  { value: 'half_board', label: 'Polupansion' },
  { value: 'breakfast', label: 'Doručak' },
  { value: 'room_only', label: 'Samo noćenje' },
]

const TRANSPORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sve' },
  { value: 'flight', label: 'Avion' },
  { value: 'bus', label: 'Autobus' },
  { value: 'own', label: 'Sopstveni prevoz' },
  { value: 'none', label: 'Bez prevoza' },
]

const COUNTRY_OPTIONS = [
  { value: '', label: 'Sve zemlje' },
  { value: 'Crna Gora', label: 'Crna Gora' },
  { value: 'Hrvatska', label: 'Hrvatska' },
  { value: 'Grčka', label: 'Grčka' },
  { value: 'Albanija', label: 'Albanija' },
  { value: 'Bugarska', label: 'Bugarska' },
  { value: 'Egipat', label: 'Egipat' },
  { value: 'Turska', label: 'Turska' },
  { value: 'Italija', label: 'Italija' },
  { value: 'Španija', label: 'Španija' },
]

export default function PonudePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [inquirySettings, setInquirySettings] = useState<AgencyInquirySettings | null>(null)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [country, setCountry] = useState(searchParams.get('country') || '')
  const [departureFrom, setDepartureFrom] = useState(searchParams.get('departure_from') || '')
  const [departureTo, setDepartureTo] = useState(searchParams.get('departure_to') || '')
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '')
  const [boardType, setBoardType] = useState(searchParams.get('board_type') || '')
  const [transportType, setTransportType] = useState(searchParams.get('transport_type') || '')

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)

  const buildQueryParams = useCallback(
    (pageNum: number) => {
      const q = new URLSearchParams()
      q.set('page', String(pageNum))
      q.set('limit', '12')
      if (country) q.set('country', country)
      if (departureFrom) q.set('departure_from', departureFrom)
      if (departureTo) q.set('departure_to', departureTo)
      if (minPrice) q.set('min_price', minPrice)
      if (maxPrice) q.set('max_price', maxPrice)
      if (boardType) q.set('board_type', boardType)
      if (transportType) q.set('transport_type', transportType)
      return q
    },
    [country, departureFrom, departureTo, minPrice, maxPrice, boardType, transportType]
  )

  const syncUrl = useCallback(() => {
    const q = new URLSearchParams()
    if (searchQuery) q.set('q', searchQuery)
    if (country) q.set('country', country)
    if (departureFrom) q.set('departure_from', departureFrom)
    if (departureTo) q.set('departure_to', departureTo)
    if (minPrice) q.set('min_price', minPrice)
    if (maxPrice) q.set('max_price', maxPrice)
    if (boardType) q.set('board_type', boardType)
    if (transportType) q.set('transport_type', transportType)
    const s = q.toString()
    const url = s ? `/a/${slug}/ponude?${s}` : `/a/${slug}/ponude`
    window.history.replaceState(null, '', url)
  }, [slug, searchQuery, country, departureFrom, departureTo, minPrice, maxPrice, boardType, transportType])

  const fetchOffers = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        if (pageNum === 1) setLoading(true)
        else setLoadingMore(true)

        const res = await fetch(`/api/public/agencies/${slug}/packages?${buildQueryParams(pageNum)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((data as { error?: string })?.error || 'Greška pri učitavanju ponuda')
        const mapped = (data.departures || []).map(mapDepartureToOffer)

        if (append) setOffers((p) => [...p, ...mapped])
        else setOffers(mapped)
        setHasMore(data.hasMore ?? false)
        setPage(pageNum)
      } catch (e) {
        console.error(e)
        if (pageNum === 1) setError(e instanceof Error ? e.message : 'Greška pri učitavanju ponuda')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [slug, buildQueryParams]
  )

  useEffect(() => {
    async function run() {
      try {
        const r = await fetch(`/api/public/agencies/${slug}/landing`)
        if (r.ok) {
          const d = await r.json()
          setInquirySettings({
            allow_custom_inquiries: d.inquiry_settings?.allow_custom_inquiries ?? false,
            show_inquiry_with_results: d.inquiry_settings?.show_inquiry_with_results ?? false,
            inquiry_response_text: d.inquiry_settings?.inquiry_response_text ?? '',
            inquiry_notification_email: null,
            inquiry_notification_phone: null,
          })
        }
      } catch {}
    }
    run()
  }, [slug])

  useEffect(() => {
    setCountry(searchParams.get('country') || '')
    setDepartureFrom(searchParams.get('departure_from') || '')
    setDepartureTo(searchParams.get('departure_to') || '')
    setMinPrice(searchParams.get('min_price') || '')
    setMaxPrice(searchParams.get('max_price') || '')
    setBoardType(searchParams.get('board_type') || '')
    setTransportType(searchParams.get('transport_type') || '')
    setSearchQuery(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    fetchOffers(1)
  }, [country, departureFrom, departureTo, minPrice, maxPrice, boardType, transportType, fetchOffers])

  useEffect(() => {
    syncUrl()
  }, [syncUrl])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    fetchOffers(page + 1, true)
  }, [loadingMore, hasMore, page, fetchOffers])

  useEffect(() => {
    if (!loadMoreRef.current) return
    const ob = new IntersectionObserver(
      (e) => { if (e[0].isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.1, rootMargin: '100px' }
    )
    ob.observe(loadMoreRef.current)
    return () => ob.disconnect()
  }, [hasMore, loadingMore, loadMore])

  const handleFilterChange = (key: string, value: string) => {
    switch (key) {
      case 'search': setSearchQuery(value); break
      case 'country': setCountry(value); break
      case 'departure_from': setDepartureFrom(value); break
      case 'departure_to': setDepartureTo(value); break
      case 'min_price': setMinPrice(value); break
      case 'max_price': setMaxPrice(value); break
      case 'board_type': setBoardType(value); break
      case 'transport_type': setTransportType(value); break
      default: break
    }
  }

  const filteredBySearch = searchQuery.trim()
    ? offers.filter((o) => {
        const q = searchQuery.toLowerCase()
        return [o.name, o.country, o.city].some((f) => f?.toLowerCase().includes(q))
      })
    : offers

  const { owned, inquiry } = splitByType(filteredBySearch)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
          <p className="text-gray-600">Učitavanje kataloga ponuda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/a/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              <span>Nazad na početnu</span>
            </Link>
            <button
              type="button"
              onClick={() => fetchOffers(1)}
              className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
            >
              <RefreshCw className="w-4 h-4" />
              Osveži
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50/80">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pretraži destinaciju ili hotel..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <select
                value={country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm bg-white focus:border-teal-500"
              >
                {COUNTRY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={boardType}
                onChange={(e) => handleFilterChange('board_type', e.target.value)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm bg-white focus:border-teal-500"
              >
                {BOARD_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={transportType}
                onChange={(e) => handleFilterChange('transport_type', e.target.value)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm bg-white focus:border-teal-500"
              >
                {TRANSPORT_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={departureFrom}
                  onChange={(e) => handleFilterChange('departure_from', e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="date"
                  value={departureTo}
                  onChange={(e) => handleFilterChange('departure_to', e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  placeholder="Min €"
                  value={minPrice}
                  onChange={(e) => handleFilterChange('min_price', e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  placeholder="Max €"
                  value={maxPrice}
                  onChange={(e) => handleFilterChange('max_price', e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button type="button" onClick={() => { setError(null); fetchOffers(1) }} className="mt-4 text-red-600 underline">
              Pokušaj ponovo
            </button>
          </div>
        )}

        {!error && (
          <>
            {owned.length > 0 && (
              <ResultsSection
                title="Rezervišite odmah"
                subtitle="Garantovana dostupnost • Cena zaključana 72h"
                offers={owned}
                cardType="instant"
                qualification={undefined}
                slug={slug}
              />
            )}

            {inquiry.length > 0 && (
              <ResultsSection
                title="Na upit"
                offers={inquiry}
                cardType="inquiry"
                qualification={undefined}
                slug={slug}
                responseTimeMinutes={currentResponseTime}
                isWithinWorkingHours={isWithinWorkingHours}
              />
            )}

            {filteredBySearch.length === 0 && !loading && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Nema ponuda</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {offers.length === 0
                    ? 'Trenutno nema dostupnih ponuda. Pokušajte drugačije filtere ili nas kontaktirajte.'
                    : 'Nijedna ponuda ne odgovara pretrazi. Probajte drugačije reči ili filtere.'}
                </p>
                {inquirySettings?.allow_custom_inquiries && (
                  <Link
                    href={`/a/${slug}/inquiry`}
                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-semibold"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Pošalji upit
                  </Link>
                )}
                <Link href={`/a/${slug}`} className="block mt-4 text-teal-600 hover:text-teal-700 font-medium">
                  Nazad na početnu
                </Link>
              </div>
            )}

            {filteredBySearch.length > 0 && (
              <div ref={loadMoreRef} className="py-8 flex flex-col items-center gap-4">
                {loadingMore && (
                  <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Učitavanje više ponuda...</span>
                  </div>
                )}
                {!loadingMore && hasMore && (
                  <button type="button" onClick={loadMore} className="text-teal-600 hover:text-teal-700 font-medium">
                    Učitaj više ponuda
                  </button>
                )}
                {!hasMore && (
                  <p className="text-gray-400 text-sm">Prikazano {filteredBySearch.length} ponuda</p>
                )}
              </div>
            )}

            {filteredBySearch.length > 0 && inquirySettings?.show_inquiry_with_results && inquirySettings?.allow_custom_inquiries && (
              <div className="text-center pt-4 pb-8 border-t border-gray-100">
                <p className="text-gray-500 text-sm mb-2">Niste pronašli što tražite?</p>
                <Link href={`/a/${slug}/inquiry`} className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium">
                  Pošaljite nam upit <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
