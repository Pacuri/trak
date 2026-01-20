'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Clock } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import { getOfferLabel, getLabelBgColor } from '@/lib/labels'
import { getBoardLabel, getTransportLabel, formatStarRating, formatShortDate } from '@/lib/formatting'
import { differenceInDays, format } from 'date-fns'
import { sr } from 'date-fns/locale'

// Extended offer type that includes na_upit fields and calculated prices
type ExtendedOffer = Offer & {
  valid_from?: string | null
  valid_to?: string | null
  package_id?: string | null
  duration_nights?: number | null
  calculated_total?: number | null
  calculated_per_person?: number | null
  price_calculation_error?: string | null
}

interface InquiryOfferCardProps {
  offer: Offer
  qualification?: QualificationData | null
  slug: string
  responseTimeMinutes?: number
  isWithinWorkingHours?: boolean
  index?: number
  isFirstRecommended?: boolean
}

export default function InquiryOfferCard({
  offer,
  qualification,
  slug,
  responseTimeMinutes = 30,
  isWithinWorkingHours = true,
  index = 0,
  isFirstRecommended = false,
}: InquiryOfferCardProps) {
  const extOffer = offer as ExtendedOffer

  // Get urgency label with frequency control
  const label = getOfferLabel(offer, index, false)

  const guestCount = qualification ? qualification.guests.adults + qualification.guests.children : 0

  // Use calculated_total from API if available (includes children discounts), otherwise simple calculation
  const totalPrice = extOffer.calculated_total != null
    ? extOffer.calculated_total
    : (guestCount > 0 ? offer.price_per_person * guestCount : 0)

  // Use calculated_per_person if available
  const displayPricePerPerson = extOffer.calculated_per_person != null
    ? extOffer.calculated_per_person
    : offer.price_per_person

  const showTotal = qualification != null && guestCount > 0 && (offer.price_per_person > 0 || extOffer.calculated_total != null)
  const primaryImage = offer.images?.[0]?.url

  // For na_upit packages, use duration_nights if available, otherwise calculate from dates
  const nights = extOffer.duration_nights || differenceInDays(new Date(offer.return_date), new Date(offer.departure_date))

  const locationText = [offer.city, offer.country].filter(Boolean).join(', ')

  // Format validity period for na_upit packages
  const formatValidityPeriod = () => {
    if (extOffer.valid_from && extOffer.valid_to) {
      const from = new Date(extOffer.valid_from)
      const to = new Date(extOffer.valid_to)
      const fromMonth = format(from, 'LLLL', { locale: sr })
      const toMonth = format(to, 'LLLL', { locale: sr })
      if (fromMonth === toMonth) {
        return `${fromMonth} • ${nights} noći`
      }
      return `${fromMonth} - ${toMonth} • ${nights} noći`
    }
    // Fallback to departure dates
    return `${formatShortDate(offer.departure_date)} - ${formatShortDate(offer.return_date)} • ${nights} noći`
  }
  
  // Format response time
  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `~${minutes} min`
    const hours = Math.round(minutes / 60)
    return `~${hours}h`
  }

  // Na upit package-based: link to /paket/[packageId] for date picker; otherwise /offer/[id]
  const detailHref = offer.package_id ? `/a/${slug}/paket/${offer.package_id}` : `/a/${slug}/offer/${offer.id}`

  return (
    <Link
      href={detailHref}
      className="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]"
    >
      {/* Photo Area */}
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

        {/* Top-left: Single urgency badge (if applicable, ~30% of cards) */}
        {label && (
          <div className="absolute top-3 left-3">
            <span className={`${getLabelBgColor(label.color)} text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg`}>
              {label.icon} {label.text}
            </span>
          </div>
        )}

        {/* Show "Preporučeno" ONLY on first recommended card in category */}
        {!label && isFirstRecommended && offer.is_recommended && (
          <div className="absolute top-3 left-3">
            <span className="bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              👍 Preporučeno
            </span>
          </div>
        )}
      </div>

      {/* Info Area */}
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
            {formatValidityPeriod()}
          </p>
          <p className="line-clamp-1">
            {getBoardLabel(offer.board_type)} • {getTransportLabel(offer.transport_type)}
          </p>
        </div>

        {/* Row 4: Response time indicator */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Odgovor {formatResponseTime(responseTimeMinutes)}</span>
        </div>

        {/* Row 5: Price */}
        <div className={`flex items-baseline pt-2 border-t border-gray-100 ${showTotal ? 'justify-between' : ''}`}>
          {(offer.price_per_person > 0 || displayPricePerPerson > 0) ? (
            <>
              <div className="flex items-baseline gap-2">
                {offer.original_price && offer.original_price > displayPricePerPerson && (
                  <span className="text-sm text-gray-400 line-through">
                    €{offer.original_price?.toLocaleString('sr-Latn')}
                  </span>
                )}
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                  €{Math.round(displayPricePerPerson).toLocaleString('sr-Latn')}
                </span>
                <span className="text-sm text-gray-500">/os</span>
              </div>
              {showTotal && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">Ukupno</div>
                  <div className="text-sm font-semibold text-gray-900">
                    €{Math.round(totalPrice).toLocaleString('sr-Latn')}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-teal-600">
                Cena na upit
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
