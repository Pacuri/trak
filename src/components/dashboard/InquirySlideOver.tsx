'use client'

import { useState, useEffect } from 'react'
import { X, Phone, MessageCircle, Mail, MapPin, Users, Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { PendingInquiry, InquiryResponseType } from '@/types/dashboard'

interface InquirySlideOverProps {
  inquiry: PendingInquiry | null
  isOpen: boolean
  onClose: () => void
  onResponded: () => void
}

// Format phone for Viber link
function formatViberLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return `viber://chat?number=${encodeURIComponent(cleaned)}`
}

// Format time ago
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffHours < 1) return 'pre manje od sat vremena'
  if (diffHours < 24) return `pre ${diffHours} sata`
  const days = Math.floor(diffHours / 24)
  if (days === 1) return 'pre 1 dan'
  return `pre ${days} dana`
}

const responseOptions: { value: InquiryResponseType; label: string; description: string }[] = [
  {
    value: 'can_help',
    label: 'Možemo da organizujemo',
    description: 'Poslaćete ponudu/predlog klijentu',
  },
  {
    value: 'cannot_help',
    label: 'Ne možemo',
    description: 'Nema dostupnosti ili ne radimo tu destinaciju',
  },
  {
    value: 'need_info',
    label: 'Potrebno više informacija',
    description: 'Tražite pojašnjenje od klijenta',
  },
]

export function InquirySlideOver({ inquiry, isOpen, onClose, onResponded }: InquirySlideOverProps) {
  const [responseType, setResponseType] = useState<InquiryResponseType>('can_help')
  const [responseMessage, setResponseMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [createLead, setCreateLead] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const { user, organizationId } = useUser()

  // Reset form when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setResponseType('can_help')
      setResponseMessage('')
      setInternalNotes('')
      setCreateLead(true)
      setError(null)
    }
  }, [inquiry?.id])

  const handleSubmit = async () => {
    if (!inquiry || !user || !organizationId) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Update the inquiry with response
      const { error: updateError } = await supabase
        .from('custom_inquiries')
        .update({
          status: 'contacted',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          response_type: responseType,
          response_message: responseMessage || null,
          internal_notes: internalNotes || null,
        })
        .eq('id', inquiry.id)

      if (updateError) throw updateError

      // Create lead if checkbox is checked
      if (createLead) {
        // Get the default pipeline stage
        const { data: defaultStage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .single()

        // Create the lead
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            organization_id: organizationId,
            name: inquiry.customer_name,
            phone: inquiry.customer_phone,
            email: inquiry.customer_email || null,
            destination: inquiry.qualification_data?.destination?.country || 
              inquiry.qualification_data?.destination?.city || null,
            guests: inquiry.qualification_data?.guests?.adults || null,
            notes: inquiry.customer_note || null,
            stage_id: defaultStage?.id || null,
            assigned_to: user.id,
            source_type: 'website',
          })
          .select('id')
          .single()

        if (leadError) {
          console.error('Failed to create lead:', leadError)
          // Don't fail the whole operation if lead creation fails
        } else if (newLead) {
          // Update inquiry with lead reference
          await supabase
            .from('custom_inquiries')
            .update({ converted_to_lead_id: newLead.id })
            .eq('id', inquiry.id)
        }
      }

      onResponded()
    } catch (err: any) {
      console.error('Error responding to inquiry:', err)
      setError(err.message || 'Greška pri slanju odgovora')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !inquiry) return null

  const qualification = inquiry.qualification_data

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <h2 className="font-semibold text-slate-900">Upit #{inquiry.id.slice(0, 8)}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Contact Info */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Kontakt
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {inquiry.customer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{inquiry.customer_name}</p>
                {inquiry.customer_email && (
                  <p className="text-sm text-slate-500">{inquiry.customer_email}</p>
                )}
              </div>
            </div>

            {/* Quick contact actions */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${inquiry.customer_phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {inquiry.customer_phone}
              </a>
              <a
                href={formatViberLink(inquiry.customer_phone)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Viber
              </a>
            </div>
          </div>

          {/* Request Details */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Zahtev
            </h3>
            
            <div className="space-y-3">
              {qualification?.destination && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    <span className="font-medium">Destinacija:</span>{' '}
                    {qualification.destination.city || qualification.destination.country || 'Nije navedeno'}
                  </span>
                </div>
              )}
              
              {qualification?.guests && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    <span className="font-medium">Putnici:</span>{' '}
                    {qualification.guests.adults} odraslih
                    {qualification.guests.children > 0 && ` + ${qualification.guests.children} dece`}
                  </span>
                </div>
              )}

              {qualification?.dates && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    <span className="font-medium">Termin:</span>{' '}
                    {qualification.dates.month || 'Fleksibilno'}
                    {qualification.dates.duration && ` • ${qualification.dates.duration} noći`}
                  </span>
                </div>
              )}

              {inquiry.customer_note && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 italic">
                    "{inquiry.customer_note}"
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-slate-400 mt-4">
                <Clock className="w-4 h-4" />
                Primljeno: {formatTimeAgo(inquiry.created_at)}
              </div>
            </div>
          </div>

          {/* Response Form */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Vaš odgovor
            </h3>

            {/* Status Selection */}
            <div className="space-y-2 mb-4">
              {responseOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    responseType === option.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="responseType"
                    value={option.value}
                    checked={responseType === option.value}
                    onChange={(e) => setResponseType(e.target.value as InquiryResponseType)}
                    className="mt-0.5 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Poruka klijentu (opciono)
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                placeholder="Npr. Hvala na upitu! Pogledaćemo dostupnost i javićemo vam se u toku dana."
              />
            </div>

            {/* Internal Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Interna napomena (opciono)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                placeholder="Beleške za tim..."
              />
            </div>

            {/* Create Lead Checkbox */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={createLead}
                onChange={(e) => setCreateLead(e.target.checked)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Kreiraj upit u pipeline-u</p>
                <p className="text-xs text-slate-500">Dodaj ovog klijenta kao novi upit za praćenje</p>
              </div>
            </label>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Slanje...
              </>
            ) : (
              <>✓ Pošalji odgovor</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default InquirySlideOver
