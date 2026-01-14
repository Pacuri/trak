'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating, formatShortDate } from '@/lib/formatting'
import { differenceInDays } from 'date-fns'

interface InstantOfferCardProps {
  offer: Offer
  qualification: QualificationData
  slug: string
}

export default function InstantOfferCard({ offer, qualification, slug }: InstantOfferCardProps) {
  const label = getOfferLabel(offer)
  const guestCount = qualification.guests.adults + qualification.guests.children
  const totalPrice = offer.price_per_person * guestCount
  const primaryImage = offer.images?.[0]?.url
  const nights = differenceInDays(new Date(offer.return_date), new Date(offer.departure_date))
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const discountPercent = hasDiscount
    ? Math.round((1 - offer.price_per_person / (offer.original_price || offer.price_per_person)) * 100)
    : 0

  const locationText = [offer.city, offer.country].filter(Boolean).join(', ')

  return (
    <Link
      href={`/a/${slug}/offer/${offer.id}`}
      className="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]"
    >
      {/* Photo Area - 60% height */}
      <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-gray-300 to-gray-400">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={offer.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500">
            <div className="text-center text-white">
              <span className="text-5xl mb-2 block">🏨</span>
              <span className="text-lg font-semibold">{locationText || offer.country}</span>
            </div>
          </div>
        )}

        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Top-left: Urgency badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {label && (
            <span className={`${getLabelBgColor(label.color)} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm`}>
              {label.icon} {label.text}
            </span>
          )}
          {hasDiscount && discountPercent >= 10 && !label && (
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
              💰 -{discountPercent}%
            </span>
          )}
        </div>

        {/* Top-right: Status badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            Aktivna
          </span>
        </div>

        {/* Bottom-left: Popularnost/Preporučeno */}
        {(offer.is_recommended || offer.views_last_24h >= 10) && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {offer.is_recommended ? 'Preporučeno' : 'Popularnost'}
            </span>
          </div>
        )}

        {/* Bottom-right: Capacity indicator */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            {offer.available_spots}/{offer.total_spots} mesta
          </span>
        </div>
      </div>

      {/* Info Area - 40% height */}
      <div className="p-4 sm:p-5 space-y-2">
        {/* Row 1: Location */}
        <div className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{locationText || offer.country}</span>
        </div>

        {/* Row 2: Hotel name + star rating */}
        <div>
          <h3 className="font-bold text-lg sm:text-xl text-gray-900 line-clamp-1">
            {offer.name}
          </h3>
          {offer.star_rating && (
            <div className="text-yellow-500 text-sm mt-0.5">
              {formatStarRating(offer.star_rating)}
            </div>
          )}
        </div>

        {/* Row 3: Date range • duration • board type • transport */}
        <div className="text-sm text-gray-600 space-y-1">
          <p className="line-clamp-1">
            {formatShortDate(offer.departure_date)} - {formatShortDate(offer.return_date)} • {nights} noći
          </p>
          <p className="line-clamp-1">
            {getBoardLabel(offer.board_type)} • {getTransportLabel(offer.transport_type)}
          </p>
        </div>

        {/* Row 4: Price */}
        <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
          <div className="flex items-baseline gap-2">
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                €{offer.original_price?.toLocaleString('sr-Latn')}
              </span>
            )}
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              €{offer.price_per_person.toLocaleString('sr-Latn')}
            </span>
            <span className="text-sm text-gray-500">/os</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Ukupno</div>
            <div className="text-sm font-semibold text-gray-900">
              €{totalPrice.toLocaleString('sr-Latn')}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
