'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Utensils } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { getBoardLabel, formatStarRating } from '@/lib/formatting'
import { differenceInDays, format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface PremiumOfferCardProps {
  offer: Offer & {
    valid_from?: string | null
    valid_to?: string | null
    duration_nights?: number | null
    calculated_total?: number | null
    calculated_per_person?: number | null
  }
  qualification?: QualificationData | null
  slug: string
  index?: number
  isFirstRecommended?: boolean
}

export default function PremiumOfferCard({
  offer,
  qualification,
  slug,
  index = 0,
}: PremiumOfferCardProps) {
  const label = getOfferLabel(offer, index, false)
  const isRecommended = offer.is_recommended

  const guestCount = qualification ? qualification.guests.adults + qualification.guests.children : 0
  const adultsCount = qualification?.guests.adults || 2

  // Use calculated prices if available, otherwise fall back to offer prices
  const pricePerPerson = offer.calculated_per_person || offer.price_per_person
  const totalPrice = offer.calculated_total || (guestCount > 0 ? pricePerPerson * guestCount : pricePerPerson * 2)

  const primaryImage = offer.images?.[0]?.url

  // Check if this is an inquiry-based (na upit) package - flexible dates
  const isInquiryPackage = offer.inventory_type === 'inquiry'

  // Calculate nights - for inquiry packages, only use duration_nights if explicitly set
  // For fixed packages, calculate from dates or default to 7
  const nights = isInquiryPackage
    ? offer.duration_nights // Only show if explicitly set for inquiry packages
    : (offer.duration_nights ||
       (offer.departure_date && offer.return_date
         ? differenceInDays(new Date(offer.return_date), new Date(offer.departure_date))
         : qualification?.dates?.duration || 7))

  // Format departure date - for inquiry packages show date range
  const departureDate = offer.departure_date
    ? format(new Date(offer.departure_date), 'd. MMM yyyy', { locale: sr })
    : (isInquiryPackage && offer.valid_from && offer.valid_to)
      ? `${format(new Date(offer.valid_from), 'd. MMM', { locale: sr })} - ${format(new Date(offer.valid_to), 'd. MMM', { locale: sr })}`
      : offer.valid_from
        ? `od ${format(new Date(offer.valid_from), 'd. MMM', { locale: sr })}`
        : null

  const locationText = [offer.city, offer.country].filter(Boolean).join(', ')
  const boardLabel = getBoardLabel(offer.board_type)

  // Calculate price per night per person (only when nights is available)
  const pricePerNight = nights && nights > 0 ? Math.round(pricePerPerson / nights) : pricePerPerson

  // Style variants based on recommendation
  const cardStyles = isRecommended
    ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900'
    : 'bg-white border border-slate-200'

  const textPrimary = isRecommended ? 'text-white' : 'text-slate-900'
  const textSecondary = isRecommended ? 'text-white/60' : 'text-slate-500'
  const textMuted = isRecommended ? 'text-white/50' : 'text-slate-400'
  const detailBoxBg = isRecommended ? 'bg-white/10' : 'bg-slate-50'
  const priceBg = isRecommended ? 'bg-white/10' : 'bg-gradient-to-r from-slate-50 to-slate-100'
  const priceColor = isRecommended ? 'text-amber-400' : 'text-emerald-600'
  const boardTagBg = isRecommended
    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700'

  return (
    <Link
      href={offer.package_id ? `/a/${slug}/paket/${offer.package_id}` : `/a/${slug}/offer/${offer.id}`}
      className={`block rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] ${cardStyles}`}
    >
      {/* Image Header */}
      <div className="relative h-36 sm:h-40">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={offer.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600" />
        )}

        {/* Gradient overlay */}
        <div className={`absolute inset-0 ${isRecommended
          ? 'bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent'
          : 'bg-gradient-to-t from-black/70 via-black/30 to-transparent'
          }`} />

        {/* Star rating badge */}
        {offer.star_rating && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-600 shadow-lg">
            {formatStarRating(offer.star_rating)}
          </div>
        )}

        {/* Recommended badge - ONLY for dark cards */}
        {isRecommended && (
          <div className="absolute top-3 left-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
              ⭐ Preporučeno
            </span>
          </div>
        )}

        {/* Urgency label - for non-recommended cards */}
        {!isRecommended && label && (
          <div className="absolute top-3 left-3">
            <span className={`${getLabelBgColor(label.color)} text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg`}>
              {label.icon} {label.text}
            </span>
          </div>
        )}

        {/* Hotel name and location overlay */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-1">
            {offer.name}
          </h3>
          <p className="text-white/90 text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {locationText || offer.country}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${textPrimary}`}>
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {departureDate && (
            <div className={`${detailBoxBg} rounded-xl px-3 py-2`}>
              <p className={`text-[10px] ${textSecondary} uppercase tracking-wide`}>
                {isInquiryPackage ? 'Dostupno' : 'Polazak'}
              </p>
              <p className="text-sm font-semibold">{departureDate}</p>
            </div>
          )}
          {/* Duration - show specific nights or "Po izboru" for inquiry packages */}
          <div className={`${detailBoxBg} rounded-xl px-3 py-2`}>
            <p className={`text-[10px] ${textSecondary} uppercase tracking-wide`}>Trajanje</p>
            <p className="text-sm font-semibold">
              {nights ? `${nights} noći` : (isInquiryPackage ? 'Po izboru' : '7 noći')}
            </p>
          </div>
          {guestCount > 0 && (
            <div className={`${detailBoxBg} rounded-xl px-3 py-2 col-span-2 sm:col-span-1`}>
              <p className={`text-[10px] ${textSecondary} uppercase tracking-wide`}>Gosti</p>
              <p className="text-sm font-semibold">
                {adultsCount} odraslih{qualification?.guests.children ? `, ${qualification.guests.children} dece` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Board type tag - always reserve space for consistent layout */}
        <div className="h-8 mb-3">
          {boardLabel && (
            <div className={`inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-medium ${boardTagBg}`}>
              <Utensils className="w-3 h-3" />
              {boardLabel}
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className={`${priceBg} rounded-xl p-3`}>
          <div className="flex justify-between items-end">
            <div>
              <p className={`text-[10px] ${textSecondary} uppercase tracking-wide`}>
                {isInquiryPackage ? 'Cena od' : 'Ukupna cena'}
              </p>
              <div className="flex items-baseline gap-2">
                {offer.original_price && offer.original_price > pricePerPerson && (
                  <span className={`text-sm ${textMuted} line-through`}>
                    €{(offer.original_price * (guestCount || 2)).toLocaleString('sr-Latn')}
                  </span>
                )}
                <span className={`text-2xl font-bold ${priceColor}`}>
                  {isInquiryPackage ? `€${pricePerPerson.toLocaleString('sr-Latn')}` : `€${totalPrice.toLocaleString('sr-Latn')}`}
                </span>
              </div>
              <p className={`text-xs ${textMuted}`}>
                {isInquiryPackage ? 'po osobi' : `€${pricePerPerson.toLocaleString('sr-Latn')} po osobi`}
              </p>
            </div>
            {/* Only show per night price for fixed packages with known duration */}
            {!isInquiryPackage && nights && (
              <div className="text-right">
                <p className={`text-xs ${textMuted}`}>ili od</p>
                <p className="text-lg font-semibold">€{pricePerNight}/noć</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-3 text-center">
          <span className={`text-sm ${textMuted}`}>
            Pogledaj ponudu →
          </span>
        </div>
      </div>
    </Link>
  )
}
