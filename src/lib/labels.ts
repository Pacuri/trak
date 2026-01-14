import { differenceInDays } from 'date-fns'
import type { Offer, UrgencyLabel, UrgencyLabelColor } from '@/types'

/**
 * Get urgency label for an offer with frequency control.
 * Only ONE label per offer, highest priority wins.
 * Emojis ARE allowed in client-facing labels.
 * 
 * @param offer - The offer to get a label for
 * @param index - The position of the offer in the list (for frequency control)
 * @param showAlways - If true, skip frequency checks (for first-in-category items)
 */
export function getOfferLabel(
  offer: Offer, 
  index: number = 0, 
  showAlways: boolean = false
): UrgencyLabel | null {
  const today = new Date()
  const daysUntilDeparture = differenceInDays(new Date(offer.departure_date), today)
  const bookedPercentage = ((offer.total_spots - offer.available_spots) / offer.total_spots) * 100
  const daysSinceCreated = differenceInDays(today, new Date(offer.created_at))
  const hasDiscount = offer.original_price && offer.original_price > offer.price_per_person
  const discountPercent = hasDiscount
    ? Math.round((1 - offer.price_per_person / (offer.original_price || offer.price_per_person)) * 100)
    : 0

  // Frequency control: Only ~30% of offers should show urgency badges
  // Use a deterministic approach based on offer ID hash + index
  const shouldShowBadge = showAlways || shouldDisplayBadge(offer.id, index)
  
  // "Novo" badge is even rarer: ~1 in 25 offers
  const shouldShowNovo = showAlways || shouldDisplayNovoBadge(offer.id, index)

  // Priority 1: Last spots (≤2) - Always show if conditions met (high urgency)
  if (offer.available_spots <= 2 && offer.available_spots > 0) {
    return {
      type: 'POSLEDNJA_MESTA',
      text: `Još samo ${offer.available_spots}!`,
      color: 'red',
      icon: '🔥',
    }
  }

  // Priority 2: Departing soon (≤7 days) - Show ~30% when conditions met
  if (daysUntilDeparture <= 7 && daysUntilDeparture > 0 && shouldShowBadge) {
    return {
      type: 'ISTICE_USKORO',
      text: daysUntilDeparture <= 3 ? 'Polazak za par dana!' : 'Uskoro polazak',
      color: 'red',
      icon: '⏰',
    }
  }

  // Priority 3: Filling up (≥70%) - Show ~30% when conditions met
  if (bookedPercentage >= 70 && offer.available_spots > 2 && shouldShowBadge) {
    return {
      type: 'POPUNJAVA_SE',
      text: 'Popunjava se',
      color: 'orange',
      icon: '📈',
    }
  }

  // Priority 4: Discount (≥15%) - Show ~30% when conditions met, higher threshold
  if (hasDiscount && discountPercent >= 15 && shouldShowBadge) {
    return {
      type: 'SNIZENO',
      text: `-${discountPercent}%`,
      color: 'green',
      icon: '💰',
    }
  }

  // Priority 5: New (≤7 days) - Very rare, ~1 in 25 offers
  if (daysSinceCreated <= 7 && shouldShowNovo) {
    return {
      type: 'NOVO',
      text: 'Novo',
      color: 'purple',
      icon: '🆕',
    }
  }

  // Removed: POPULARNO and PREPORUCUJEMO badges are now handled separately
  // They should not appear as urgency labels on every card

  return null
}

/**
 * Determine if this offer should display a badge based on ~30% frequency
 * Uses offer ID to make it deterministic (same offer always shows/hides badge)
 */
function shouldDisplayBadge(offerId: string, index: number): boolean {
  // Use the last character of the offer ID to determine visibility
  // This gives a somewhat random but deterministic distribution
  const lastChar = offerId.slice(-1)
  const charCode = lastChar.charCodeAt(0)
  // Show badge if charCode % 3 === 0 (roughly 33% of offers)
  return charCode % 3 === 0
}

/**
 * Determine if this offer should display a "Novo" badge (~4% frequency)
 * Even rarer than other badges
 */
function shouldDisplayNovoBadge(offerId: string, index: number): boolean {
  // Use last 2 characters for more granular control
  const lastChars = offerId.slice(-2)
  const sum = lastChars.charCodeAt(0) + lastChars.charCodeAt(1)
  // Show badge if sum % 25 === 0 (roughly 4% of offers)
  return sum % 25 === 0
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
