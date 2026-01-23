'use client'

import { Check, Eye, Send, X, ExternalLink, Package } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface OfferQuote {
  id: string
  status: 'sent' | 'viewed' | 'confirmed' | 'rejected'
  package_snapshot?: {
    name?: string
    hotel_name?: string
    country?: string
    city?: string
  }
  destination?: string
  total_amount?: number
  currency?: string
  sent_at?: string
  viewed_at?: string
  confirmed_at?: string
  rejected_at?: string
  customer_name?: string
}

interface OfferStatusCardProps {
  offer: OfferQuote
}

export function OfferStatusCard({ offer }: OfferStatusCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: Check,
          label: 'Ponuda potvrđena',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          textColor: 'text-green-700',
        }
      case 'viewed':
        return {
          icon: Eye,
          label: 'Ponuda pregledana',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-700',
        }
      case 'rejected':
        return {
          icon: X,
          label: 'Ponuda odbijena',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textColor: 'text-red-700',
        }
      default:
        return {
          icon: Send,
          label: 'Ponuda poslata',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200',
          iconBg: 'bg-slate-100',
          iconColor: 'text-slate-600',
          textColor: 'text-slate-700',
        }
    }
  }

  const config = getStatusConfig(offer.status)
  const Icon = config.icon

  // Get package name from snapshot
  const packageName = offer.package_snapshot?.hotel_name || offer.package_snapshot?.name || 'Paket'
  const destination = offer.destination ||
    (offer.package_snapshot?.city && offer.package_snapshot?.country
      ? `${offer.package_snapshot.city}, ${offer.package_snapshot.country}`
      : offer.package_snapshot?.country || '')

  // Get relevant timestamp based on status
  const getTimestamp = () => {
    switch (offer.status) {
      case 'confirmed':
        return offer.confirmed_at
      case 'rejected':
        return offer.rejected_at
      case 'viewed':
        return offer.viewed_at
      default:
        return offer.sent_at
    }
  }

  const timestamp = getTimestamp()
  const formattedTime = timestamp
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: sr })
    : ''

  return (
    <div className="flex justify-center my-4">
      <div
        className={`max-w-[90%] rounded-xl border ${config.borderColor} ${config.bgColor} px-4 py-3 shadow-sm`}
      >
        {/* Status header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.iconBg}`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${config.textColor}`}>
              {config.label}
            </p>
            <p className="text-xs text-slate-500">
              {formattedTime}
            </p>
          </div>
        </div>

        {/* Package details */}
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {packageName}
              </p>
              {destination && (
                <p className="text-xs text-slate-500">
                  {destination}
                </p>
              )}
            </div>
          </div>

          {/* Amount */}
          {offer.total_amount && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">Ukupno:</span>
              <span className="text-sm font-semibold text-slate-800">
                {offer.currency === 'EUR' ? '€' : offer.currency || '€'}
                {offer.total_amount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* View link */}
        <a
          href={`/ponuda/${offer.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          Pogledaj ponudu
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
