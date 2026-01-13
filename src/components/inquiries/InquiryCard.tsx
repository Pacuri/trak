'use client'

import { useState } from 'react'
import { MapPin, Calendar, Clock, MessageSquare, Check, X, ArrowRight, User } from 'lucide-react'
import type { OfferInquiry } from '@/types'
import { format, differenceInMinutes } from 'date-fns'
import { sr } from 'date-fns/locale'

interface InquiryCardProps {
  inquiry: OfferInquiry
  onMarkAvailable?: (id: string) => void
  onMarkUnavailable?: (id: string) => void
  onOfferAlternative?: (id: string) => void
}

export default function InquiryCard({
  inquiry,
  onMarkAvailable,
  onMarkUnavailable,
  onOfferAlternative,
}: InquiryCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const minutesSinceCreated = differenceInMinutes(new Date(), new Date(inquiry.created_at))
  const isUrgent = minutesSinceCreated > 60 && inquiry.status === 'pending'

  const getStatusBadge = () => {
    switch (inquiry.status) {
      case 'pending':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
            isUrgent 
              ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20'
              : 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]/20'
          }`}>
            <Clock className="h-3 w-3" />
            {isUrgent ? 'Hitno' : 'Čeka odgovor'}
          </span>
        )
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#3B82F6] border border-[#3B82F6]/20">
            Proverava se
          </span>
        )
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#10B981] border border-[#10B981]/20">
            <Check className="h-3 w-3" />
            Dostupno
          </span>
        )
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#64748B] border border-[#64748B]/20">
            <X className="h-3 w-3" />
            Nedostupno
          </span>
        )
      case 'alternative':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] px-2.5 py-1 text-xs font-medium text-[#8B5CF6] border border-[#8B5CF6]/20">
            <ArrowRight className="h-3 w-3" />
            Alternativa
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#64748B] border border-[#64748B]/20">
            Istekao
          </span>
        )
    }
  }

  const formatTimeSince = () => {
    if (minutesSinceCreated < 60) {
      return `pre ${minutesSinceCreated} min`
    }
    const hours = Math.floor(minutesSinceCreated / 60)
    if (hours < 24) {
      return `pre ${hours}h`
    }
    return format(new Date(inquiry.created_at), 'd MMM', { locale: sr })
  }

  return (
    <div className={`rounded-[14px] bg-white border shadow-sm transition-all ${
      isUrgent ? 'border-[#EF4444]' : 'border-[#E2E8F0]'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <span className="text-xs text-[#94A3B8]">{formatTimeSince()}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1E293B]">{inquiry.customer_name}</p>
            <p className="text-xs text-[#64748B]">{inquiry.customer_phone}</p>
          </div>
        </div>

        {/* Offer */}
        {inquiry.offer && (
          <div className="rounded-lg bg-[#F8FAFC] p-3 mb-3">
            <p className="text-sm font-medium text-[#1E293B]">{inquiry.offer.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {inquiry.offer.country}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(inquiry.offer.departure_date), 'd MMM', { locale: sr })}
              </span>
            </div>
          </div>
        )}

        {/* Message */}
        {inquiry.customer_message && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-start gap-2 text-left w-full"
          >
            <MessageSquare className="h-4 w-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
            <p className={`text-sm text-[#64748B] ${!expanded ? 'line-clamp-2' : ''}`}>
              {inquiry.customer_message}
            </p>
          </button>
        )}

        {/* Response note */}
        {inquiry.response_note && inquiry.status !== 'pending' && (
          <div className="mt-3 rounded-lg bg-[#ECFDF5] p-3">
            <p className="text-xs font-medium text-[#10B981] mb-1">Odgovor:</p>
            <p className="text-sm text-[#1E293B]">{inquiry.response_note}</p>
            {inquiry.responder && (
              <p className="text-xs text-[#64748B] mt-1">
                - {inquiry.responder.full_name || inquiry.responder.email}
              </p>
            )}
          </div>
        )}

        {/* Alternative offer */}
        {inquiry.status === 'alternative' && inquiry.alternative_offer && (
          <div className="mt-3 rounded-lg bg-[#F5F3FF] p-3">
            <p className="text-xs font-medium text-[#8B5CF6] mb-1">Alternativna ponuda:</p>
            <p className="text-sm text-[#1E293B]">{inquiry.alternative_offer.name}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {inquiry.status === 'pending' && (
        <div className="flex border-t border-[#E2E8F0]">
          {onMarkUnavailable && (
            <button
              onClick={() => onMarkUnavailable(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors border-r border-[#E2E8F0]"
            >
              <X className="h-4 w-4" />
              Nedostupno
            </button>
          )}
          {onOfferAlternative && (
            <button
              onClick={() => onOfferAlternative(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#8B5CF6] hover:bg-[#F5F3FF] transition-colors border-r border-[#E2E8F0]"
            >
              <ArrowRight className="h-4 w-4" />
              Alternativa
            </button>
          )}
          {onMarkAvailable && (
            <button
              onClick={() => onMarkAvailable(inquiry.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#10B981] hover:bg-[#ECFDF5] transition-colors"
            >
              <Check className="h-4 w-4" />
              Dostupno
            </button>
          )}
        </div>
      )}
    </div>
  )
}
