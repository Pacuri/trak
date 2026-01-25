'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function MockContractPage() {
  const params = useParams()
  const reservationId = params.id as string

  const [reservation, setReservation] = useState<ReservationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReservation() {
      try {
        const response = await fetch(`/api/public/reservations/${reservationId}`)
        if (response.ok) {
          const data = await response.json()
          setReservation(data)
        }
      } catch (err) {
        console.error('Error fetching reservation:', err)
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-slate-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-slate-600">Ugovor nije pronađen</p>
        </div>
      </div>
    )
  }

  const today = formatDate(new Date().toISOString())

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Mock Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">MOCK Ugovor</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Ovo je simulacija ugovora. U produkciji bi ovo bio pravi PDF dokument generisan pomoću @react-pdf/renderer.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/potvrda/${reservationId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad na potvrdu
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Štampaj / Sačuvaj PDF
          </button>
        </div>

        {/* Contract Document */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">UGOVOR O PUTOVANJU</h1>
              <p className="text-slate-600">Broj: {reservation.code}</p>
            </div>

            {/* Parties */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">UGOVORNE STRANE</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Organizator putovanja:</p>
                  <p className="font-bold text-slate-900">{reservation.organization?.name || 'Turistička agencija'}</p>
                  {reservation.organization?.phone && (
                    <p className="text-sm text-slate-600">Tel: {reservation.organization.phone}</p>
                  )}
                  {reservation.organization?.email && (
                    <p className="text-sm text-slate-600">Email: {reservation.organization.email}</p>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">Putnik:</p>
                  <p className="font-bold text-slate-900">{reservation.customer_name}</p>
                  {reservation.customer_phone && (
                    <p className="text-sm text-slate-600">Tel: {reservation.customer_phone}</p>
                  )}
                  {reservation.customer_email && (
                    <p className="text-sm text-slate-600">Email: {reservation.customer_email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">PREDMET UGOVORA</h2>

              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-600">Paket aranžman:</td>
                    <td className="py-3 font-medium text-slate-900">
                      {reservation.qualification_data?.package_name || 'N/A'}
                    </td>
                  </tr>
                  {reservation.qualification_data?.travel_dates?.start && (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-slate-600">Datum polaska:</td>
                      <td className="py-3 font-medium text-slate-900">
                        {formatDate(reservation.qualification_data.travel_dates.start)}
                      </td>
                    </tr>
                  )}
                  {reservation.qualification_data?.travel_dates?.end && (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-slate-600">Datum povratka:</td>
                      <td className="py-3 font-medium text-slate-900">
                        {formatDate(reservation.qualification_data.travel_dates.end)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-600">Broj putnika:</td>
                    <td className="py-3 font-medium text-slate-900">
                      {reservation.adults} odraslih{reservation.children > 0 && `, ${reservation.children} dece`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pricing */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">CENA I USLOVI PLAĆANJA</h2>

              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-600">Ukupna cena:</td>
                    <td className="py-3 font-bold text-slate-900">
                      {formatCurrency(reservation.total_price, reservation.currency)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-600">Depozit (30%):</td>
                    <td className="py-3 font-medium text-slate-900">
                      {formatCurrency(reservation.deposit_amount, reservation.currency)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3 text-slate-600">Uplaćeno:</td>
                    <td className="py-3 font-medium text-emerald-600">
                      {formatCurrency(reservation.amount_paid, reservation.currency)}
                    </td>
                  </tr>
                  {reservation.amount_paid < reservation.total_price && (
                    <tr className="border-b border-slate-200">
                      <td className="py-3 text-slate-600">Preostalo za uplatu:</td>
                      <td className="py-3 font-medium text-amber-600">
                        {formatCurrency(reservation.total_price - reservation.amount_paid, reservation.currency)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Terms */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">OPŠTI USLOVI</h2>
              <div className="text-sm text-slate-600 space-y-2">
                <p>1. Putnik je dužan da uplati preostali iznos najkasnije 14 dana pre polaska.</p>
                <p>2. U slučaju otkaza putovanja, primenjuju se uslovi otkaza navedeni u programu putovanja.</p>
                <p>3. Organizator zadržava pravo promene programa u slučaju više sile.</p>
                <p>4. Putnik je obavezan da poseduje važeća putna dokumenta.</p>
                <p>5. Na ovaj ugovor primenjuju se odredbe Zakona o turizmu Republike Srbije.</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-4">Za organizatora:</p>
                <div className="h-16 border-b border-slate-400"></div>
                <p className="text-sm text-slate-600 mt-2">{reservation.organization?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-4">Putnik:</p>
                <div className="h-16 border-b border-slate-400"></div>
                <p className="text-sm text-slate-600 mt-2">{reservation.customer_name}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Datum zaključenja ugovora: {today}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Ovaj dokument je generisan elektronski i važi bez pečata i potpisa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
