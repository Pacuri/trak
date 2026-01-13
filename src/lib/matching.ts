import type { Offer, QualificationData } from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

interface ScoredOffer extends Offer {
  matchScore: number
  matchReasons: string[]
}

/**
 * Match and score offers based on qualification data.
 * Higher score = better match.
 */
export function matchOffers(
  offers: Offer[],
  qualification: QualificationData
): ScoredOffer[] {
  const scored = offers.map((offer) => {
    let score = 0
    const reasons: string[] = []

    // Destination match (high weight)
    if (qualification.destination.country) {
      if (offer.country.toLowerCase() === qualification.destination.country.toLowerCase()) {
        score += 30
        reasons.push('Destinacija se poklapa')
        
        // City bonus
        if (
          qualification.destination.city &&
          offer.city?.toLowerCase() === qualification.destination.city.toLowerCase()
        ) {
          score += 10
          reasons.push('Tačan grad')
        }
      }
    }

    // Date match
    if (qualification.dates.exactStart) {
      const offerDate = parseISO(offer.departure_date)
      const wantedDate = parseISO(qualification.dates.exactStart)
      const daysDiff = Math.abs(differenceInDays(offerDate, wantedDate))
      
      if (daysDiff === 0) {
        score += 25
        reasons.push('Tačan datum')
      } else if (daysDiff <= 3) {
        score += 20
        reasons.push('Datum ± 3 dana')
      } else if (daysDiff <= 7) {
        score += 10
        reasons.push('Datum ± nedelju dana')
      }
    } else if (qualification.dates.month) {
      // Check if offer is in the same month
      const offerMonth = new Date(offer.departure_date).toLocaleString('sr-Latn', { month: 'short' }).toLowerCase()
      if (offerMonth.includes(qualification.dates.month.toLowerCase())) {
        score += 15
        reasons.push('Mesec se poklapa')
      }
    }

    // Budget match
    if (qualification.budget.max) {
      const price = qualification.budget.perPerson
        ? offer.price_per_person
        : offer.price_per_person * (qualification.guests.adults + qualification.guests.children)
      
      if (price <= qualification.budget.max) {
        score += 20
        reasons.push('U budžetu')
        
        // Bonus for being significantly under budget
        if (price <= qualification.budget.max * 0.8) {
          score += 5
        }
      } else if (price <= qualification.budget.max * 1.1) {
        score += 10
        reasons.push('Blizu budžeta')
      }
    }

    // Accommodation match
    if (qualification.accommodation.type && qualification.accommodation.type !== 'any') {
      if (offer.accommodation_type === qualification.accommodation.type) {
        score += 10
        reasons.push('Tip smeštaja se poklapa')
      }
    }

    // Board match
    if (qualification.accommodation.board && qualification.accommodation.board !== 'any') {
      if (offer.board_type === qualification.accommodation.board) {
        score += 10
        reasons.push('Ishrana se poklapa')
      }
    }

    // Transport match
    if (qualification.accommodation.transport && qualification.accommodation.transport !== 'own') {
      if (offer.transport_type === qualification.accommodation.transport) {
        score += 5
        reasons.push('Prevoz se poklapa')
      }
    }

    // Capacity check
    const totalGuests = qualification.guests.adults + qualification.guests.children
    if (offer.available_spots >= totalGuests) {
      score += 5
      reasons.push('Ima mesta')
    }

    // Recommended bonus
    if (offer.is_recommended) {
      score += 5
      reasons.push('Preporučeno')
    }

    // Popularity bonus
    if (offer.views_last_24h >= 5) {
      score += 3
      reasons.push('Popularno')
    }

    return {
      ...offer,
      matchScore: score,
      matchReasons: reasons,
    }
  })

  // Sort by score descending
  return scored.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Filter offers that meet minimum criteria
 */
export function filterMatchingOffers(
  scoredOffers: ScoredOffer[],
  minScore: number = 20
): ScoredOffer[] {
  return scoredOffers.filter((offer) => offer.matchScore >= minScore)
}

/**
 * Split offers by inventory type
 */
export function splitByInventoryType(offers: Offer[]): {
  owned: Offer[]
  inquiry: Offer[]
} {
  return {
    owned: offers.filter((o) => o.inventory_type === 'owned'),
    inquiry: offers.filter((o) => o.inventory_type === 'inquiry'),
  }
}
