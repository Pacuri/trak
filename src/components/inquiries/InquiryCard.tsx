'use client'

import { useState } from 'react'
import { MapPin, Calendar, Clock, MessageSquare, Check, X, ArrowRight, Phone, Mail, Package, Archive, ArchiveRestore } from 'lucide-react'
import type { OfferInquiry } from '@/types'
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import { sr } from 'date-fns/locale'

interface InquiryCardProps {
  inquiry: OfferInquiry
  onMarkAvailable?: (id: string) => void
  onMarkUnavailable?: (id: string) => void
  onOfferAlternative?: (id: string) => void
  onArchive?: (id: string) => void
  onUnarchive?: (id: string) => void
}

export default function InquiryCard({
  inquiry,
  onMarkAvailable,
  onMarkUnavailable,
  onOfferAlternative,
  onArchive,
  onUnarchive,
}: InquiryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const now = new Date()
  const created = new Date(inquiry.created_at)
  const minutesSinceCreated = differenceInMinutes(now, created)
  const hoursSinceCreated = differenceInHours(now, created)

  // Format time display
  const formatWaitTime = () => {
    if (minutesSinceCreated < 60) {
      return `${minutesSinceCreated} min`
    } else if (hoursSinceCreated < 24) {
      return `${hoursSinceCreated}h`
    } else {
      const days = differenceInDays(now, created)
      return `${days}d`
    }
  }

  // Urgency only affects the time badge color
  const isUrgent = hoursSinceCreated >= 4
  const isWarning = hoursSinceCreated >= 2 && hoursSinceCreated < 4

  const getStatusBadge = () => {
    switch (inquiry.status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            Čeka odgovor
          </span>
        )
      case 'checking':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Proverava se
          </span>
        )
      case 'available':
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Dostupno
          </span>
        )
      case 'unavailable':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            Nedostupno
          </span>
        )
      case 'alternative':
        return (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            Alternativa
          </span>
        )
      case 'expired':
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            Istekao
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - Type badge and time */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Package className="h-3 w-3" />
            Upit za ponudu
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

      {/* Offer info - highlighted */}
      {inquiry.offer && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-900">{inquiry.offer.name}</span>
          </div>
          <div className="flex items-center gap-3 ml-6 text-sm text-slate-500">
            <span>{inquiry.offer.country}{inquiry.offer.city ? `, ${inquiry.offer.city}` : ''}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(inquiry.offer.departure_date), 'd. MMM yyyy', { locale: sr })}
            </span>
          </div>
        </div>
      )}

      {/* Customer message if present */}
      {inquiry.customer_message && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left p-2.5 bg-slate-50 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className={`text-sm text-slate-600 ${!expanded ? 'line-clamp-2' : ''}`}>
                {inquiry.customer_message}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Response note */}
      {inquiry.response_note && inquiry.status !== 'pending' && (
        <div className="px-4 pb-3">
          <div className="p-2.5 bg-emerald-50 rounded-lg">
            <p className="text-xs font-medium text-emerald-700 mb-1">Odgovor:</p>
            <p className="text-sm text-slate-700">{inquiry.response_note}</p>
            {inquiry.responder && (
              <p className="text-xs text-slate-500 mt-1">
                — {inquiry.responder.full_name || inquiry.responder.email}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Alternative offer */}
      {inquiry.status === 'alternative' && inquiry.alternative_offer && (
        <div className="px-4 pb-3">
          <div className="p-2.5 bg-purple-50 rounded-lg">
            <p className="text-xs font-medium text-purple-700 mb-1">Alternativna ponuda:</p>
            <p className="text-sm text-slate-700">{inquiry.alternative_offer.name}</p>
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

      {/* Actions - always consistent colors */}
      {inquiry.status === 'pending' && (
        <div className="px-4 pb-4 flex gap-2">
          {onMarkUnavailable && (
            <button
              onClick={() => onMarkUnavailable(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              Nedostupno
            </button>
          )}
          {onOfferAlternative && (
            <button
              onClick={() => onOfferAlternative(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Alternativa
            </button>
          )}
          {onMarkAvailable && (
            <button
              onClick={() => onMarkAvailable(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Check className="h-4 w-4" />
              Dostupno
            </button>
          )}
        </div>
      )}

      {/* Archive button - show for non-pending or as additional action */}
      {(inquiry.status !== 'pending' || inquiry.is_archived) && (
        <div className="px-4 pb-4">
          {inquiry.is_archived ? (
            onUnarchive && (
              <button
                onClick={() => onUnarchive(inquiry.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <ArchiveRestore className="w-4 h-4" />
                Vrati iz arhive
              </button>
            )
          ) : (
            onArchive && (
              <button
                onClick={() => onArchive(inquiry.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Archive className="w-4 h-4" />
                Arhiviraj
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
