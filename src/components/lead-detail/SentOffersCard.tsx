'use client'

import { FileText, Check, X, Clock, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

export type SentOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface SentOffer {
  id: string
  name: string
  description?: string
  price: number
  pricePerPerson?: number
  currency?: string
  duration?: string
  details?: string
  status: SentOfferStatus
  sentAt: string
  respondedAt?: string
  declineReason?: string
}

interface SentOffersCardProps {
  offers: SentOffer[]
  onNewOffer?: () => void
  onViewOffer?: (offerId: string) => void
}

const statusConfig: Record<SentOfferStatus, { bg: string; text: string; border: string; label: string }> = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    label: 'Čeka odgovor'
  },
  accepted: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    label: 'Prihvaćeno'
  },
  declined: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    label: 'Odbijeno'
  },
  expired: {
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    border: 'border-gray-200',
    label: 'Isteklo'
  }
}

export default function SentOffersCard({
  offers,
  onNewOffer,
  onViewOffer
}: SentOffersCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          Poslate ponude
        </h2>
        {onNewOffer && (
          <button
            onClick={onNewOffer}
            className="px-3 py-1.5 text-sm font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Nova ponuda
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {offers.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">Nema poslatih ponuda</p>
            {onNewOffer && (
              <button
                onClick={onNewOffer}
                className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                + Pošalji prvu ponudu
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const config = statusConfig[offer.status]
              const isAccepted = offer.status === 'accepted'
              const isDeclined = offer.status === 'declined' || offer.status === 'expired'

              return (
                <div
                  key={offer.id}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                    isAccepted
                      ? 'border-2 border-green-200 bg-green-50'
                      : isDeclined
                        ? 'border border-gray-200 opacity-60'
                        : 'border border-gray-200 hover:border-blue-200'
                  }`}
                  onClick={() => onViewOffer?.(offer.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        {offer.status === 'accepted' ? (
                          <Check className={`w-5 h-5 ${config.text}`} />
                        ) : offer.status === 'declined' ? (
                          <X className={`w-5 h-5 ${config.text}`} />
                        ) : (
                          <Clock className={`w-5 h-5 ${config.text}`} />
                        )}
                      </div>

                      {/* Offer Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isDeclined ? 'text-gray-500' : 'text-gray-900'}`}>
                            {offer.name}
                          </p>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {offer.details || offer.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Poslato {format(new Date(offer.sentAt), "d. MMM 'u' HH:mm", { locale: sr })}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        isDeclined ? 'text-gray-400 line-through' : isAccepted ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        €{offer.price.toLocaleString()}
                      </p>
                      {offer.pricePerPerson && (
                        <p className="text-xs text-gray-500">
                          €{offer.pricePerPerson.toLocaleString()}/os
                        </p>
                      )}
                      {isDeclined && offer.declineReason && (
                        <p className="text-xs text-gray-400 mt-1">{offer.declineReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
