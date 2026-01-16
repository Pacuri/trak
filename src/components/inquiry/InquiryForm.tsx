'use client'

import { useState } from 'react'
import { Loader2, Phone, User, Mail, MessageSquare } from 'lucide-react'
import type { InquiryFormProps, InquiryFormData } from '@/types/inquiry'

export default function InquiryForm({ onSubmit, isSubmitting, responseTimeText }: InquiryFormProps) {
  const [formData, setFormData] = useState<InquiryFormData>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_note: '',
  })
  const [errors, setErrors] = useState<Partial<InquiryFormData>>({})

  const validate = (): boolean => {
    const newErrors: Partial<InquiryFormData> = {}

    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      newErrors.customer_name = 'Unesite ime i prezime'
    }

    if (!formData.customer_phone.trim() || formData.customer_phone.trim().length < 6) {
      newErrors.customer_phone = 'Unesite broj telefona'
    }

    if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
      newErrors.customer_email = 'Unesite ispravnu email adresu'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Ime i prezime *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="npr. Marko Marković"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
              errors.customer_name ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-teal-200'
            } focus:border-teal-500 focus:ring-2 transition-all`}
            disabled={isSubmitting}
          />
        </div>
        {errors.customer_name && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_name}</p>
        )}
      </div>

      {/* Phone field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Telefon *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            placeholder="npr. 065 123 4567"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
              errors.customer_phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-teal-200'
            } focus:border-teal-500 focus:ring-2 transition-all`}
            disabled={isSubmitting}
          />
        </div>
        <p className="text-gray-500 text-xs mt-1">Pozvaćemo vas na ovaj broj</p>
        {errors.customer_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_phone}</p>
        )}
      </div>

      {/* Email field (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email <span className="text-gray-400">(opciono)</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            placeholder="npr. marko@email.com"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
              errors.customer_email ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-teal-200'
            } focus:border-teal-500 focus:ring-2 transition-all`}
            disabled={isSubmitting}
          />
        </div>
        {errors.customer_email && (
          <p className="text-red-500 text-sm mt-1">{errors.customer_email}</p>
        )}
      </div>

      {/* Note field (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Napomena <span className="text-gray-400">(opciono)</span>
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            value={formData.customer_note}
            onChange={(e) => setFormData({ ...formData, customer_note: e.target.value })}
            placeholder="npr. Želimo hotel blizu plaže, sa bazenom..."
            rows={3}
            maxLength={500}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all resize-none"
            disabled={isSubmitting}
          />
        </div>
        <p className="text-gray-400 text-xs mt-1 text-right">
          {formData.customer_note?.length || 0}/500
        </p>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-300 text-gray-900 font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Šaljem upit...
          </>
        ) : (
          'Pošalji upit'
        )}
      </button>

      {/* Response time note */}
      <p className="text-center text-gray-500 text-sm">
        ⏱️ {responseTimeText}
      </p>

      {/* Privacy note */}
      <p className="text-center text-gray-400 text-xs">
        Slanjem upita prihvatate da vas agencija kontaktira u vezi vaše pretrage.
      </p>
    </form>
  )
}
