'use client'

import { useState } from 'react'
import { MapPin, Calendar, Users, Clock, CreditCard, MoreHorizontal, Check, X, AlertTriangle } from 'lucide-react'
import type { Reservation } from '@/types'
import { format, differenceInHours, isPast } from 'date-fns'
import { sr } from 'date-fns/locale'

interface ReservationCardProps {
  reservation: Reservation
  onMarkPaid?: (id: string) => void
  onCancel?: (id: string) => void
  onRecordPayment?: (id: string, amount: number) => void
}

export default function ReservationCard({
  reservation,
  onMarkPaid,
  onCancel,
  onRecordPayment,
}: ReservationCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showPaymentInput, setShowPaymentInput] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')

  const hoursUntilExpiry = differenceInHours(new Date(reservation.expires_at), new Date())
  const isExpiringSoon = hoursUntilExpiry > 0 && hoursUntilExpiry <= 24
  const isExpired = isPast(new Date(reservation.expires_at)) && reservation.status === 'pending'

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-medium text-[#EF4444] border border-[#EF4444]/20">
          <AlertTriangle className="h-3 w-3" />
          Istekla
        </span>
      )
    }

    switch (reservation.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-medium text-[#F97316] border border-[#F97316]/20">
            <Clock className="h-3 w-3" />
            Čeka uplatu
          </span>
        )
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#10B981] border border-[#10B981]/20">
            <Check className="h-3 w-3" />
            Plaćeno
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#64748B] border border-[#64748B]/20">
            Istekla
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-medium text-[#EF4444] border border-[#EF4444]/20">
            <X className="h-3 w-3" />
            Otkazana
          </span>
        )
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#3B82F6] border border-[#3B82F6]/20">
            Konvertovana
          </span>
        )
    }
  }

  const handleRecordPayment = () => {
    if (paymentAmount && onRecordPayment) {
      onRecordPayment(reservation.id, parseFloat(paymentAmount))
      setPaymentAmount('')
      setShowPaymentInput(false)
    }
  }

  const remainingAmount = reservation.total_price - reservation.amount_paid

  return (
    <div className={`rounded-[14px] bg-white border shadow-sm transition-all ${
      isExpiringSoon && reservation.status === 'pending'
        ? 'border-[#F97316]'
        : 'border-[#E2E8F0]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1E293B]">#{reservation.code}</span>
            {getStatusBadge()}
          </div>
          <p className="text-sm font-medium text-[#1E293B] mt-1">
            {reservation.customer_name}
          </p>
          <p className="text-xs text-[#64748B]">
            {reservation.customer_phone}
            {reservation.customer_email && ` • ${reservation.customer_email}`}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-[#64748B]" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 z-20">
                {reservation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowPaymentInput(true)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
                    >
                      <CreditCard className="h-4 w-4" />
                      Unesi uplatu
                    </button>
                    {onMarkPaid && (
                      <button
                        onClick={() => {
                          onMarkPaid(reservation.id)
                          setShowMenu(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#10B981] hover:bg-[#F1F5F9]"
                      >
                        <Check className="h-4 w-4" />
                        Označi kao plaćeno
                      </button>
                    )}
                    {onCancel && (
                      <button
                        onClick={() => {
                          onCancel(reservation.id)
                          setShowMenu(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#EF4444] hover:bg-[#F1F5F9]"
                      >
                        <X className="h-4 w-4" />
                        Otkaži
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Offer Info */}
      {reservation.offer && (
        <div className="p-4 bg-[#F8FAFC]">
          <p className="text-sm font-medium text-[#1E293B]">{reservation.offer.name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {reservation.offer.country}{reservation.offer.city ? `, ${reservation.offer.city}` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(reservation.offer.departure_date), 'd MMM', { locale: sr })}
            </span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-[#64748B]">
            <Users className="h-4 w-4" />
            {reservation.adults} odraslih{reservation.children > 0 ? `, ${reservation.children} dece` : ''}
          </span>
        </div>

        {/* Pricing */}
        <div className="pt-3 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[#64748B]">Ukupno</span>
            <span className="text-sm font-semibold text-[#1E293B]">
              {reservation.total_price.toLocaleString()} {reservation.currency}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#64748B]">Uplaćeno</span>
            <span className={`text-sm font-medium ${
              reservation.amount_paid >= reservation.total_price
                ? 'text-[#10B981]'
                : 'text-[#F97316]'
            }`}>
              {reservation.amount_paid.toLocaleString()} {reservation.currency}
            </span>
          </div>
          {remainingAmount > 0 && reservation.status === 'pending' && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-[#64748B]">Preostalo</span>
              <span className="text-sm font-bold text-[#EF4444]">
                {remainingAmount.toLocaleString()} {reservation.currency}
              </span>
            </div>
          )}
        </div>

        {/* Expiry warning */}
        {isExpiringSoon && reservation.status === 'pending' && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FFF7ED] px-3 py-2">
            <Clock className="h-4 w-4 text-[#F97316]" />
            <span className="text-xs font-medium text-[#F97316]">
              Ističe za {hoursUntilExpiry} sat{hoursUntilExpiry === 1 ? '' : 'a'}
            </span>
          </div>
        )}

        {/* Payment input */}
        {showPaymentInput && (
          <div className="flex gap-2 pt-2">
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Iznos"
              className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
            />
            <button
              onClick={handleRecordPayment}
              className="rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-white"
            >
              Unesi
            </button>
            <button
              onClick={() => {
                setShowPaymentInput(false)
                setPaymentAmount('')
              }}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              Otkaži
            </button>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-[#94A3B8] pt-2">
          Kreirana {format(new Date(reservation.created_at), 'd MMM u HH:mm', { locale: sr })}
        </p>
      </div>
    </div>
  )
}
