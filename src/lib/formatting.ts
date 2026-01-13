import { format, differenceInDays } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { BoardType, TransportType, AccommodationType } from '@/types'

/**
 * Format date range in Serbian
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const nights = differenceInDays(end, start)
  
  return `${format(start, 'd', { locale: sr })} - ${format(end, 'd. MMM yyyy', { locale: sr })} • ${nights} noći`
}

/**
 * Format single date in Serbian
 */
export function formatDate(date: string): string {
  return format(new Date(date), 'd. MMMM yyyy', { locale: sr })
}

/**
 * Format short date (e.g., "15. jul")
 */
export function formatShortDate(date: string): string {
  return format(new Date(date), 'd. MMM', { locale: sr })
}

/**
 * Get board type label in Serbian
 */
export function getBoardLabel(boardType: BoardType | null | undefined): string {
  const labels: Record<BoardType, string> = {
    all_inclusive: 'All Inclusive',
    half_board: 'Polupansion',
    breakfast: 'Doručak',
    room_only: 'Samo noćenje',
    any: 'Bilo koja ishrana',
  }
  return labels[boardType || 'any']
}

/**
 * Get transport type label in Serbian
 */
export function getTransportLabel(transportType: TransportType | null | undefined): string {
  const labels: Record<TransportType, string> = {
    flight: 'Avion',
    bus: 'Autobus',
    own: 'Sopstveni prevoz',
    none: 'Bez prevoza',
  }
  return labels[transportType || 'none']
}

/**
 * Get accommodation type label in Serbian
 */
export function getAccommodationLabel(accommodationType: AccommodationType | null | undefined): string {
  const labels: Record<AccommodationType, string> = {
    hotel: 'Hotel',
    apartment: 'Apartman',
    villa: 'Vila',
    any: 'Bilo koji smeštaj',
  }
  return labels[accommodationType || 'any']
}

/**
 * Format price in EUR
 */
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  return `€${amount.toLocaleString('sr-Latn')}`
}

/**
 * Format guest count
 */
export function formatGuests(adults: number, children: number = 0): string {
  const total = adults + children
  if (children === 0) {
    return `${adults} ${adults === 1 ? 'odrasla osoba' : adults < 5 ? 'odrasle osobe' : 'odraslih osoba'}`
  }
  return `${adults} odr. + ${children} ${children === 1 ? 'dete' : 'dece'} (${total} ukupno)`
}

/**
 * Format response time based on working hours
 */
export function formatResponseTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'dan' : 'dana'}`
}

/**
 * Generate star rating display
 */
export function formatStarRating(rating: number | null | undefined): string {
  if (!rating) return ''
  return '★'.repeat(rating)
}
