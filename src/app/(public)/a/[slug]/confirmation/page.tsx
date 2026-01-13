'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Copy, Check, Calendar, Mail, Phone, Clock } from 'lucide-react'

export default function ConfirmationPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [reservationCode, setReservationCode] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const code = sessionStorage.getItem('reservationCode')
    if (code) {
      setReservationCode(code)
    }
  }, [])

  const copyCode = async () => {
    if (reservationCode) {
      await navigator.clipboard.writeText(reservationCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rezervacija uspešna!
          </h1>
          <p className="text-gray-600 mb-8">
            Vaša rezervacija je primljena i biće potvrđena u najkraćem roku.
          </p>

          {/* Reservation code */}
          {reservationCode && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <p className="text-sm text-gray-500 mb-2">Broj rezervacije</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-bold font-mono tracking-wider text-gray-900">
                  {reservationCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Kopiraj"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Sačuvajte ovaj broj za buduću komunikaciju
              </p>
            </div>
          )}

          {/* Next steps */}
          <div className="text-left space-y-4 mb-8">
            <h3 className="font-semibold text-gray-900">Šta dalje?</h3>
            
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Proverite email</p>
                <p className="text-sm text-gray-600">
                  Poslali smo vam potvrdu na email sa svim detaljima
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Cena zaključana 72h</p>
                <p className="text-sm text-gray-600">
                  Imate 72 sata da izvršite uplatu i potvrdite rezervaciju
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Javićemo vam se</p>
                <p className="text-sm text-gray-600">
                  Agent će vas kontaktirati za dogovor o uplati
                </p>
              </div>
            </div>
          </div>

          {/* Calendar reminder */}
          <div className="border-t pt-6">
            <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
              <Calendar className="w-5 h-5" />
              Dodaj u kalendar
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href={`/a/${slug}`}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Nazad na početnu
          </Link>
        </div>
      </main>
    </div>
  )
}
