'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import type { Offer, QualificationData } from '@/types'
import { useAgencySettings } from '@/hooks/use-agency-settings'
import ResultsSection from '@/components/public/ResultsSection'
import { splitByInventoryType } from '@/lib/matching'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [matchingCount, setMatchingCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)

  // Build query params from qualification data
  const buildQueryParams = useCallback((qualData: QualificationData, pageNum: number) => {
    const queryParams = new URLSearchParams()
    queryParams.set('page', String(pageNum))
    queryParams.set('limit', '6')
    
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

  // Fetch offers
  const fetchOffers = useCallback(async (qualData: QualificationData, pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const queryParams = buildQueryParams(qualData, pageNum)
      const response = await fetch(
        `/api/public/agencies/${slug}/offers?${queryParams.toString()}`
      )

      if (!response.ok) throw new Error('Failed to fetch offers')

      const data = await response.json()
      
      if (append) {
        setOffers(prev => [...prev, ...(data.offers || [])])
      } else {
        setOffers(data.offers || [])
        setMatchingCount(data.matchingCount || 0)
        setIsFallback(data.isFallback || false)
      }
      
      setHasMore(data.hasMore || false)
      setPage(pageNum)
    } catch (err) {
      console.error('Error fetching offers:', err)
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

  const { owned, inquiry } = splitByInventoryType(offers)
  const guestCount = qualification.guests.adults + qualification.guests.children

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

      {/* Search summary */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-blue-800">
            <span className="font-semibold">{qualification.destination.country}</span>
            {qualification.destination.city && ` • ${qualification.destination.city}`}
            {' • '}
            <span>{guestCount} {guestCount === 1 ? 'putnik' : 'putnika'}</span>
            {qualification.dates.month && ` • ${qualification.dates.month}`}
            {qualification.budget.max && ` • do €${qualification.budget.max}${qualification.budget.perPerson ? '/os' : ''}`}
          </p>
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

            {/* Instant booking section */}
            {owned.length > 0 && (
              <ResultsSection
                title="⚡ REZERVIŠITE ODMAH"
                subtitle="Garantovana dostupnost • Cena zaključana 72h"
                offers={owned}
                cardType="instant"
                qualification={qualification}
                slug={slug}
              />
            )}

            {/* On-request section */}
            {inquiry.length > 0 && (
              <ResultsSection
                title="📋 NA UPIT"
                offers={inquiry}
                cardType="inquiry"
                qualification={qualification}
                slug={slug}
                responseTimeMinutes={currentResponseTime}
                isWithinWorkingHours={isWithinWorkingHours}
              />
            )}

            {/* Load more trigger and spinner */}
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
              {!hasMore && offers.length > 0 && (
                <p className="text-gray-400 text-sm">
                  Prikazano svih {offers.length} ponuda
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
