'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Share2, MapPin, Calendar, Users, Utensils, Plane, Hotel } from 'lucide-react'
import type { Offer } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating, formatShortDate } from '@/lib/formatting'
import { differenceInDays } from 'date-fns'

export default function OfferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const offerId = params.offerId as string

  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [guestCount, setGuestCount] = useState(1)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Get guest count from session storage or default to 1
  useEffect(() => {
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      try {
        const qualData = JSON.parse(storedQualification)
        const count = (qualData.guests?.adults || 1) + (qualData.guests?.children || 0)
        setGuestCount(count)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Fetch offer
  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/public/agencies/${slug}/offers/${offerId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch offer')
        }

        const data = await response.json()
        setOffer(data)
      } catch (err) {
        console.error('Error fetching offer:', err)
        setError('Greška pri učitavanju ponude')
      } finally {
        setLoading(false)
      }
    }

    if (slug && offerId) {
      fetchOffer()
    }
  }, [slug, offerId])

  // Preload adjacent images
  useEffect(() => {
    if (!offer?.images || offer.images.length === 0) return

    const preloadIndexes = [
      currentImageIndex - 1,
      currentImageIndex + 1,
    ].filter((idx) => idx >= 0 && idx < (offer.images?.length ?? 0))

    preloadIndexes.forEach((idx) => {
      const img = new window.Image()
      img.src = offer.images[idx].url
    })
  }, [offer?.images, currentImageIndex])

  // Touch handlers for swipe
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !offer?.images) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentImageIndex < offer.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const goToPrevious = () => {
    if (offer?.images && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  const goToNext = () => {
    if (offer?.images && currentImageIndex < (offer.images.length - 1)) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Učitavanje ponude...</p>
        </div>
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Ponuda nije pronađena'}
          </h2>
          <p className="text-gray-600 mb-6">
            Ova ponuda više nije dostupna ili ne postoji.
          </p>
          <Link
            href={`/a/${slug}/results`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad na rezultate
          </Link>
        </div>
      </div>
    )
  }

  const label = getOfferLabel(offer)
  const images = offer.images || []
  const primaryImage = images[0]?.url
  const currentImage = images[currentImageIndex]?.url || primaryImage
  const nights = differenceInDays(new Date(offer.return_date), new Date(offer.departure_date))
  const totalPrice = offer.price_per_person * guestCount
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const locationText = [offer.city, offer.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-white">
      {/* Photo Gallery - Full viewport height on mobile */}
      <div
        ref={galleryRef}
        className="relative h-screen sm:h-[70vh] bg-gradient-to-br from-gray-300 to-gray-400"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={offer.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500">
            <div className="text-center text-white">
              <span className="text-7xl mb-4 block">🏨</span>
              <span className="text-2xl font-semibold">{locationText || offer.country}</span>
            </div>
          </div>
        )}

        {/* Overlay gradient at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <Link
            href={`/a/${slug}/results`}
            className="bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: offer.name,
                  text: `Pogledajte ovu ponudu: ${offer.name}`,
                  url: window.location.href,
                })
              }
            }}
            className="bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation arrows (desktop) */}
        {images.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button
                onClick={goToNext}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white p-3 rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 text-white z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 line-clamp-2">
                {offer.name}
              </h1>
              <div className="flex items-center gap-2 text-sm sm:text-base text-white/90">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{locationText || offer.country}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl sm:text-3xl font-bold">
                €{offer.price_per_person.toLocaleString('sr-Latn')}
              </div>
              <div className="text-sm text-white/80">/osoba</div>
            </div>
          </div>
        </div>

        {/* Dots indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Urgency badges */}
        {label && (
          <div className={`${getLabelBgColor(label.color)} text-white px-4 py-3 rounded-xl font-semibold inline-block`}>
            {label.icon} {label.text}
          </div>
        )}

        {/* Date and duration */}
        <div className="flex items-center gap-4 text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="font-medium">
              {formatShortDate(offer.departure_date)} - {formatShortDate(offer.return_date)}
            </span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{nights} noći</span>
          </div>
        </div>

        {/* Accommodation details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <Hotel className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Smeštaj</div>
              <div className="font-semibold text-gray-900">
                {offer.name}
                {offer.star_rating && (
                  <span className="ml-2 text-yellow-500">
                    {formatStarRating(offer.star_rating)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <Utensils className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Ishrana</div>
              <div className="font-semibold text-gray-900">
                {getBoardLabel(offer.board_type)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <Plane className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Prevoz</div>
              <div className="font-semibold text-gray-900">
                {getTransportLabel(offer.transport_type)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <Users className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500 mb-1">Dostupno mesta</div>
              <div className="font-semibold text-gray-900">
                {offer.available_spots} / {offer.total_spots}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {offer.description && (
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Opis</h3>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {offer.description}
            </p>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500">Ukupna cena</div>
              <div className="flex items-baseline gap-2">
                {hasDiscount && offer.original_price && (
                  <span className="text-sm text-gray-400 line-through">
                    €{(offer.original_price * guestCount).toLocaleString('sr-Latn')}
                  </span>
                )}
                <span className="text-2xl font-bold text-gray-900">
                  €{totalPrice.toLocaleString('sr-Latn')}
                </span>
                <span className="text-sm text-gray-500">
                  za {guestCount} {guestCount === 1 ? 'osobu' : 'osobe'}
                </span>
              </div>
            </div>
            <Link
              href={offer.inventory_type === 'owned' ? `/a/${slug}/reserve/${offer.id}` : `/a/${slug}/inquiry/${offer.id}`}
              className={`flex-shrink-0 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl ${
                offer.inventory_type === 'owned'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-900 text-white'
              }`}
            >
              {offer.inventory_type === 'owned' ? 'Rezerviši →' : 'Pošalji upit →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
