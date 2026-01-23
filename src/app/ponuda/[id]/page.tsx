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
  Home,
  Utensils,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wifi,
  Waves,
  Coffee,
  Wine,
  Sun,
  Moon
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { sr } from 'date-fns/locale'

interface OfferQuote {
  id: string
  organization_id: string
  customer_name: string
  customer_email: string
  travel_dates: { start: string; end: string } | null
  guests: { adults: number; children: number; childAges?: number[] } | null
  destination: string | null
  package_snapshot: {
    name: string
    hotel_name?: string
    description?: string
    images: string[]
    star_rating?: number
    accommodation_type?: string
    room_type?: string
    board_type?: string
    transport_type?: string
    country?: string
    city?: string
  }
  price_breakdown: {
    base_price?: number
    supplements?: { name: string; price: number }[]
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

// Meal plan labels and inclusions
const MEAL_INCLUSIONS: Record<string, string[]> = {
  'AI': ['Doručak', 'Ručak', 'Večera', 'Piće', 'Užina'],
  'ALL_INCLUSIVE': ['Doručak', 'Ručak', 'Večera', 'Piće', 'Užina'],
  'FB': ['Doručak', 'Ručak', 'Večera'],
  'FULL_BOARD': ['Doručak', 'Ručak', 'Večera'],
  'HB': ['Doručak', 'Večera'],
  'HALF_BOARD': ['Doručak', 'Večera'],
  'BB': ['Doručak'],
  'BED_AND_BREAKFAST': ['Doručak'],
  'RO': [],
  'ROOM_ONLY': [],
}

const MEAL_LABELS: Record<string, string> = {
  'AI': 'All Inclusive',
  'ALL_INCLUSIVE': 'All Inclusive',
  'FB': 'Pun pansion',
  'FULL_BOARD': 'Pun pansion',
  'HB': 'Polupansion',
  'HALF_BOARD': 'Polupansion',
  'BB': 'Noćenje sa doručkom',
  'BED_AND_BREAKFAST': 'Noćenje sa doručkom',
  'RO': 'Samo noćenje',
  'ROOM_ONLY': 'Samo noćenje',
}

export default function OfferPage() {
  const params = useParams()
  const offerId = params.id as string

  const [offer, setOffer] = useState<OfferQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
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
    setRejecting(true)
    try {
      const res = await fetch(`/api/public/offers/${offerId}/reject`, {
        method: 'POST'
      })
      if (res.ok) {
        setOffer(prev => prev ? { ...prev, status: 'rejected' } : null)
      }
    } catch (err) {
      console.error('Error rejecting:', err)
    } finally {
      setRejecting(false)
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Učitavanje ponude...</p>
        </div>
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {error || 'Ponuda nije pronađena'}
          </h1>
          <p className="text-gray-500">
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

  // Calculate nights
  const nights = offer.travel_dates
    ? differenceInDays(parseISO(offer.travel_dates.end), parseISO(offer.travel_dates.start))
    : null

  // Calculate price per person
  const totalGuests = (offer.guests?.adults || 0) + (offer.guests?.children || 0)
  const pricePerPerson = totalGuests > 0 ? Math.round(offer.total_amount / totalGuests) : null

  // Get meal inclusions
  const boardType = pkg?.board_type || ''
  const mealInclusions = MEAL_INCLUSIONS[boardType] || []
  const mealLabel = MEAL_LABELS[boardType] || boardType

  // Location string
  const location = pkg?.city
    ? `${pkg.city}, ${pkg.country}`
    : pkg?.country || offer.destination || ''

  // Hotel name
  const hotelName = pkg?.hotel_name || pkg?.name || 'Paket putovanja'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Container - single column, image on top */}
      <div className="max-w-2xl mx-auto bg-white min-h-screen md:min-h-0 md:my-8 md:rounded-3xl md:shadow-2xl md:overflow-hidden">

        {/* Hero Image - Full Width */}
        <div className="relative h-64 sm:h-80 md:h-96">
          {images.length > 0 ? (
            <Image
              src={images[currentImageIndex]}
              alt={hotelName}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Home className="w-20 h-20 text-white/50" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Agency Logo Badge */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            {offer.organization?.logo_url ? (
              <Image
                src={offer.organization.logo_url}
                alt={offer.organization.name || 'Agency'}
                width={80}
                height={32}
                className="h-6 w-auto object-contain"
              />
            ) : (
              <span className="text-blue-600 font-bold text-sm">
                {offer.organization?.name || 'Travel Agency'}
              </span>
            )}
          </div>

          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
              <div className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition ${
                      i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Hotel Name Overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">{hotelName}</h1>
            {location && (
              <div className="flex items-center gap-1.5 text-white/90 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-8 space-y-5">

              {/* Offer ID & Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  Ponuda #{offer.id.slice(0, 8).toUpperCase()}
                </span>
                {offer.status === 'confirmed' ? (
                  <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Potvrđeno
                  </span>
                ) : offer.status === 'rejected' ? (
                  <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Odbijeno
                  </span>
                ) : isExpired ? (
                  <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Isteklo
                  </span>
                ) : (
                  <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
                    Aktivna
                  </span>
                )}
              </div>

              {/* Status Banner */}
              {offer.status === 'confirmed' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Ponuda potvrđena!</p>
                    <p className="text-sm text-green-600">Agencija će vas kontaktirati sa detaljima.</p>
                  </div>
                </div>
              )}

              {offer.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Ponuda odbijena</p>
                    <p className="text-sm text-red-600">Kontaktirajte agenciju za drugu ponudu.</p>
                  </div>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Dates */}
                {offer.travel_dates && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wide">Datum</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {format(parseISO(offer.travel_dates.start), 'd', { locale: sr })} - {format(parseISO(offer.travel_dates.end), 'd. MMM', { locale: sr })}
                    </p>
                    {nights && (
                      <p className="text-xs text-gray-500 mt-0.5">{nights} noći</p>
                    )}
                  </div>
                )}

                {/* Guests */}
                {offer.guests && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wide">Gosti</span>
                    </div>
                    <p className="font-semibold text-gray-900">{offer.guests.adults} odraslih</p>
                    {offer.guests.children > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {offer.guests.children} dece
                        {offer.guests.childAges && offer.guests.childAges.length > 0 && (
                          <> ({offer.guests.childAges.map(a => `${a}g`).join(', ')})</>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Room */}
                {pkg?.room_type && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <Home className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wide">Soba</span>
                    </div>
                    <p className="font-semibold text-gray-900">{pkg.room_type}</p>
                  </div>
                )}

                {/* Meal Plan */}
                {boardType && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <Utensils className="w-5 h-5" />
                      <span className="text-xs font-medium uppercase tracking-wide">Ishrana</span>
                    </div>
                    <p className="font-semibold text-gray-900">{mealLabel}</p>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Cena</h3>

                <div className="space-y-3">
                  {offer.price_breakdown.base_price != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Osnovna cena</span>
                      <span className="font-medium">€{offer.price_breakdown.base_price.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Supplements / Extras */}
                  {(offer.price_breakdown.supplements || offer.price_breakdown.extras)?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{item.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Dodatak</span>
                      </div>
                      <span className="font-medium text-blue-600">+€{item.price.toLocaleString()}</span>
                    </div>
                  ))}

                  {/* Discounts */}
                  {offer.price_breakdown.discounts?.map((discount, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-600">{discount.name}</span>
                      <span className="font-medium text-green-600">-€{discount.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-5 pt-4 border-t-2 border-gray-200">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-gray-500">
                        Ukupno{totalGuests > 0 && ` za ${totalGuests} osob${totalGuests === 1 ? 'u' : totalGuests < 5 ? 'e' : 'a'}`}
                      </p>
                      {pricePerPerson && (
                        <p className="text-xs text-gray-400 mt-0.5">€{pricePerPerson.toLocaleString()} po osobi</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-600">€{offer.total_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What's Included */}
              {mealInclusions.length > 0 && (
                <div className="border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Uključeno u cenu</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {mealInclusions.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-600">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                    {/* Always show WiFi and Pool as common amenities */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>WiFi</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Bazen</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Message */}
              {offer.agent_message && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">Poruka od agenta:</p>
                  <p className="text-blue-700 text-sm">{offer.agent_message}</p>
                </div>
              )}

              {/* Validity Notice */}
              {offer.valid_until && !isExpired && canRespond && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-amber-50 rounded-xl py-3 px-4">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>
                    Ponuda važi do <strong className="text-amber-700">{format(parseISO(offer.valid_until), 'd. MMMM yyyy', { locale: sr })}</strong>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              {canRespond && !isExpired && (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 disabled:opacity-50"
                  >
                    {confirming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    Potvrđujem ponudu
                  </button>

                  <button
                    onClick={handleReject}
                    disabled={rejecting}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {rejecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    Odbij ponudu
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pb-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Pripremljeno za</p>
                <p className="font-medium text-gray-700 mt-1">{offer.customer_name}</p>
                <p className="text-xs text-gray-400">{offer.customer_email}</p>
              </div>

            </div>
      </div>
    </div>
  )
}
