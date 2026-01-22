'use client'

import { useState } from 'react'
import { Euro, Plus, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface PaymentScheduleItem {
  id?: string
  label: string
  amount: number
  dueDate: string
  isPaid: boolean
  paidAt?: string
}

interface FinancialsCardProps {
  totalValue: number
  amountPaid: number
  currency?: string
  paymentSchedule?: PaymentScheduleItem[]
  onRecordPayment?: (amount: number) => Promise<void>
}

export default function FinancialsCard({
  totalValue,
  amountPaid,
  currency = 'EUR',
  paymentSchedule = [],
  onRecordPayment
}: FinancialsCardProps) {
  const [showPaymentInput, setShowPaymentInput] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [recording, setRecording] = useState(false)

  const remainingAmount = totalValue - amountPaid
  const paidPercent = totalValue > 0 ? Math.round((amountPaid / totalValue) * 100) : 0
  const isFullyPaid = amountPaid >= totalValue && totalValue > 0

  // Default payment schedule if none provided
  const schedule = paymentSchedule.length > 0 ? paymentSchedule : [
    {
      label: 'Akontacija (30%)',
      amount: Math.round(totalValue * 0.3),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      isPaid: false
    },
    {
      label: 'Ostatak (70%)',
      amount: Math.round(totalValue * 0.7),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      isPaid: false
    }
  ]

  const handleRecordPayment = async () => {
    if (!paymentAmount || !onRecordPayment) return

    setRecording(true)
    try {
      await onRecordPayment(parseFloat(paymentAmount))
      setPaymentAmount('')
      setShowPaymentInput(false)
    } finally {
      setRecording(false)
    }
  }

  const getProgressColor = () => {
    if (paidPercent === 0) return 'bg-gray-200'
    if (paidPercent < 30) return 'bg-orange-500'
    if (paidPercent < 100) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Euro className="w-5 h-5 text-gray-400" />
          Finansije
        </h3>
      </div>

      <div className="p-6">
        {/* Total Value */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">Ukupna vrednost</p>
          <p className="text-3xl font-bold text-gray-900">
            €{totalValue.toLocaleString()}
          </p>
        </div>

        {/* Payment Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Uplaćeno</span>
            <span className="text-sm font-medium text-gray-900">
              €{amountPaid.toLocaleString()} / €{totalValue.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(paidPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {paidPercent}% uplaćeno
            {remainingAmount > 0 && ` • €${remainingAmount.toLocaleString()} preostalo`}
          </p>
        </div>

        {/* Payment Schedule */}
        {totalValue > 0 && !isFullyPaid && (
          <div className="space-y-3 mb-4">
            {schedule.map((item, idx) => {
              const isOverdue = !item.isPaid && new Date(item.dueDate) < new Date()
              const isNext = !item.isPaid && schedule.slice(0, idx).every(s => s.isPaid)

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    item.isPaid
                      ? 'bg-green-50 border border-green-100'
                      : isOverdue
                        ? 'bg-red-50 border border-red-100'
                        : isNext
                          ? 'bg-orange-50 border border-orange-100'
                          : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className={`text-xs ${
                      item.isPaid
                        ? 'text-green-600'
                        : isOverdue
                          ? 'text-red-600'
                          : isNext
                            ? 'text-orange-600'
                            : 'text-gray-500'
                    }`}>
                      {item.isPaid
                        ? `Plaćeno ${item.paidAt ? format(new Date(item.paidAt), 'd. MMM', { locale: sr }) : ''}`
                        : `Rok: ${format(new Date(item.dueDate), 'd. MMM yyyy', { locale: sr })}`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      item.isPaid
                        ? 'text-green-600'
                        : isOverdue
                          ? 'text-red-600'
                          : isNext
                            ? 'text-orange-600'
                            : 'text-gray-400'
                    }`}>
                      €{item.amount.toLocaleString()}
                    </p>
                    <span className={`text-xs ${
                      item.isPaid
                        ? 'text-green-500'
                        : isOverdue
                          ? 'text-red-500'
                          : isNext
                            ? 'text-orange-500'
                            : 'text-gray-400'
                    }`}>
                      {item.isPaid ? 'Plaćeno' : isOverdue ? 'Kasni' : isNext ? 'Čeka uplatu' : 'Nije dospelo'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Fully Paid Badge */}
        {isFullyPaid && (
          <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-100 text-center">
            <p className="text-green-600 font-medium">✓ Potpuno plaćeno</p>
          </div>
        )}

        {/* Payment Input */}
        {showPaymentInput ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || recording}
                className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {recording ? 'Upisivanje...' : 'Upiši uplatu'}
              </button>
              <button
                onClick={() => {
                  setShowPaymentInput(false)
                  setPaymentAmount('')
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Otkaži
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPaymentInput(true)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Unesi uplatu
          </button>
        )}
      </div>
    </div>
  )
}
