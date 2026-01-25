'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Users,
  Phone,
  Mail,
  AlertTriangle,
  Calendar,
  Building2,
} from 'lucide-react'

interface ReservationData {
  id: string
  code: string
  customer_name: string
  customer_email: string
  customer_phone: string
  adults: number
  children: number
  total_price: number
  deposit_amount: number
  amount_paid: number
  currency: string
  status: string
  expires_at: string
  created_at: string
  qualification_data?: {
    package_name?: string
    travel_dates?: {
      start?: string
      end?: string
    }
  }
  organization?: {
    id: string
    name: string
    phone: string
    email: string
  }
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency
  return `${amount.toFixed(2)} ${symbol}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTimeRemaining(expiresAt: string): { text: string; urgent: boolean; expired: boolean } {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { text: 'Isteklo', urgent: true, expired: true }
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours < 24) {
    return { text: `${hours}h ${minutes}m`, urgent: true, expired: false }
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return { text: `${days} dan${days > 1 ? 'a' : ''} ${remainingHours}h`, urgent: days < 2, expired: false }
}

export default function ReservationLookupPage() {
  const params = useParams()
  const code = params.code as string

  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    async function fetchReservation() {
      try {
        const response = await fetch(`/api/public/reservations/by-code/${code}`)
        if (!response.ok) {
          setError('Rezervacija nije pronađena')
          return
        }
        const data = await response.json()
        setReservation(data)
      } catch (err) {
        console.error('Error fetching reservation:', err)
        setError('Greška pri učitavanju rezervacije')
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      fetchReservation()
    }
  }, [code])

  const handlePayOnline = async () => {
    if (!reservation) return

    setCheckoutLoading(true)
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservation.id }),
      })

      const data = await response.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setError(data.error || 'Greška pri kreiranju plaćanja')
      }
    } catch (err) {
      console.error('Error creating checkout:', err)
      setError('Greška pri kreiranju plaćanja')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Rezervacija nije pronađena</h1>
          <p className="text-slate-600">
            Nismo pronašli rezervaciju sa kodom <span className="font-mono font-bold">{code}</span>
          </p>
        </div>
      </div>
    )
  }

  const timeRemaining = getTimeRemaining(reservation.expires_at)
  const isPending = reservation.status === 'pending'
  const isPaid = reservation.status === 'paid'
  const isExpired = reservation.status === 'expired' || timeRemaining.expired

  const StatusBadge = () => {
    if (isPaid) {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Plaćeno</span>
        </div>
      )
    }
    if (isExpired) {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full">
          <XCircle className="w-5 h-5" />
          <span className="font-semibold">Isteklo</span>
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full">
        <Clock className="w-5 h-5" />
        <span className="font-semibold">Čeka uplatu</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Vaša rezervacija</h1>
          <p className="text-slate-600">
            Kod: <span className="font-mono font-bold text-teal-600">{reservation.code}</span>
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 text-center border-b border-slate-100">
            <StatusBadge />
            {isPending && !isExpired && (
              <div className={`mt-4 text-sm ${timeRemaining.urgent ? 'text-amber-600' : 'text-slate-500'}`}>
                <Clock className="w-4 h-4 inline mr-1" />
                Rok za uplatu: <span className="font-semibold">{timeRemaining.text}</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Package Info */}
            {reservation.qualification_data?.package_name && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  {reservation.qualification_data.package_name}
                </h3>
                {reservation.qualification_data.travel_dates?.start && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(reservation.qualification_data.travel_dates.start).toLocaleDateString('sr-RS', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Podaci o gostu</h3>
              <div className="space-y-2">
                <p className="font-medium text-slate-900">{reservation.customer_name}</p>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {reservation.adults} odraslih{reservation.children > 0 && `, ${reservation.children} dece`}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-500 mb-3">Cena</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Ukupna cena</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(reservation.total_price, reservation.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Depozit (30%)</span>
                  <span className="font-semibold text-teal-600">
                    {formatCurrency(reservation.deposit_amount, reservation.currency)}
                  </span>
                </div>
                {reservation.amount_paid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Uplaćeno</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(reservation.amount_paid, reservation.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Expiry Info */}
            {isPending && !isExpired && (
              <div className={`rounded-xl p-4 ${timeRemaining.urgent ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${timeRemaining.urgent ? 'text-amber-600' : 'text-slate-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${timeRemaining.urgent ? 'text-amber-800' : 'text-slate-700'}`}>
                      Rok za uplatu depozita
                    </p>
                    <p className={`text-sm ${timeRemaining.urgent ? 'text-amber-700' : 'text-slate-600'}`}>
                      {formatDate(reservation.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pay Online Button */}
            {isPending && !isExpired && (
              <button
                onClick={handlePayOnline}
                disabled={checkoutLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-5 h-5" />
                {checkoutLoading ? 'Učitavanje...' : `Plati online ${formatCurrency(reservation.deposit_amount, reservation.currency)}`}
              </button>
            )}

            {/* Already Paid */}
            {isPaid && (
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-emerald-800 font-medium">Vaša rezervacija je potvrđena!</p>
                <p className="text-sm text-emerald-600 mt-1">Uskoro ćete dobiti dodatne informacije.</p>
              </div>
            )}
          </div>
        </div>

        {/* Agency Contact */}
        {reservation.organization && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{reservation.organization.name}</p>
                <p className="text-sm text-slate-500">Kontakt za pitanja</p>
              </div>
            </div>
            <div className="space-y-2">
              {reservation.organization.phone && (
                <a
                  href={`tel:${reservation.organization.phone}`}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-teal-600" />
                  <span className="text-slate-700">{reservation.organization.phone}</span>
                </a>
              )}
              {reservation.organization.email && (
                <a
                  href={`mailto:${reservation.organization.email}`}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Mail className="w-5 h-5 text-teal-600" />
                  <span className="text-slate-700">{reservation.organization.email}</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
