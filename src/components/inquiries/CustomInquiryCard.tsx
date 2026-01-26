'use client'

import { Phone, Mail, MapPin, Users, Calendar, Clock, MessageSquare, Globe, Utensils, Bus, Home, Euro, Archive, ArchiveRestore } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { CustomInquiry } from '@/types'

interface CustomInquiryCardProps {
  inquiry: CustomInquiry
  onRespond: () => void
  onArchive?: () => void
  onUnarchive?: () => void
}

// Labels for accommodation types
const accommodationLabels: Record<string, string> = {
  hotel: 'Hotel',
  apartment: 'Apartman',
  villa: 'Vila',
  any: 'Svejedno',
}

// Labels for board types
const boardLabels: Record<string, string> = {
  all_inclusive: 'All Inclusive',
  half_board: 'Polupansion',
  breakfast: 'Doručak',
  room_only: 'Samo smeštaj',
  any: 'Svejedno',
}

// Labels for transport types
const transportLabels: Record<string, string> = {
  flight: 'Avion',
  bus: 'Autobus',
  own: 'Sopstveni',
  none: 'Bez prevoza',
}

export default function CustomInquiryCard({ inquiry, onRespond, onArchive, onUnarchive }: CustomInquiryCardProps) {
  const qualification = inquiry.qualification_data

  // Calculate wait time
  const hoursSinceCreation = (Date.now() - new Date(inquiry.created_at).getTime()) / (1000 * 60 * 60)

  // Format time display
  const formatWaitTime = () => {
    if (hoursSinceCreation < 1) {
      const mins = Math.floor(hoursSinceCreation * 60)
      return `${mins} min`
    } else if (hoursSinceCreation < 24) {
      return `${Math.floor(hoursSinceCreation)}h`
    } else {
      const days = Math.floor(hoursSinceCreation / 24)
      return `${days}d`
    }
  }

  // Determine urgency for the time badge only (not button)
  const isUrgent = hoursSinceCreation >= 4
  const isWarning = hoursSinceCreation >= 2 && hoursSinceCreation < 4

  // Get destination string
  const destination = qualification?.destination
  const destinationText = destination
    ? [destination.city, destination.country].filter(Boolean).join(', ')
    : null

  // Get guests info
  const guests = qualification?.guests
  const totalGuests = guests ? guests.adults + guests.children : 0
  const guestText = guests
    ? `${guests.adults}${guests.children ? ` + ${guests.children}` : ''}`
    : null

  // Get travel dates
  const dates = qualification?.dates
  const dateText = dates?.month || (dates?.flexible ? 'Fleksibilno' : null)
  const durationText = dates?.duration ? `${dates.duration} noći` : null

  // Get accommodation preferences
  const accommodation = qualification?.accommodation
  const accommodationType = accommodation?.type ? accommodationLabels[accommodation.type] : null
  const boardType = accommodation?.board ? boardLabels[accommodation.board] : null
  const transportType = accommodation?.transport ? transportLabels[accommodation.transport] : null

  // Get budget
  const budget = qualification?.budget
  const budgetText = budget?.max
    ? `do €${budget.max}${budget.perPerson ? '/os' : ''}`
    : budget?.min
      ? `od €${budget.min}${budget.perPerson ? '/os' : ''}`
      : null

  // Status badge
  const getStatusBadge = () => {
    switch (inquiry.status) {
      case 'new':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            Čeka odgovor
          </span>
        )
      case 'contacted':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Kontaktiran
          </span>
        )
      case 'converted':
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Konvertovan
          </span>
        )
      case 'closed':
      case 'responded':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            Zatvoren
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Header - Type badge and time */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
            <Globe className="h-3 w-3" />
            Upit sa sajta
          </span>
          {getStatusBadge()}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-400'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {formatWaitTime()}
        </div>
      </div>

      {/* Destination highlight */}
      {destinationText && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-900">{destinationText}</span>
          </div>
        </div>
      )}

      {/* Quick info row */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        {guestText && (
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {guestText}
          </span>
        )}
        {dateText && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {dateText}
          </span>
        )}
        {durationText && (
          <span className="text-slate-400">• {durationText}</span>
        )}
        {budgetText && (
          <span className="flex items-center gap-1">
            <Euro className="w-3.5 h-3.5 text-slate-400" />
            {budgetText}
          </span>
        )}
      </div>

      {/* Preferences tags */}
      {(accommodationType || boardType || transportType) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {accommodationType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
              <Home className="w-3 h-3" />
              {accommodationType}
            </span>
          )}
          {boardType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
              <Utensils className="w-3 h-3" />
              {boardType}
            </span>
          )}
          {transportType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
              <Bus className="w-3 h-3" />
              {transportType}
            </span>
          )}
        </div>
      )}

      {/* Customer note if present */}
      {inquiry.customer_note && (
        <div className="px-4 pb-3">
          <div className="p-2.5 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700 line-clamp-2">{inquiry.customer_note}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer contact info */}
      <div className="px-4 pb-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 truncate">{inquiry.customer_name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <a
                href={`tel:${inquiry.customer_phone}`}
                className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                {inquiry.customer_phone}
              </a>
              {inquiry.customer_email && (
                <a
                  href={`mailto:${inquiry.customer_email}`}
                  className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 truncate"
                >
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{inquiry.customer_email}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-3 mt-auto flex items-center gap-2">
        <button
          onClick={onRespond}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {inquiry.status === 'new' ? 'Odgovori' : 'Uredi'}
        </button>
        {inquiry.is_archived ? (
          onUnarchive && (
            <button
              onClick={onUnarchive}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Vrati iz arhive"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
          )
        ) : (
          onArchive && (
            <button
              onClick={onArchive}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Arhiviraj"
            >
              <Archive className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Responded info */}
      {inquiry.status !== 'new' && (
        <div className="px-4 pb-4">
          {inquiry.response_message && (
            <div className="p-2.5 bg-emerald-50 rounded-lg mb-2">
              <p className="text-xs font-medium text-emerald-700 mb-1">Beleška:</p>
              <p className="text-sm text-slate-700">{inquiry.response_message}</p>
            </div>
          )}
          {inquiry.responded_at && (
            <p className="text-xs text-slate-400">
              Odgovoreno {formatDistanceToNow(new Date(inquiry.responded_at), { addSuffix: true, locale: sr })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
