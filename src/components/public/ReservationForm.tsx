'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Offer } from '@/types'

interface ReservationFormProps {
  offer: Offer
  guestCount: number
  onSubmit: (data: ReservationFormData) => Promise<void>
  isSubmitting: boolean
}

export interface ReservationFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  adults: number
  children: number
  childAges: number[]
  notes: string
  acceptTerms: boolean
}

export default function ReservationForm({
  offer,
  guestCount,
  onSubmit,
  isSubmitting,
}: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    adults: Math.max(1, guestCount),
    children: 0,
    childAges: [],
    notes: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ReservationFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Ime i prezime je obavezno'
    }
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email je obavezan'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Unesite ispravnu email adresu'
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Telefon je obavezan'
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Morate prihvatiti uslove'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    await onSubmit(formData)
  }

  const totalPrice = offer.price_per_person * (formData.adults + formData.children)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Guest details */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900">Podaci o kontaktu</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ime i prezime *
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.customerName ? 'border-red-500' : 'border-gray-200'
            } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
            placeholder="Marko Marković"
          />
          {errors.customerName && (
            <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.customerEmail ? 'border-red-500' : 'border-gray-200'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
              placeholder="marko@email.com"
            />
            {errors.customerEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon *
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.customerPhone ? 'border-red-500' : 'border-gray-200'
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
              placeholder="+381 64 123 4567"
            />
            {errors.customerPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.customerPhone}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Napomena (opciono)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Posebni zahtevi, alergije..."
          />
        </div>
      </div>

      {/* Price summary */}
      <div className="bg-blue-50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Cena po osobi</span>
          <span className="font-semibold">€{offer.price_per_person}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Broj putnika</span>
          <span className="font-semibold">{formData.adults + formData.children}</span>
        </div>
        <div className="border-t border-blue-200 pt-4 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Ukupno</span>
          <span className="text-2xl font-bold text-blue-600">€{totalPrice.toLocaleString()}</span>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Cena zaključana 72h • Bez obaveze plaćanja
        </p>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.acceptTerms}
          onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
        />
        <span className="text-sm text-gray-600">
          Prihvatam{' '}
          <a href="#" className="text-blue-600 underline">
            uslove korišćenja
          </a>{' '}
          i{' '}
          <a href="#" className="text-blue-600 underline">
            politiku privatnosti
          </a>
        </span>
      </label>
      {errors.acceptTerms && (
        <p className="text-red-500 text-sm">{errors.acceptTerms}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Šalje se...
          </>
        ) : (
          'Potvrdi rezervaciju'
        )}
      </button>
    </form>
  )
}
