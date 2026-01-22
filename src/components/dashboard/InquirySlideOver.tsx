'use client'

import { useState, useEffect } from 'react'
import { X, Phone, MessageCircle, Mail, MapPin, Users, Calendar, Home, Wallet, Send, AlertCircle, ChevronDown, Check, FileText, ExternalLink, Clock, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import Link from 'next/link'
import type { PendingInquiry, InquiryResponseType } from '@/types/dashboard'

interface ResponseTemplate {
  id: string
  template_type: 'can_organize' | 'cannot_organize' | 'need_more_info' | 'custom'
  name: string
  subject: string
  body: string
  is_default: boolean
}

interface EmailIntegration {
  id: string
  email_address: string
  is_active: boolean
}

interface OfferQuote {
  id: string
  status: 'draft' | 'sent' | 'viewed' | 'confirmed' | 'rejected' | 'expired'
  total_amount: number
  sent_at: string | null
  viewed_at: string | null
  confirmed_at: string | null
  valid_until: string | null
}

interface InquirySlideOverProps {
  inquiry: PendingInquiry | null
  isOpen: boolean
  onClose: () => void
  onResponded: () => void
}

// Map response types
const RESPONSE_TYPE_MAP: Record<InquiryResponseType, 'can_organize' | 'cannot_organize' | 'need_more_info'> = {
  'can_help': 'can_organize',
  'cannot_help': 'cannot_organize',
  'need_info': 'need_more_info',
}

function formatViberLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return `viber://chat?number=${encodeURIComponent(cleaned)}`
}

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

function getSourceLabel(source: string | null): { label: string; color: string; icon: string } {
  switch (source) {
    case 'package_inquiry':
      return { label: 'Paket stranica', color: 'bg-teal-100 text-teal-700', icon: '📦' }
    case 'qualification_form':
      return { label: 'Kvalifikacioni formular', color: 'bg-blue-100 text-blue-700', icon: '📋' }
    case 'website':
      return { label: 'Website', color: 'bg-purple-100 text-purple-700', icon: '🌐' }
    default:
      return { label: source || 'Nepoznato', color: 'bg-slate-100 text-slate-700', icon: '📥' }
  }
}

function getBoardLabel(board: string | null): string {
  switch (board) {
    case 'RO': return 'Samo smeštaj'
    case 'BB': return 'Doručak'
    case 'HB': return 'Polupansion'
    case 'FB': return 'Pun pansion'
    case 'AI': return 'All Inclusive'
    case 'UAI': return 'Ultra All Inclusive'
    default: return board || 'Nije navedeno'
  }
}

function getAccommodationLabel(type: string | null): string {
  switch (type) {
    case 'hotel': return 'Hotel'
    case 'apartment': return 'Apartman'
    case 'villa': return 'Vila'
    case 'hostel': return 'Hostel'
    default: return type || 'Nije navedeno'
  }
}

function getTransportLabel(transport: string | null): string {
  switch (transport) {
    case 'bus': return 'Autobus'
    case 'plane': return 'Avion'
    case 'own': return 'Sopstveni prevoz'
    case 'train': return 'Voz'
    default: return transport || 'Nije navedeno'
  }
}

const responseOptions: { value: InquiryResponseType; label: string; description: string }[] = [
  { value: 'can_help', label: 'Možemo da organizujemo', description: 'Poslaćete ponudu klijentu' },
  { value: 'cannot_help', label: 'Ne možemo', description: 'Nema dostupnosti ili ne radimo tu destinaciju' },
  { value: 'need_info', label: 'Potrebno više informacija', description: 'Tražite pojašnjenje od klijenta' },
]

const STATUS_CONFIG = {
  sent: { label: 'Poslato', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Pregledano', color: 'bg-amber-100 text-amber-700', icon: Eye },
  confirmed: { label: 'Potvrđeno', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Odbijeno', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Isteklo', color: 'bg-slate-100 text-slate-600', icon: Clock },
  draft: { label: 'Nacrt', color: 'bg-slate-100 text-slate-600', icon: FileText },
}

export function InquirySlideOver({ inquiry, isOpen, onClose, onResponded }: InquirySlideOverProps) {
  const [responseType, setResponseType] = useState<InquiryResponseType>('can_help')
  const [internalNotes, setInternalNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Email state
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null)
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseTemplate | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)

  // Offer state
  const [existingOffer, setExistingOffer] = useState<OfferQuote | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [creatingOffer, setCreatingOffer] = useState(false)

  const supabase = createClient()
  const { user, organizationId } = useUser()

  // Load email integration and templates
  useEffect(() => {
    if (organizationId) {
      loadEmailIntegration()
      loadTemplates()
    }
  }, [organizationId])

  // Check for existing offer when inquiry changes
  useEffect(() => {
    if (inquiry?.id && organizationId) {
      checkExistingOffer()
    }
  }, [inquiry?.id, organizationId])

  const loadEmailIntegration = async () => {
    if (!organizationId) return
    const { data } = await supabase
      .from('email_integrations')
      .select('id, email_address, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    setEmailIntegration(data || null)
  }

  const loadTemplates = async () => {
    if (!organizationId) return
    const { data } = await supabase
      .from('response_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('position', { ascending: true })
    if (data) setTemplates(data)
  }

  const checkExistingOffer = async () => {
    if (!inquiry?.id) return
    const { data } = await supabase
      .from('offer_quotes')
      .select('*')
      .eq('inquiry_id', inquiry.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setExistingOffer(data || null)
  }

  // Reset form when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setResponseType('can_help')
      setInternalNotes('')
      setError(null)
      setSuccess(null)
      setShowOfferForm(false)
      setOfferPrice('')
      setOfferMessage('')
      setSendEmail(!!inquiry.customer_email && !!emailIntegration)
      selectDefaultTemplate('can_help')
    }
  }, [inquiry?.id, templates])

  useEffect(() => {
    selectDefaultTemplate(responseType)
  }, [responseType])

  const selectDefaultTemplate = (type: InquiryResponseType) => {
    const templateType = RESPONSE_TYPE_MAP[type]
    const defaultTemplate = templates.find(t => t.template_type === templateType && t.is_default)
    const anyTemplate = templates.find(t => t.template_type === templateType)
    const template = defaultTemplate || anyTemplate
    if (template) {
      setSelectedTemplate(template)
      setEmailSubject(template.subject)
      setEmailBody(template.body)
    } else {
      setSelectedTemplate(null)
      setEmailSubject('')
      setEmailBody('')
    }
  }

  const handleTemplateSelect = (template: ResponseTemplate) => {
    setSelectedTemplate(template)
    setEmailSubject(template.subject)
    setEmailBody(template.body)
    setShowTemplateDropdown(false)
  }

  const handleCreateOffer = async () => {
    if (!inquiry || !user || !organizationId) return

    const price = parseFloat(offerPrice)
    if (isNaN(price) || price <= 0) {
      setError('Unesite validnu cenu')
      return
    }

    setCreatingOffer(true)
    setError(null)

    try {
      const qualification = inquiry.qualification_data

      const res = await fetch('/api/offer-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: inquiry.lead_id,
          inquiry_id: inquiry.id,
          package_id: qualification?.package_id || null,
          customer_name: inquiry.customer_name,
          customer_email: inquiry.customer_email,
          travel_dates: qualification?.dates ? {
            start: qualification.dates.exactStart,
            end: qualification.dates.exactEnd
          } : qualification?.selected_date ? {
            start: qualification.selected_date,
            end: qualification.selected_date
          } : null,
          guests: qualification?.guests || null,
          destination: qualification?.destination ?
            `${qualification.destination.city || ''}, ${qualification.destination.country || ''}`.replace(/^, |, $/g, '') :
            null,
          price_breakdown: { total: price },
          total_amount: price,
          agent_message: offerMessage || null,
          valid_days: 7
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Greška pri kreiranju ponude')
      }

      // Copy offer URL to clipboard
      if (data.offer_url) {
        await navigator.clipboard.writeText(data.offer_url)
      }

      setExistingOffer(data)
      setShowOfferForm(false)
      setSuccess(`Ponuda kreirana! Link kopiran: ${data.offer_url}`)

      // Update inquiry status
      await supabase
        .from('custom_inquiries')
        .update({
          status: 'contacted',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
        })
        .eq('id', inquiry.id)

      setTimeout(() => {
        onResponded()
      }, 2000)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Greška pri kreiranju ponude'
      setError(message)
    } finally {
      setCreatingOffer(false)
    }
  }

  const handleSubmit = async () => {
    if (!inquiry || !user || !organizationId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Send email if enabled
      if (sendEmail && inquiry.customer_email && emailIntegration) {
        const emailResponse = await fetch('/api/email/send-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId: inquiry.id,
            templateId: selectedTemplate?.id,
            subject: emailSubject,
            body: emailBody,
            recipientEmail: inquiry.customer_email,
            recipientName: inquiry.customer_name,
            responseType: RESPONSE_TYPE_MAP[responseType],
          }),
        })

        const emailResult = await emailResponse.json()
        if (!emailResponse.ok) {
          throw new Error(emailResult.error || 'Greška pri slanju email-a')
        }
      }

      // Update inquiry
      await supabase
        .from('custom_inquiries')
        .update({
          status: 'contacted',
          responded_at: new Date().toISOString(),
          responded_by: user.id,
          response_type: responseType,
          response_message: emailBody || null,
          internal_notes: internalNotes || null,
        })
        .eq('id', inquiry.id)

      // Update lead
      if (inquiry.lead_id) {
        const { data: stages } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('is_won', false)
          .eq('is_lost', false)
          .order('position', { ascending: true })

        const ponudaStage = stages?.find(s =>
          s.name.toLowerCase().includes('ponuda') ||
          s.name.toLowerCase().includes('poslat')
        ) || stages?.[2]

        const updateData: Record<string, unknown> = {
          awaiting_response: false,
          last_response_at: new Date().toISOString(),
        }
        if (ponudaStage) updateData.stage_id = ponudaStage.id

        await supabase
          .from('leads')
          .update(updateData)
          .eq('id', inquiry.lead_id)
      }

      setSuccess(sendEmail && inquiry.customer_email ? 'Email uspešno poslat!' : 'Odgovor zabeležen!')
      setTimeout(() => onResponded(), 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Greška pri slanju odgovora'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendContract = () => {
    // TODO: Implement contract sending
    alert('Slanje ugovora - funkcionalnost u pripremi')
  }

  if (!isOpen || !inquiry) return null

  const qualification = inquiry.qualification_data
  const canSendEmail = !!inquiry.customer_email && !!emailIntegration
  const filteredTemplates = templates.filter(t => t.template_type === RESPONSE_TYPE_MAP[responseType])
  const offerUrl = existingOffer ? `${window.location.origin}/ponuda/${existingOffer.id}` : null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h2 className="font-semibold text-slate-900">Upit #{inquiry.id.slice(0, 8)}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getSourceLabel(inquiry.source).color}`}>
                  {getSourceLabel(inquiry.source).icon} {getSourceLabel(inquiry.source).label}
                </span>
                <span className="text-xs text-slate-400">{formatTimeAgo(inquiry.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Existing Offer Status */}
          {existingOffer && (
            <div className="px-6 py-4 border-b border-slate-100">
              <div className={`p-4 rounded-xl ${
                existingOffer.status === 'confirmed' ? 'bg-emerald-50 border border-emerald-200' :
                existingOffer.status === 'viewed' ? 'bg-amber-50 border border-amber-200' :
                existingOffer.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-semibold">Ponuda poslata</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[existingOffer.status]?.color || 'bg-slate-100'}`}>
                    {STATUS_CONFIG[existingOffer.status]?.label || existingOffer.status}
                  </span>
                </div>

                <div className="text-sm space-y-1 mb-3">
                  <p><strong>Iznos:</strong> €{existingOffer.total_amount?.toLocaleString()}</p>
                  {existingOffer.viewed_at && (
                    <p className="text-slate-600">Pregledano: {new Date(existingOffer.viewed_at).toLocaleString('sr-Latn')}</p>
                  )}
                  {existingOffer.confirmed_at && (
                    <p className="text-emerald-700 font-medium">Potvrđeno: {new Date(existingOffer.confirmed_at).toLocaleString('sr-Latn')}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <a
                    href={offerUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 border border-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pogledaj ponudu
                  </a>
                  <button
                    onClick={() => {
                      if (offerUrl) navigator.clipboard.writeText(offerUrl)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 border border-slate-200"
                  >
                    Kopiraj link
                  </button>
                </div>

                {/* Send Contract Button - shows when confirmed */}
                {existingOffer.status === 'confirmed' && (
                  <button
                    onClick={handleSendContract}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Pošalji ugovor
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Kontakt</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {inquiry.customer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{inquiry.customer_name}</p>
                {inquiry.customer_email && <p className="text-sm text-slate-500">{inquiry.customer_email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`tel:${inquiry.customer_phone}`} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                <Phone className="w-4 h-4" />
                {inquiry.customer_phone}
              </a>
              <a href={formatViberLink(inquiry.customer_phone)} className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100">
                <MessageCircle className="w-4 h-4" />
                Viber
              </a>
            </div>
          </div>

          {/* Package Info */}
          {qualification?.package_name && (
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Paket</h3>
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                <p className="text-sm font-medium text-teal-800">🏨 {qualification.package_name}</p>
                {qualification.selected_date && (
                  <p className="text-xs text-teal-600 mt-1">
                    📅 {new Date(qualification.selected_date).toLocaleDateString('sr-Latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {qualification.selected_meal_plan && (
                  <p className="text-xs text-teal-600">🍽️ {getBoardLabel(qualification.selected_meal_plan)}</p>
                )}
              </div>
            </div>
          )}

          {/* Request Details */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Zahtev</h3>
            <div className="space-y-3">
              {qualification?.destination && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Destinacija</span>
                    <p className="text-slate-600">
                      {[qualification.destination.city, qualification.destination.country].filter(Boolean).join(', ') || 'Nije navedeno'}
                    </p>
                  </div>
                </div>
              )}
              {qualification?.guests && (
                <div className="flex items-start gap-3 text-sm">
                  <Users className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Putnici</span>
                    <p className="text-slate-600">
                      {qualification.guests.adults} odraslih
                      {qualification.guests.children > 0 && <> + {qualification.guests.children} dece</>}
                    </p>
                  </div>
                </div>
              )}
              {qualification?.dates && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Termin</span>
                    <p className="text-slate-600">
                      {qualification.dates.exactStart ? new Date(qualification.dates.exactStart).toLocaleDateString('sr-Latn') : qualification.dates.month || 'Fleksibilno'}
                    </p>
                  </div>
                </div>
              )}
              {qualification?.budget && (qualification.budget.min || qualification.budget.max) && (
                <div className="flex items-start gap-3 text-sm">
                  <Wallet className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Budžet</span>
                    <p className="text-slate-600">
                      {qualification.budget.min && qualification.budget.max ? `€${qualification.budget.min} - €${qualification.budget.max}` :
                       qualification.budget.min ? `Od €${qualification.budget.min}` : `Do €${qualification.budget.max}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {inquiry.customer_note && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">💬 Poruka</p>
                <p className="text-sm text-amber-800">"{inquiry.customer_note}"</p>
              </div>
            )}
          </div>

          {/* Response Section - only show if no offer exists */}
          {!existingOffer && (
            <div className="px-6 py-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Vaš odgovor</h3>

              {/* Quick Offer Creation */}
              {!showOfferForm ? (
                <button
                  onClick={() => setShowOfferForm(true)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md"
                >
                  <FileText className="w-5 h-5" />
                  Kreiraj ponudu
                </button>
              ) : (
                <div className="mb-4 p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
                  <h4 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Nova ponuda
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-teal-700 mb-1">Ukupna cena (€)</label>
                      <input
                        type="number"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="npr. 1500"
                        className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-teal-700 mb-1">Poruka (opciono)</label>
                      <textarea
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        rows={2}
                        placeholder="Dodatne informacije za klijenta..."
                        className="w-full px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateOffer}
                        disabled={creatingOffer || !offerPrice}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
                      >
                        {creatingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {creatingOffer ? 'Kreiranje...' : 'Pošalji ponudu'}
                      </button>
                      <button
                        onClick={() => setShowOfferForm(false)}
                        className="px-4 py-2 bg-white text-slate-600 font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Otkaži
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-slate-400">ili pošalji email</span>
                </div>
              </div>

              {/* Response Type Selection */}
              <div className="space-y-2 mb-4">
                {responseOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      responseType === option.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="responseType"
                      value={option.value}
                      checked={responseType === option.value}
                      onChange={(e) => setResponseType(e.target.value as InquiryResponseType)}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Email Section */}
              {canSendEmail ? (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-medium">Pošalji email</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  {sendEmail && (
                    <>
                      <div className="mb-3 relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Šablon</label>
                        <button
                          type="button"
                          onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <span className="truncate">{selectedTemplate?.name || 'Izaberi šablon...'}</span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                        {showTemplateDropdown && filteredTemplates.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredTemplates.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTemplateSelect(t)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${selectedTemplate?.id === t.id ? 'bg-teal-50 text-teal-700' : ''}`}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Predmet</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Poruka</label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-xs resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      {!inquiry.customer_email ? 'Klijent nema email.' : (
                        <>Email nije povezan. <Link href="/dashboard/integrations" className="underline">Povežite email</Link></>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Interna napomena</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder="Beleške za tim..."
                />
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}
            </div>
          )}

          {/* Show success/error even when offer exists */}
          {existingOffer && (error || success) && (
            <div className="px-6 pb-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - only show submit button if no offer exists and not showing offer form */}
        {!existingOffer && !showOfferForm && (
          <div className="px-6 py-4 border-t border-slate-200">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (sendEmail && (!emailSubject || !emailBody))}
              className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {sendEmail && canSendEmail ? 'Slanje...' : 'Čuvanje...'}
                </>
              ) : (
                <>
                  {sendEmail && canSendEmail ? <><Send className="w-4 h-4" /> Pošalji email</> : <>✓ Zabeleži</>}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default InquirySlideOver
