'use client'

import { MapPin, Users, Calendar, Home, UtensilsCrossed, Bus, Wallet } from 'lucide-react'
import type { InquiryCriteriaSummaryProps } from '@/types/inquiry'

// Label mappings for Serbian
const ACCOMMODATION_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  apartment: 'Apartman',
  villa: 'Vila',
  any: 'Svejedno',
}

const BOARD_LABELS: Record<string, string> = {
  all_inclusive: 'All Inclusive',
  half_board: 'Polupansion',
  breakfast: 'Doručak',
  room_only: 'Samo noćenje',
  any: 'Svejedno',
}

const TRANSPORT_LABELS: Record<string, string> = {
  flight: 'Avion',
  bus: 'Autobus',
  own: 'Sopstveni',
}

const MONTH_LABELS: Record<string, string> = {
  jan: 'Januar',
  feb: 'Februar',
  mar: 'Mart',
  apr: 'April',
  maj: 'Maj',
  jun: 'Jun',
  jul: 'Jul',
  avg: 'Avgust',
  sep: 'Septembar',
  okt: 'Oktobar',
  nov: 'Novembar',
  dec: 'Decembar',
}

export default function InquiryCriteriaSummary({ qualification }: InquiryCriteriaSummaryProps) {
  const { destination, guests, dates, accommodation, budget } = qualification

  const tags: { icon: React.ElementType; text: string }[] = []

  // Destination
  if (destination.country) {
    const destText = destination.city 
      ? `${destination.city}, ${destination.country}` 
      : destination.country
    tags.push({ icon: MapPin, text: destText })
  }

  // Guests
  const guestParts = []
  if (guests.adults > 0) {
    guestParts.push(`${guests.adults} ${guests.adults === 1 ? 'odrasla osoba' : guests.adults < 5 ? 'odrasle osobe' : 'odraslih'}`)
  }
  if (guests.children > 0) {
    guestParts.push(`${guests.children} ${guests.children === 1 ? 'dete' : 'dece'}`)
  }
  if (guestParts.length > 0) {
    tags.push({ icon: Users, text: guestParts.join(', ') })
  }

  // Dates
  if (dates.month && dates.month !== 'exact') {
    const monthLabel = MONTH_LABELS[dates.month] || dates.month
    const durationText = dates.duration ? `${dates.duration} noći` : ''
    const dateText = durationText ? `${monthLabel}, ${durationText}` : monthLabel
    tags.push({ icon: Calendar, text: dateText })
  } else if (dates.exactStart) {
    const exactDate = new Date(dates.exactStart).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
    })
    const durationText = dates.duration ? `, ${dates.duration} noći` : ''
    tags.push({ icon: Calendar, text: `${exactDate}${durationText}` })
  }

  // Accommodation
  if (accommodation.type && accommodation.type !== 'any') {
    tags.push({ icon: Home, text: ACCOMMODATION_LABELS[accommodation.type] || accommodation.type })
  }

  // Board
  if (accommodation.board && accommodation.board !== 'any') {
    tags.push({ icon: UtensilsCrossed, text: BOARD_LABELS[accommodation.board] || accommodation.board })
  }

  // Transport
  if (accommodation.transport) {
    tags.push({ icon: Bus, text: TRANSPORT_LABELS[accommodation.transport] || accommodation.transport })
  }

  // Budget
  if (budget.max) {
    const budgetText = budget.perPerson 
      ? `do €${budget.max}/os` 
      : `do €${budget.max} ukupno`
    tags.push({ icon: Wallet, text: budgetText })
  }

  if (tags.length === 0) return null

  return (
    <div className="bg-teal-50 rounded-xl p-4">
      <h3 className="text-sm font-medium text-teal-800 mb-3">
        Vaša pretraga
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <div 
            key={index}
            className="inline-flex items-center gap-1.5 bg-white text-teal-700 px-3 py-1.5 rounded-full text-sm border border-teal-200"
          >
            <tag.icon className="w-3.5 h-3.5" />
            <span>{tag.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
