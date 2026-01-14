'use client'

import { useEffect, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  
  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)

  useEffect(() => {
    // Get qualification from session storage
    const storedQualification = sessionStorage.getItem('qualification')
    if (!storedQualification) {
      router.push(`/a/${slug}/qualify`)
      return
    }

    const qualData = JSON.parse(storedQualification) as QualificationData
    setQualification(qualData)

    // Fetch matching offers
    const fetchOffers = async () => {
      try {
        setLoading(true)
        const queryParams = new URLSearchParams()
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

        const response = await fetch(
          `/api/public/agencies/${slug}/offers?${queryParams.toString()}`
        )

        if (!response.ok) throw new Error('Failed to fetch offers')

        const data = await response.json()
        setOffers(data.offers || [])
        setIsFallback(data.isFallback || false)
      } catch (err) {
        console.error('Error fetching offers:', err)
        setError('Greška pri učitavanju ponuda')
      } finally {
        setLoading(false)
      }
    }

    fetchOffers()
  }, [slug, router])

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
    <div className="min-h-screen">
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
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Osvježi</span>
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
              onClick={() => window.location.reload()}
              className="mt-4 text-red-600 underline"
            >
              Pokušaj ponovo
            </button>
          </div>
        ) : offers.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Nema rezultata za vašu pretragu
            </h2>
            <p className="text-gray-600 mb-6">
              Pokušajte sa drugom destinacijom ili datumima
            </p>
            <Link
              href={`/a/${slug}/qualify`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Promeni pretragu
            </Link>
          </div>
        ) : (
          <>
            {isFallback && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Nema tačnih rezultata, ali preporučujemo:
                </h3>
                <p className="text-amber-700 text-sm">
                  Nismo pronašli ponude koje tačno odgovaraju vašoj pretrazi, ali evo naših preporuka za {qualification.destination.country}
                </p>
              </div>
            )}
            {/* Instant booking section */}
            <ResultsSection
              title="⚡ REZERVIŠITE ODMAH"
              subtitle="Garantovana dostupnost • Cena zaključana 72h"
              offers={owned}
              cardType="instant"
              qualification={qualification}
              slug={slug}
            />

            {/* On-request section */}
            <ResultsSection
              title="📋 NA UPIT"
              offers={inquiry}
              cardType="inquiry"
              qualification={qualification}
              slug={slug}
              responseTimeMinutes={currentResponseTime}
              isWithinWorkingHours={isWithinWorkingHours}
            />
          </>
        )}
      </main>
    </div>
  )
}
