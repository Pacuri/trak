'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Share2, MapPin, Calendar, Users, Utensils, Plane, Hotel, Star, TrendingUp, Check, Sparkles, Clock, ArrowUpRight } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating, formatShortDate } from '@/lib/formatting'
import { differenceInDays, format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface UpsellOption {
  type: 'meal_upgrade' | 'room_upgrade' | 'supplement' | 'alternative_date'
  code?: string
  name: string
  description: string
  icon: string
  pricePerPersonPerNight?: number
  priceDiffPerPersonPerNight?: number
  amount?: number
  percent?: number
  per?: string
  currency?: string
  departureId?: string
  departureDate?: string
  returnDate?: string
  effectivePrice?: number
  priceDiff?: number
  availableSpots?: number
  isFeatured?: boolean
  roomTypeId?: string
  maxPersons?: number
}

interface UpsellData {
  packageId: string
  packageName: string
  upsells: UpsellOption[]
  availableMealPlans: string[]
  roomTypes: any[]
}

export default function OfferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const offerId = params.offerId as string

  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [guestCount, setGuestCount] = useState(1)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Upsell state
  const [upsellData, setUpsellData] = useState<UpsellData | null>(null)
  const [loadingUpsells, setLoadingUpsells] = useState(false)
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set())

  // Get qualification data from session storage
  useEffect(() => {
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      try {
        const qualData = JSON.parse(storedQualification) as QualificationData
        setQualification(qualData)
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

  // Fetch upsell options once we have the offer
  useEffect(() => {
    const fetchUpsells = async () => {
      if (!offer || !qualification) return

      try {
        setLoadingUpsells(true)
        const params = new URLSearchParams()

        if (qualification.dates.exactStart) {
          params.set('check_in', qualification.dates.exactStart)
        }
        if (qualification.dates.exactEnd) {
          params.set('check_out', qualification.dates.exactEnd)
        }
        params.set('adults', String(qualification.guests.adults))
        params.set('children', String(qualification.guests.children))
        if (qualification.accommodation.board) {
          params.set('meal_plan', mapBoardTypeToMealPlan(qualification.accommodation.board))
        }

        const response = await fetch(
          `/api/public/agencies/${slug}/offers/${offerId}/upsells?${params.toString()}`
        )

        if (response.ok) {
          const data = await response.json()
          setUpsellData(data)
        }
      } catch (err) {
        console.error('Error fetching upsells:', err)
      } finally {
        setLoadingUpsells(false)
      }
    }

    fetchUpsells()
  }, [offer, qualification, slug, offerId])

  // Preload adjacent images
  useEffect(() => {
    if (!offer?.images || offer.images.length === 0) return

    const images = offer.images
    const preloadIndexes = [
      currentImageIndex - 1,
      currentImageIndex + 1,
    ].filter((idx) => idx >= 0 && idx < images.length)

    preloadIndexes.forEach((idx) => {
      const img = new window.Image()
      img.src = images[idx].url
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

  const toggleUpsell = (upsellKey: string) => {
    setSelectedUpsells(prev => {
      const newSet = new Set(prev)
      if (newSet.has(upsellKey)) {
        newSet.delete(upsellKey)
      } else {
        newSet.add(upsellKey)
      }
      return newSet
    })
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

  // On detail page, always show label if offer qualifies (showAlways = true)
  const label = getOfferLabel(offer, 0, true)
  const images = offer.images || []
  const primaryImage = images[0]?.url
  const currentImage = images[currentImageIndex]?.url || primaryImage
  const nights = differenceInDays(new Date(offer.return_date), new Date(offer.departure_date))
  const basePrice = offer.price_per_person * guestCount
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const locationText = [offer.city, offer.country].filter(Boolean).join(', ')

  // Calculate upsell additions
  const selectedUpsellsArray = upsellData?.upsells.filter(u => selectedUpsells.has(getUpsellKey(u))) || []
  const upsellTotal = selectedUpsellsArray.reduce((total, upsell) => {
    if (upsell.priceDiffPerPersonPerNight) {
      return total + (upsell.priceDiffPerPersonPerNight * nights * guestCount)
    }
    if (upsell.amount) {
      if (upsell.per === 'night') return total + (upsell.amount * nights)
      if (upsell.per === 'stay') return total + upsell.amount
      if (upsell.per === 'person_night') return total + (upsell.amount * nights * guestCount)
      if (upsell.per === 'person_stay') return total + (upsell.amount * guestCount)
      return total + upsell.amount
    }
    return total
  }, 0)

  const totalPrice = basePrice + upsellTotal

  // Upsell categories
  const mealUpgrades = upsellData?.upsells.filter(u => u.type === 'meal_upgrade') || []
  const roomUpgrades = upsellData?.upsells.filter(u => u.type === 'room_upgrade') || []
  const supplements = upsellData?.upsells.filter(u => u.type === 'supplement') || []
  const alternativeDates = upsellData?.upsells.filter(u => u.type === 'alternative_date') || []

  const hasUpsells = mealUpgrades.length > 0 || roomUpgrades.length > 0 || supplements.length > 0

  return (
    <div className="min-h-screen bg-white">
      {/* Photo Gallery - Full viewport height on mobile */}
      <div
        ref={galleryRef}
        className="relative h-[70vh] sm:h-[60vh] bg-gradient-to-br from-gray-300 to-gray-400"
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
        {/* Qualification Summary - Show what user selected */}
        {qualification && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Vaša pretraga
            </h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="bg-white px-3 py-1 rounded-full text-gray-700 border border-blue-100">
                {qualification.guests.adults} {qualification.guests.adults === 1 ? 'odrasla osoba' : qualification.guests.adults < 5 ? 'odrasle osobe' : 'odraslih'}
                {qualification.guests.children > 0 && ` + ${qualification.guests.children} ${qualification.guests.children === 1 ? 'dete' : 'dece'}`}
              </span>
              {qualification.dates.month && (
                <span className="bg-white px-3 py-1 rounded-full text-gray-700 border border-blue-100">
                  {qualification.dates.month}
                </span>
              )}
              {qualification.dates.exactStart && (
                <span className="bg-white px-3 py-1 rounded-full text-gray-700 border border-blue-100">
                  {format(new Date(qualification.dates.exactStart), 'd. MMM', { locale: sr })}
                  {qualification.dates.exactEnd && ` - ${format(new Date(qualification.dates.exactEnd), 'd. MMM', { locale: sr })}`}
                </span>
              )}
              {qualification.accommodation.board && (
                <span className="bg-white px-3 py-1 rounded-full text-gray-700 border border-blue-100">
                  {getBoardLabel(qualification.accommodation.board)}
                </span>
              )}
              {qualification.accommodation.transport && (
                <span className="bg-white px-3 py-1 rounded-full text-gray-700 border border-blue-100">
                  {getTransportLabel(qualification.accommodation.transport)}
                </span>
              )}
            </div>
          </div>
        )}

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

        {/* UPSELL SECTION */}
        {hasUpsells && (
          <div className="border-t border-gray-100 pt-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Nadogradite vaše putovanje
            </h3>

            {/* Meal Upgrades */}
            {mealUpgrades.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Nadogradnja ishrane
                </h4>
                <div className="space-y-2">
                  {mealUpgrades.map((upsell) => {
                    const key = getUpsellKey(upsell)
                    const isSelected = selectedUpsells.has(key)
                    const totalDiff = (upsell.priceDiffPerPersonPerNight || 0) * nights * guestCount

                    return (
                      <button
                        key={key}
                        onClick={() => toggleUpsell(key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl">{upsell.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900">{upsell.name}</div>
                          <div className="text-sm text-gray-500">{upsell.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            +€{totalDiff.toLocaleString('sr-Latn')}
                          </div>
                          <div className="text-xs text-gray-400">
                            +€{upsell.priceDiffPerPersonPerNight}/os/noć
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Room Upgrades */}
            {roomUpgrades.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Nadogradnja sobe
                </h4>
                <div className="space-y-2">
                  {roomUpgrades.map((upsell) => {
                    const key = getUpsellKey(upsell)
                    const isSelected = selectedUpsells.has(key)
                    const totalDiff = (upsell.priceDiffPerPersonPerNight || 0) * nights * guestCount

                    return (
                      <button
                        key={key}
                        onClick={() => toggleUpsell(key)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl">{upsell.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900">{upsell.name}</div>
                          <div className="text-sm text-gray-500">
                            {upsell.description} • Do {upsell.maxPersons} osoba
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            +€{totalDiff.toLocaleString('sr-Latn')}
                          </div>
                          <div className="text-xs text-gray-400">
                            +€{upsell.priceDiffPerPersonPerNight}/os/noć
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Optional Supplements */}
            {supplements.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Dodatne usluge
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {supplements.map((upsell) => {
                    const key = getUpsellKey(upsell)
                    const isSelected = selectedUpsells.has(key)
                    const supplementTotal = calculateSupplementTotal(upsell, nights, guestCount)

                    return (
                      <button
                        key={key}
                        onClick={() => toggleUpsell(key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className="text-xl">{upsell.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 text-sm">{upsell.name}</div>
                          <div className="text-xs text-gray-500">{upsell.description}</div>
                        </div>
                        <div className="font-semibold text-green-600 text-sm">
                          +€{supplementTotal}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alternative Dates (Better Prices) */}
        {alternativeDates.length > 0 && (
          <div className="border-t border-gray-100 pt-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Uštedite sa drugim datumima
            </h3>
            <div className="space-y-2">
              {alternativeDates.map((alt) => (
                <Link
                  key={alt.departureId}
                  href={`/a/${slug}/offer/${alt.departureId}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 transition-all"
                >
                  <span className="text-2xl">📅</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {format(new Date(alt.departureDate!), 'd. MMM', { locale: sr })} - {format(new Date(alt.returnDate!), 'd. MMM yyyy', { locale: sr })}
                    </div>
                    <div className="text-sm text-gray-500">
                      Još {alt.availableSpots} mesta
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      €{alt.effectivePrice}/os
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      Ušteda €{Math.abs(alt.priceDiff || 0)}/os
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500">Ukupna cena</div>
              <div className="flex items-baseline gap-2 flex-wrap">
                {hasDiscount && offer.original_price && (
                  <span className="text-sm text-gray-400 line-through">
                    €{(offer.original_price * guestCount).toLocaleString('sr-Latn')}
                  </span>
                )}
                <span className="text-2xl font-bold text-gray-900">
                  €{totalPrice.toLocaleString('sr-Latn')}
                </span>
                {selectedUpsells.size > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    (+€{upsellTotal.toLocaleString('sr-Latn')} nadogradnje)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                za {guestCount} {guestCount === 1 ? 'osobu' : 'osobe'} • {nights} noći
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

// Helper functions
function getUpsellKey(upsell: UpsellOption): string {
  if (upsell.type === 'meal_upgrade') return `meal-${upsell.code}`
  if (upsell.type === 'room_upgrade') return `room-${upsell.roomTypeId}`
  if (upsell.type === 'supplement') return `supp-${upsell.code}`
  if (upsell.type === 'alternative_date') return `date-${upsell.departureId}`
  return `${upsell.type}-${upsell.code || upsell.name}`
}

function mapBoardTypeToMealPlan(board: string): string {
  const mapping: Record<string, string> = {
    'all_inclusive': 'AI',
    'half_board': 'HB',
    'breakfast': 'BB',
    'room_only': 'ND',
    'any': 'BB',
  }
  return mapping[board] || 'BB'
}

function calculateSupplementTotal(supplement: UpsellOption, nights: number, guestCount: number): number {
  const amount = supplement.amount || 0
  switch (supplement.per) {
    case 'night': return amount * nights
    case 'stay': return amount
    case 'person_night': return amount * nights * guestCount
    case 'person_stay': return amount * guestCount
    default: return amount
  }
}
