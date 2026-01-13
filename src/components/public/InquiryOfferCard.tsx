'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating } from '@/lib/formatting'
import ResponseTimeDisplay from './ResponseTimeDisplay'

interface InquiryOfferCardProps {
  offer: Offer
  qualification: QualificationData
  slug: string
  responseTimeMinutes?: number
  isWithinWorkingHours?: boolean
}

export default function InquiryOfferCard({
  offer,
  qualification,
  slug,
  responseTimeMinutes = 30,
  isWithinWorkingHours = true,
}: InquiryOfferCardProps) {
  const label = getOfferLabel(offer)
  const guestCount = qualification.guests.adults + qualification.guests.children
  const totalPrice = offer.price_per_person * guestCount
  const primaryImage = offer.images?.[0]?.url

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Urgency Label - still applies */}
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
        
        {/* On-request badge */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-600">
          Na upit
        </div>
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

        {/* Response Time - instead of capacity */}
        <ResponseTimeDisplay
          responseTimeMinutes={responseTimeMinutes}
          isWithinWorkingHours={isWithinWorkingHours}
          compact
        />

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
          href={`/a/${slug}/inquiry/${offer.id}`}
          className="block w-full bg-gray-800 hover:bg-gray-900 text-white text-center py-3 rounded-lg font-medium transition-colors"
        >
          Pošalji upit →
        </Link>
      </div>
    </div>
  )
}
