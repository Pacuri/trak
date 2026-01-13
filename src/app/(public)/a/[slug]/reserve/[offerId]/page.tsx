'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Shield, Clock } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import ReservationForm, { type ReservationFormData } from '@/components/public/ReservationForm'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating } from '@/lib/formatting'

export default function ReservePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const offerId = params.offerId as string

  const [offer, setOffer] = useState<Offer | null>(null)
  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Get qualification from session storage
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      setQualification(JSON.parse(storedQualification))
    }

    // Fetch offer details
    const fetchOffer = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/public/agencies/${slug}/offers?id=${offerId}`)
        if (!response.ok) throw new Error('Offer not found')
        
        const data = await response.json()
        if (data.offers && data.offers.length > 0) {
          setOffer(data.offers[0])
        } else {
          throw new Error('Offer not found')
        }
      } catch (err) {
        setError('Ponuda nije pronađena')
      } finally {
        setLoading(false)
      }
    }

    fetchOffer()
  }, [slug, offerId])

  const handleSubmit = async (formData: ReservationFormData) => {
    if (!offer) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          offer_id: offer.id,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          adults: formData.adults,
          children: formData.children,
          child_ages: formData.childAges,
          notes: formData.notes,
          total_price: offer.price_per_person * (formData.adults + formData.children),
          qualification_data: qualification || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create reservation')

      const result = await response.json()
      
      // Store reservation code for confirmation page
      sessionStorage.setItem('reservationCode', result.code)
      sessionStorage.setItem('reservationId', result.id)
      
      // Navigate to confirmation
      router.push(`/a/${slug}/confirmation`)
    } catch (err) {
      console.error('Reservation error:', err)
      alert('Greška pri kreiranju rezervacije. Pokušajte ponovo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Ponuda nije pronađena'}</p>
          <Link href={`/a/${slug}/results`} className="text-blue-600 underline">
            Nazad na rezultate
          </Link>
        </div>
      </div>
    )
  }

  const guestCount = qualification
    ? qualification.guests.adults + qualification.guests.children
    : 2
  const primaryImage = offer.images?.[0]?.url

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/a/${slug}/results`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nazad na ponude</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Offer summary - sticky sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-24">
              {/* Image */}
              <div className="aspect-video bg-gray-200 relative">
                {primaryImage ? (
                  <Image
                    src={primaryImage}
                    alt={offer.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="text-4xl">🏨</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h2 className="font-bold text-lg">
                    {offer.name} {formatStarRating(offer.star_rating)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {offer.city}, {offer.country}
                  </p>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>📅 {formatDateRange(offer.departure_date, offer.return_date)}</p>
                  <p>🍽️ {getBoardLabel(offer.board_type)}</p>
                  <p>✈️ {getTransportLabel(offer.transport_type)}</p>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cena po osobi</span>
                    <span className="font-bold">€{offer.price_per_person}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield className="w-5 h-5 text-green-600" />
                <span>Sigurna rezervacija</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Cena zaključana 72h</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Završite rezervaciju
            </h1>
            
            <ReservationForm
              offer={offer}
              guestCount={guestCount}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
