'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone,
  MoreHorizontal,
  MessageCircle,
  Eye,
  Check,
  AlertCircle,
  Circle,
  FileText,
  CreditCard,
  Ticket
} from 'lucide-react'
import type { Lead } from '@/types'

interface CustomerCardProps {
  customer: Lead & {
    // Reservation/booking related data
    adults?: number
    children?: number
    child_ages?: string
    total_value?: number
    amount_paid?: number
    has_documents?: boolean
    has_voucher?: boolean
    status?: 'paid' | 'pending_payment' | 'pending_passport' | 'complete'
  }
  onOpenChat?: (id: string) => void
}

// Status configurations
type CustomerStatus = 'paid' | 'pending_payment' | 'pending_passport' | 'complete'

const statusConfig: Record<CustomerStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  complete: {
    label: 'Plaćeno',
    color: 'text-[#10B981]',
    bgColor: 'bg-[#ECFDF5]',
    borderColor: 'border-[#10B981]'
  },
  paid: {
    label: 'Plaćeno',
    color: 'text-[#10B981]',
    bgColor: 'bg-[#ECFDF5]',
    borderColor: 'border-[#10B981]'
  },
  pending_payment: {
    label: 'Čeka uplatu',
    color: 'text-[#F97316]',
    bgColor: 'bg-[#FFF7ED]',
    borderColor: 'border-[#F97316]'
  },
  pending_passport: {
    label: 'Čeka pasoš',
    color: 'text-[#EAB308]',
    bgColor: 'bg-[#FEFCE8]',
    borderColor: 'border-[#EAB308]'
  }
}

export default function CustomerCard({ customer, onOpenChat }: CustomerCardProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)

  // Determine status based on available data
  const getCustomerStatus = (): CustomerStatus => {
    if (customer.status) return customer.status

    // Logic based on payment
    const totalValue = customer.total_value || customer.value || 0
    const amountPaid = customer.amount_paid || 0

    if (amountPaid >= totalValue && totalValue > 0) {
      return 'complete'
    }
    if (amountPaid > 0 && amountPaid < totalValue) {
      return 'pending_payment'
    }
    return 'pending_payment'
  }

  const status = getCustomerStatus()
  const config = statusConfig[status]

  // Format travelers
  const formatTravelers = () => {
    const adults = customer.adults || 1
    const children = customer.children || 0
    const childAges = customer.child_ages

    if (children > 0 && childAges) {
      return `${adults}+${children} (dete ${childAges}g)`
    } else if (children > 0) {
      return `${adults}+${children}`
    }
    return `${adults} odraslih`
  }

  // Payment status
  const totalValue = customer.total_value || customer.value || 0
  const amountPaid = customer.amount_paid || 0
  const remainingAmount = totalValue - amountPaid
  const paymentPercentage = totalValue > 0 ? Math.round((amountPaid / totalValue) * 100) : 0

  // Document/Voucher status (mock for now - can be extended)
  const hasPayment = amountPaid > 0
  const isFullyPaid = amountPaid >= totalValue && totalValue > 0
  const hasDocuments = customer.has_documents ?? true // Default to true for won leads
  const hasVoucher = customer.has_voucher ?? false
  const missingPassports = !hasDocuments ? 1 : 0 // Could be calculated from actual data

  // Border color based on status
  const getBorderColor = () => {
    if (status === 'complete' || status === 'paid') return 'border-l-[#10B981]'
    if (status === 'pending_passport') return 'border-l-[#EAB308]'
    return 'border-l-[#F97316]'
  }

  return (
    <div
      className={`rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 ${getBorderColor()}`}
      onClick={() => router.push(`/dashboard/leads/${customer.id}`)}
    >
      <div className="p-4">
        {/* Header: Name + Status Badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[#1E293B]">{customer.name}</h3>
            {customer.phone && (
              <p className="text-sm text-[#64748B] mt-0.5">{customer.phone}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}/20`}>
              {status === 'complete' || status === 'paid' ? (
                <Check className="h-3 w-3" />
              ) : null}
              {config.label}
            </span>

            {/* Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
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
                    <button
                      onClick={() => {
                        router.push(`/dashboard/leads/${customer.id}`)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
                    >
                      <Eye className="h-4 w-4" />
                      Pogledaj detalje
                    </button>
                    {onOpenChat && (
                      <button
                        onClick={() => {
                          onOpenChat(customer.id)
                          setShowMenu(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Pošalji poruku
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Travelers + Price Row */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-[#64748B]">{formatTravelers()}</span>
          <span className="text-lg font-bold text-[#1E293B]">€{totalValue.toLocaleString()}</span>
        </div>

        {/* Status Indicators Row */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E2E8F0]">
          {/* Payment Status */}
          <div className="flex items-center gap-1.5">
            {isFullyPaid ? (
              <Check className="h-4 w-4 text-[#10B981]" />
            ) : remainingAmount > 0 ? (
              <AlertCircle className="h-4 w-4 text-[#F97316]" />
            ) : (
              <Circle className="h-4 w-4 text-[#CBD5E1]" />
            )}
            <span className={`text-sm ${isFullyPaid ? 'text-[#10B981]' : remainingAmount > 0 ? 'text-[#F97316]' : 'text-[#64748B]'}`}>
              {isFullyPaid ? 'Uplata' : `€${remainingAmount.toLocaleString()} preostalo`}
            </span>
          </div>

          {/* Documents Status */}
          <div className="flex items-center gap-1.5">
            {hasDocuments ? (
              <Check className="h-4 w-4 text-[#10B981]" />
            ) : missingPassports > 0 ? (
              <AlertCircle className="h-4 w-4 text-[#F97316]" />
            ) : (
              <Circle className="h-4 w-4 text-[#CBD5E1]" />
            )}
            <span className={`text-sm ${hasDocuments ? 'text-[#10B981]' : 'text-[#F97316]'}`}>
              {hasDocuments ? 'Dokumenta' : `Nedostaje ${missingPassports}/${customer.adults || 1 + (customer.children || 0)}`}
            </span>
          </div>

          {/* Voucher Status */}
          <div className="flex items-center gap-1.5">
            {hasVoucher ? (
              <Check className="h-4 w-4 text-[#10B981]" />
            ) : (
              <Circle className="h-4 w-4 text-[#CBD5E1]" />
            )}
            <span className={`text-sm ${hasVoucher ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
              Voucher
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
