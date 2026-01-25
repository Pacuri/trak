'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CreditCard, Lock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface ReservationData {
  id: string
  code: string
  customer_name: string
  deposit_amount: number
  currency: string
  qualification_data?: {
    package_name?: string
  }
  organization?: {
    name: string
  }
}

export default function MockCheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const reservationId = params.id as string

  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchReservation() {
      try {
        const response = await fetch(`/api/public/reservations/${reservationId}`)
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

    if (reservationId) {
      fetchReservation()
    }
  }, [reservationId])

  const handleMockPayment = async () => {
    setProcessing(true)
    setError(null)

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call webhook to process payment
      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: {
                reservation_id: reservationId,
              },
              amount_total: reservation?.deposit_amount ? reservation.deposit_amount * 100 : 0,
              currency: reservation?.currency?.toLowerCase() || 'eur',
            },
          },
          mock: true,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        // Redirect to confirmation page after success
        setTimeout(() => {
          router.push(`/potvrda/${reservationId}`)
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || 'Greška pri obradi plaćanja')
      }
    } catch (err) {
      console.error('Error processing mock payment:', err)
      setError('Greška pri obradi plaćanja')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Greška</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Plaćanje uspešno!</h1>
          <p className="text-slate-600">Preusmjeravanje na potvrdu...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : currency
    return `${amount.toFixed(2)} ${symbol}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Mock Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Simulacija plaćanja</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Ovo je test stranica za simulaciju online plaćanja. U produkciji bi ovo bila Stripe checkout stranica.
            </p>
          </div>
        </div>

        {/* Checkout Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold">Plaćanje depozita</h1>
                <p className="text-sm text-blue-100">
                  {reservation?.organization?.name || 'Turistička agencija'}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Rezervacija</span>
                <span className="text-sm font-mono font-medium text-slate-900">
                  {reservation?.code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Ime</span>
                <span className="text-sm font-medium text-slate-900">
                  {reservation?.customer_name}
                </span>
              </div>
              {reservation?.qualification_data?.package_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Paket</span>
                  <span className="text-sm font-medium text-slate-900">
                    {reservation.qualification_data.package_name}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-slate-700">Depozit za uplatu</span>
                  <span className="text-xl font-bold text-slate-900">
                    {reservation && formatCurrency(reservation.deposit_amount, reservation.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mock Card Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Broj kartice
                </label>
                <input
                  type="text"
                  value="4242 4242 4242 4242"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Datum isteka
                  </label>
                  <input
                    type="text"
                    value="12/28"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    CVC
                  </label>
                  <input
                    type="text"
                    value="123"
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handleMockPayment}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Obrada plaćanja...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Plati {reservation && formatCurrency(reservation.deposit_amount, reservation.currency)}
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Sigurno plaćanje pomoću Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
