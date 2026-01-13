import { differenceInDays } from 'date-fns'
import type { Offer, UrgencyLabel, UrgencyLabelColor } from '@/types'

/**
 * Get urgency label for an offer.
 * Only ONE label per offer, highest priority wins.
 * Emojis ARE allowed in client-facing labels.
 */
export function getOfferLabel(offer: Offer): UrgencyLabel | null {
  const today = new Date()
  const daysUntilDeparture = differenceInDays(new Date(offer.departure_date), today)
  const bookedPercentage = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  const daysSinceCreated = differenceInDays(today, new Date(offer.created_at))
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const discountPercent = hasDiscount
    ? Math.round((1 - offer.price_per_person / (offer.original_price || offer.price_per_person)) * 100)
    : 0

  // Priority 1: Last spots (≤2)
  if (offer.available_spots <= 2 && offer.available_spots > 0) {
    return {
      type: 'POSLEDNJA_MESTA',
      text: `Još samo ${offer.available_spots}!`,
      color: 'red',
      icon: '🔥',
    }
  }

  // Priority 2: Departing soon (≤7 days)
  if (daysUntilDeparture <= 7 && daysUntilDeparture > 0) {
    return {
      type: 'ISTICE_USKORO',
      text: daysUntilDeparture <= 3 ? 'Polazak za par dana!' : 'Uskoro polazak',
      color: 'red',
      icon: '⏰',
    }
  }

  // Priority 3: Filling up (≥70%)
  if (bookedPercentage >= 70 && offer.available_spots > 2) {
    return {
      type: 'POPUNJAVA_SE',
      text: 'Popunjava se',
      color: 'orange',
      icon: '📈',
    }
  }

  // Priority 4: Discount (≥10%)
  if (hasDiscount && discountPercent >= 10) {
    return {
      type: 'SNIZENO',
      text: `-${discountPercent}%`,
      color: 'green',
      icon: '💰',
    }
  }

  // Priority 5: New (≤7 days)
  if (daysSinceCreated <= 7) {
    return {
      type: 'NOVO',
      text: 'Novo',
      color: 'purple',
      icon: '🆕',
    }
  }

  // Priority 6: Popular (≥10 views/24h)
  if (offer.views_last_24h >= 10) {
    return {
      type: 'POPULARNO',
      text: 'Popularno',
      color: 'blue',
      icon: '⭐',
    }
  }

  // Priority 7: Recommended (manual)
  if (offer.is_recommended) {
    return {
      type: 'PREPORUCUJEMO',
      text: 'Preporučujemo',
      color: 'blue',
      icon: '👍',
    }
  }

  return null
}

/**
 * Get Tailwind background color class for label color
 */
export function getLabelBgColor(color: UrgencyLabelColor): string {
  const colors: Record<UrgencyLabelColor, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
  }
  return colors[color]
}
