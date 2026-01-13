'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating } from '@/lib/formatting'

interface InstantOfferCardProps {
  offer: Offer
  qualification: QualificationData
  slug: string
}

export default function InstantOfferCard({ offer, qualification, slug }: InstantOfferCardProps) {
  const label = getOfferLabel(offer)
  const guestCount = qualification.guests.adults + qualification.guests.children
  const totalPrice = offer.price_per_person * guestCount
  const bookedPercent = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  const primaryImage = offer.images?.[0]?.url

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Urgency Label */}
      {label && (
        <div className={`${getLabelBgColor(label.color)} text-white px-4 py-2 font-semibold`}>
          {label.icon} {label.text}
        </div>
      )}

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

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-lg text-gray-900">
            {offer.name} {formatStarRating(offer.star_rating)}
          </h3>
          <p className="text-sm text-gray-500">
            {offer.city}, {offer.country}
          </p>
        </div>

        {/* Details */}
        <div className="text-sm text-gray-600 space-y-1">
          <p>📅 {formatDateRange(offer.departure_date, offer.return_date)}</p>
          <p>
            🍽️ {getBoardLabel(offer.board_type)} • ✈️ {getTransportLabel(offer.transport_type)}
          </p>
        </div>

        {/* Capacity Bar - ONLY for owned */}
        {bookedPercent >= 50 && (
          <div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${bookedPercent >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${bookedPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {offer.available_spots}/{offer.total_spots} mesta
            </p>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline justify-between">
          <div>
            {offer.original_price && offer.original_price > offer.price_per_person && (
              <span className="text-sm text-gray-400 line-through mr-2">
                €{offer.original_price}
              </span>
            )}
            <span className="text-xl font-bold text-gray-900">€{offer.price_per_person}</span>
            <span className="text-sm text-gray-500">/os</span>
          </div>
          <span className="text-gray-500 text-sm">
            Ukupno: <span className="font-semibold">€{totalPrice.toLocaleString()}</span>
          </span>
        </div>

        {/* CTA */}
        <Link
          href={`/a/${slug}/reserve/${offer.id}`}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
        >
          Rezerviši →
        </Link>
      </div>
    </div>
  )
}
