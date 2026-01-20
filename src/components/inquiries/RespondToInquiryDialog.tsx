'use client'

import { useState } from 'react'
import { X, Phone, Mail, MapPin, Users, Calendar, MessageSquare, Send } from 'lucide-react'
import type { CustomInquiry } from '@/types'

interface RespondToInquiryDialogProps {
  inquiry: CustomInquiry
  onConfirm: (note: string, status: 'contacted' | 'converted' | 'closed') => void
  onCancel: () => void
  loading?: boolean
}

export default function RespondToInquiryDialog({
  inquiry,
  onConfirm,
  onCancel,
  loading = false,
}: RespondToInquiryDialogProps) {
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'contacted' | 'converted' | 'closed'>('contacted')

  const qualification = inquiry.qualification_data

  // Get destination string
  const destination = qualification?.destination
  const destinationText = destination
    ? [destination.city, destination.country].filter(Boolean).join(', ')
    : null

  // Get guests info
  const guests = qualification?.guests
  const guestText = guests
    ? `${guests.adults} odraslih${guests.children ? ` + ${guests.children} dece` : ''}`
    : null

  // Get travel dates
  const dates = qualification?.dates
  const dateText = dates?.month || (dates?.flexible ? 'Fleksibilno' : null)
  const durationText = dates?.duration ? `${dates.duration} noći` : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Odgovori na upit</h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Customer Info */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900">{inquiry.customer_name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <a
                  href={`tel:${inquiry.customer_phone}`}
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {inquiry.customer_phone}
                </a>
                {inquiry.customer_email && (
                  <a
                    href={`mailto:${inquiry.customer_email}`}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {inquiry.customer_email}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Inquiry details */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {destinationText && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                {destinationText}
              </span>
            )}
            {guestText && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {guestText}
              </span>
            )}
            {dateText && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {dateText}
                {durationText && ` (${durationText})`}
              </span>
            )}
          </div>

          {/* Customer note if present */}
          {inquiry.customer_note && (
            <div className="mt-3 rounded-lg bg-white p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">{inquiry.customer_note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Response Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status upita
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('contacted')}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  status === 'contacted'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kontaktiran
              </button>
              <button
                type="button"
                onClick={() => setStatus('converted')}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  status === 'converted'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rezervisao
              </button>
              <button
                type="button"
                onClick={() => setStatus('closed')}
                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  status === 'closed'
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Zatvoren
              </button>
            </div>
          </div>

          {/* Response Note */}
          <div>
            <label htmlFor="response-note" className="block text-sm font-medium text-slate-700 mb-2">
              Beleška (opciono)
            </label>
            <textarea
              id="response-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Npr. Poslat email sa ponudom za Grčku..."
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note, status)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Čuvam...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Sačuvaj odgovor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
