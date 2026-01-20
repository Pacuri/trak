'use client'

import { FileText, CreditCard, Ban, Calendar } from 'lucide-react'
import type { ParsedPolicies } from '@/types/import'

interface PoliciesSectionProps {
  policies: ParsedPolicies | null | undefined
}

export function PoliciesSection({ policies }: PoliciesSectionProps) {
  if (!policies) return null
  
  const hasContent = policies.deposit || policies.cancellation || policies.restrictions || policies.payment_options
  if (!hasContent) return null

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
        <FileText className="w-4 h-4" />
        Uslovi i politike
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Deposit */}
        {policies.deposit && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">Depozit</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-semibold text-blue-700">{policies.deposit.percent}%</span> ukupne cijene
              </p>
              <p className="text-xs text-gray-500">
                Plaćanje: {policies.deposit.due === 'on_booking' ? 'Pri rezervaciji' : policies.deposit.due}
              </p>
              {policies.deposit.balance_due_days_before && (
                <p className="text-xs text-gray-500">
                  Ostatak: {policies.deposit.balance_due_days_before} dana prije polaska
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cancellation */}
        {policies.cancellation && policies.cancellation.rules.length > 0 && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-4 h-4 text-red-600" />
              <span className="font-medium text-sm">Otkaz</span>
            </div>
            <div className="space-y-1">
              {policies.cancellation.rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {rule.days_before === 0 ? 'Na dan polaska' : `${rule.days_before}+ dana prije`}
                  </span>
                  <span className={`font-medium ${rule.penalty_percent === 0 ? 'text-green-600' : rule.penalty_percent >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    {rule.penalty_percent === 0 ? 'Bez penala' : `${rule.penalty_percent}% penala`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restrictions */}
        {policies.restrictions && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm">Ograničenja</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {policies.restrictions.min_stay && (
                <p>Min. boravak: <span className="font-medium">{policies.restrictions.min_stay} noćenja</span></p>
              )}
              {policies.restrictions.max_stay && (
                <p>Max. boravak: <span className="font-medium">{policies.restrictions.max_stay} noćenja</span></p>
              )}
              {policies.restrictions.check_in_days && policies.restrictions.check_in_days.length > 0 && (
                <p>Check-in: <span className="font-medium">{policies.restrictions.check_in_days.join(', ')}</span></p>
              )}
              {policies.restrictions.min_adults && (
                <p>Min. odraslih: <span className="font-medium">{policies.restrictions.min_adults}</span></p>
              )}
              {policies.restrictions.min_advance_booking_days && (
                <p>Rezervacija min. <span className="font-medium">{policies.restrictions.min_advance_booking_days}</span> dana unaprijed</p>
              )}
              {policies.restrictions.documents_required && policies.restrictions.documents_required.length > 0 && (
                <p>Dokumenti: <span className="font-medium">{policies.restrictions.documents_required.join(', ')}</span></p>
              )}
            </div>
          </div>
        )}

        {/* Payment options */}
        {policies.payment_options && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm">Plaćanje</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {policies.payment_options.installments_available && (
                <p className="text-green-600 font-medium">✓ Plaćanje na rate</p>
              )}
              {policies.payment_options.card_payment_fee_percent && (
                <p>Naknada za kartice: <span className="font-medium">{policies.payment_options.card_payment_fee_percent}%</span></p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
