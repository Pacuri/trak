'use client'

import { MapPin, Users, CreditCard, AlertCircle } from 'lucide-react'
import type { Booking } from '@/types'

interface TravelerCardProps {
  booking: Booking
  onClick?: () => void
  dimmed?: boolean
}

export default function TravelerCard({ booking, onClick, dimmed }: TravelerCardProps) {
  const hasPaymentIssue = booking.payment_status !== 'paid'
  const totalGuests = booking.adults + (booking.children || 0)

  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] border p-3 cursor-pointer transition-all ${
        dimmed
          ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-60'
          : hasPaymentIssue
            ? 'bg-[#FFF7ED] border-[#F97316]/30 hover:border-[#F97316]'
            : 'bg-white border-[#E2E8F0] hover:border-[#3B82F6] hover:shadow-sm'
      }`}
    >
      {/* Customer name */}
      <p className="text-sm font-medium text-[#1E293B] mb-2">
        {booking.customer_name}
      </p>

      {/* Destination */}
      {booking.offer ? (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-xs text-[#64748B]">
            {booking.offer.country}{booking.offer.city ? `, ${booking.offer.city}` : ''}
          </span>
        </div>
      ) : booking.external_destination && (
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-xs text-[#64748B]">
            {booking.external_destination}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-xs text-[#64748B]">
            {totalGuests} {totalGuests === 1 ? 'putnik' : 'putnika'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasPaymentIssue && (
            <div className="flex items-center gap-1 text-[#F97316]" title="Nepotpuna uplata">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          )}
          <span className={`text-xs font-medium ${
            booking.payment_status === 'paid'
              ? 'text-[#10B981]'
              : booking.payment_status === 'partial'
                ? 'text-[#F97316]'
                : 'text-[#EF4444]'
          }`}>
            {booking.total_amount.toLocaleString()} {booking.currency}
          </span>
        </div>
      </div>
    </div>
  )
}
