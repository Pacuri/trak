'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  Calendar,
  Users,
  MapPin,
  Check,
  X,
  Clock,
  Star,
  Plane,
  Hotel,
  Utensils,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { sr } from 'date-fns/locale'

interface OfferQuote {
  id: string
  organization_id: string
  customer_name: string
  customer_email: string
  travel_dates: { start: string; end: string } | null
  guests: { adults: number; children: number } | null
  destination: string | null
  package_snapshot: {
    name: string
    description: string
    images: string[]
    star_rating?: number
    accommodation_type?: string
    board_type?: string
    transport_type?: string
  }
  price_breakdown: {
    base_price?: number
    extras?: { name: string; price: number }[]
    discounts?: { name: string; amount: number }[]
    total: number
  }
  total_amount: number
  currency: string
  status: 'draft' | 'sent' | 'viewed' | 'confirmed' | 'rejected' | 'expired'
  valid_until: string | null
  agent_message: string | null
  sent_at: string | null
  organization?: {
    name: string
    logo_url?: string
  }
}

export default function OfferPage() {
  const params = useParams()
  const offerId = params.id as string

  const [offer, setOffer] = useState<OfferQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    fetchOffer()
  }, [offerId])

  const fetchOffer = async () => {
    try {
      const res = await fetch(`/api/public/offers/${offerId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Ponuda nije pronađena')
        } else {
          setError('Greška pri učitavanju ponude')
        }
        return
      }
      const data = await res.json()
      setOffer(data)

      // Mark as viewed if not already
      if (data.status === 'sent') {
        fetch(`/api/public/offers/${offerId}/view`, { method: 'POST' })
      }
    } catch (err) {
      setError('Greška pri učitavanju ponude')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/public/offers/${offerId}/confirm`, {
        method: 'POST'
      })
      if (res.ok) {
        setOffer(prev => prev ? { ...prev, status: 'confirmed' } : null)
      }
    } catch (err) {
      console.error('Error confirming:', err)
    } finally {
      setConfirming(false)
    }
  }

  const handleReject = async () => {
    try {
      const res = await fetch(`/api/public/offers/${offerId}/reject`, {
        method: 'POST'
      })
      if (res.ok) {
        setOffer(prev => prev ? { ...prev, status: 'rejected' } : null)
      }
    } catch (err) {
      console.error('Error rejecting:', err)
    }
  }

  const nextImage = () => {
    const images = offer?.package_snapshot?.images || []
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    const images = offer?.package_snapshot?.images || []
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {error || 'Ponuda nije pronađena'}
          </h1>
          <p className="text-slate-500">
            Molimo vas kontaktirajte agenciju za više informacija.
          </p>
        </div>
      </div>
    )
  }

  const pkg = offer.package_snapshot
  const images = pkg?.images || []
  const isExpired = offer.valid_until && new Date(offer.valid_until) < new Date()
  const canRespond = offer.status === 'sent' || offer.status === 'viewed'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {offer.organization?.logo_url ? (
            <Image
              src={offer.organization.logo_url}
              alt={offer.organization.name || 'Agency'}
              width={120}
              height={60}
              className="mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="h-12 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-blue-600">
                {offer.organization?.name || 'Travel Agency'}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-800">Vaša ponuda</h1>
          <p className="text-slate-500 mt-1">Ponuda #{offer.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Status Banner */}
        {offer.status === 'confirmed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">Ponuda potvrđena!</p>
              <p className="text-sm text-emerald-600">Hvala vam. Agencija će vas kontaktirati sa ugovorom.</p>
            </div>
          </div>
        )}

        {offer.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <X className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Ponuda odbijena</p>
              <p className="text-sm text-red-600">Kontaktirajte agenciju ako želite drugu ponudu.</p>
            </div>
          </div>
        )}

        {isExpired && canRespond && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock className="h-6 w-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Ponuda je istekla</p>
              <p className="text-sm text-amber-600">Kontaktirajte agenciju za novu ponudu.</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Image Gallery */}
          {images.length > 0 && (
            <div className="relative h-72 md:h-96 bg-slate-200">
              <Image
                src={images[currentImageIndex]}
                alt={pkg?.name || 'Package'}
                fill
                className="object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-700" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-2.5 h-2.5 rounded-full transition ${
                          i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Package Name & Rating */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{pkg?.name || 'Paket putovanja'}</h2>
                {offer.destination && (
                  <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>{offer.destination}</span>
                  </div>
                )}
              </div>
              {pkg?.star_rating && (
                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-amber-700">{pkg.star_rating}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {pkg?.description && (
              <p className="text-slate-600 mb-6 leading-relaxed">{pkg.description}</p>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {offer.travel_dates && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Datum</span>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {format(parseISO(offer.travel_dates.start), 'd. MMM', { locale: sr })} - {format(parseISO(offer.travel_dates.end), 'd. MMM yyyy', { locale: sr })}
                  </p>
                </div>
              )}

              {offer.guests && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Gosti</span>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {offer.guests.adults} odraslih{offer.guests.children > 0 && `, ${offer.guests.children} dece`}
                  </p>
                </div>
              )}

              {pkg?.accommodation_type && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Hotel className="h-4 w-4" />
                    <span className="text-sm">Smeštaj</span>
                  </div>
                  <p className="font-semibold text-slate-800">{pkg.accommodation_type}</p>
                </div>
              )}

              {pkg?.board_type && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Utensils className="h-4 w-4" />
                    <span className="text-sm">Ishrana</span>
                  </div>
                  <p className="font-semibold text-slate-800">{pkg.board_type}</p>
                </div>
              )}

              {pkg?.transport_type && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Plane className="h-4 w-4" />
                    <span className="text-sm">Prevoz</span>
                  </div>
                  <p className="font-semibold text-slate-800">{pkg.transport_type}</p>
                </div>
              )}
            </div>

            {/* Agent Message */}
            {offer.agent_message && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium text-blue-800 mb-1">Poruka od agenta:</p>
                <p className="text-blue-700">{offer.agent_message}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-semibold text-slate-800 mb-4">Cena</h3>

              <div className="space-y-2">
                {offer.price_breakdown.base_price && (
                  <div className="flex justify-between text-slate-600">
                    <span>Osnovna cena</span>
                    <span>€{offer.price_breakdown.base_price.toLocaleString()}</span>
                  </div>
                )}

                {offer.price_breakdown.extras?.map((extra, i) => (
                  <div key={i} className="flex justify-between text-slate-600">
                    <span>{extra.name}</span>
                    <span>+€{extra.price.toLocaleString()}</span>
                  </div>
                ))}

                {offer.price_breakdown.discounts?.map((discount, i) => (
                  <div key={i} className="flex justify-between text-emerald-600">
                    <span>{discount.name}</span>
                    <span>-€{discount.amount.toLocaleString()}</span>
                  </div>
                ))}

                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-800">Ukupno</span>
                    <span className="text-2xl font-bold text-blue-600">
                      €{offer.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Valid Until */}
            {offer.valid_until && !isExpired && canRespond && (
              <div className="mt-4 text-center text-sm text-slate-500">
                <Clock className="h-4 w-4 inline mr-1" />
                Ponuda važi do {format(parseISO(offer.valid_until), 'd. MMMM yyyy', { locale: sr })}
              </div>
            )}

            {/* Action Buttons */}
            {canRespond && !isExpired && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition disabled:opacity-50"
                >
                  {confirming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  Potvrđujem ponudu
                </button>
                <button
                  onClick={handleReject}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl transition"
                >
                  <X className="h-5 w-5" />
                  Odbij
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customer Info Footer */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Ova ponuda je pripremljena za: <strong>{offer.customer_name}</strong></p>
          <p>{offer.customer_email}</p>
        </div>
      </div>
    </div>
  )
}
