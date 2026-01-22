'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { useAgencySettings } from '@/hooks/use-agency-settings'
import { formatResponseTime } from '@/lib/formatting'
import type { Offer, QualificationData } from '@/types'
import PremiumOfferCard from '@/components/public/PremiumOfferCard'

export default function InquirySentPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)
  const [alternatives, setAlternatives] = useState<Offer[]>([])
  const [qualification, setQualification] = useState<QualificationData | null>(null)

  useEffect(() => {
    // Get qualification from session storage
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      setQualification(JSON.parse(storedQualification))
    }

    // Fetch alternative instant booking offers
    const fetchAlternatives = async () => {
      try {
        const response = await fetch(
          `/api/public/agencies/${slug}/offers?inventory_type=owned&limit=3`
        )
        if (response.ok) {
          const data = await response.json()
          setAlternatives(data.offers || [])
        }
      } catch (err) {
        console.error('Error fetching alternatives:', err)
      }
    }

    fetchAlternatives()
  }, [slug])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Success message */}
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Upit je uspešno poslat!
          </h1>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Primili smo vaš upit i proverićemo dostupnost u najkraćem roku.
          </p>

          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" />
            <span>
              {isWithinWorkingHours ? (
                <>
                  Očekujte odgovor u roku od{' '}
                  <span className="font-bold">{formatResponseTime(currentResponseTime)}</span>
                </>
              ) : (
                <>Očekujte odgovor ubrzo!</>
              )}
            </span>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-4">
              Obavestićemo vas putem emaila i SMS-a čim proverimo dostupnost.
            </p>
            <Link
              href={`/a/${slug}/ponude`}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Nazad na sve ponude
            </Link>
          </div>
        </div>

        {/* Alternative offers */}
        {alternatives.length > 0 && qualification && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ⚡ Možda vas zanima i...
                </h2>
                <p className="text-gray-500">
                  Ove ponude možete rezervisati odmah
                </p>
              </div>
              <Link
                href={`/a/${slug}/ponude`}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                Sve ponude
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {alternatives.map((offer, index) => (
                <PremiumOfferCard
                  key={offer.id}
                  offer={offer}
                  qualification={qualification}
                  slug={slug}
                  index={index}
                  isFirstRecommended={false}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
