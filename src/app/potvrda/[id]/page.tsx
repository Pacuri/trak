'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Download,
  Phone,
  Mail,
  Building2,
  Calendar,
  Users,
  FileText,
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

export default function BookingConfirmationPage() {
  const params = useParams()
  const reservationId = params.id as string

  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setError('Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }

    if (reservationId) {
      fetchReservation()
    }
  }, [reservationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-slate-600">{error || 'Nešto je pošlo po zlu'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Hvala vam!</h1>
          <p className="text-lg text-slate-600">Vaša rezervacija je potvrđena</p>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Broj rezervacije</p>
                <p className="text-2xl font-bold font-mono">{reservation.code}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-sm">Status</p>
                <p className="font-semibold">Potvrđeno ✓</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Package Info */}
            {reservation.qualification_data?.package_name && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  {reservation.qualification_data.package_name}
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {reservation.qualification_data.travel_dates?.start && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {new Date(reservation.qualification_data.travel_dates.start).toLocaleDateString('sr-RS', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    {reservation.adults} odraslih{reservation.children > 0 && `, ${reservation.children} dece`}
                  </div>
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Podaci o rezervaciji</h3>
              <div className="space-y-2 text-slate-700">
                <p><span className="text-slate-500">Ime:</span> <strong>{reservation.customer_name}</strong></p>
                {reservation.customer_email && (
                  <p><span className="text-slate-500">Email:</span> {reservation.customer_email}</p>
                )}
                {reservation.customer_phone && (
                  <p><span className="text-slate-500">Telefon:</span> {reservation.customer_phone}</p>
                )}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-500 mb-3">Plaćanje</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Ukupna cena</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(reservation.total_price, reservation.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Uplaćeno</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(reservation.amount_paid, reservation.currency)}
                  </span>
                </div>
                {reservation.amount_paid < reservation.total_price && (
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-600">Preostalo za uplatu</span>
                    <span className="font-semibold text-amber-600">
                      {formatCurrency(reservation.total_price - reservation.amount_paid, reservation.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mock Contract Button */}
            <Link
              href={`/ugovor/${reservationId}`}
              className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
            >
              <FileText className="w-5 h-5" />
              Pogledaj ugovor (MOCK)
            </Link>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Šta dalje?</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Sačuvajte broj rezervacije</p>
                <p className="text-sm text-slate-600">Broj rezervacije vam je potreban za sve upite.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Proverite email</p>
                <p className="text-sm text-slate-600">Poslali smo vam potvrdu na {reservation.customer_email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-slate-900">Očekujte poziv</p>
                <p className="text-sm text-slate-600">Naš agent će vas kontaktirati sa dodatnim informacijama.</p>
              </div>
            </div>
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
                <p className="text-sm text-slate-500">Vaša turistička agencija</p>
              </div>
            </div>
            <div className="space-y-2">
              {reservation.organization.phone && (
                <a
                  href={`tel:${reservation.organization.phone}`}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Phone className="w-5 h-5 text-emerald-600" />
                  <span className="text-slate-700">{reservation.organization.phone}</span>
                </a>
              )}
              {reservation.organization.email && (
                <a
                  href={`mailto:${reservation.organization.email}`}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Mail className="w-5 h-5 text-emerald-600" />
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
