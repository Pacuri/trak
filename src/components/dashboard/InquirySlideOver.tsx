'use client'

import { useState, useEffect } from 'react'
import { X, Phone, MessageCircle, Mail, MapPin, Users, Calendar, Home, Wallet, Send, AlertCircle, ChevronDown, Settings, Check } from 'lucide-react'
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

interface InquirySlideOverProps {
  inquiry: PendingInquiry | null
  isOpen: boolean
  onClose: () => void
  onResponded: () => void
}

// Map response types between different naming conventions
const RESPONSE_TYPE_MAP: Record<InquiryResponseType, 'can_organize' | 'cannot_organize' | 'need_more_info'> = {
  'can_help': 'can_organize',
  'cannot_help': 'cannot_organize',
  'need_info': 'need_more_info',
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

// Format source label
function getSourceLabel(source: string | null): { label: string; color: string; icon: string } {
  switch (source) {
    case 'package_inquiry':
      return { label: 'Paket stranica', color: 'bg-teal-100 text-teal-700', icon: '📦' }
    case 'qualification_form':
      return { label: 'Kvalifikacioni formular', color: 'bg-blue-100 text-blue-700', icon: '📋' }
    case 'website':
      return { label: 'Website', color: 'bg-purple-100 text-purple-700', icon: '🌐' }
    case 'manual':
      return { label: 'Ručni unos', color: 'bg-slate-100 text-slate-700', icon: '✏️' }
    default:
      return { label: source || 'Nepoznato', color: 'bg-slate-100 text-slate-700', icon: '📥' }
  }
}

// Format board type
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

// Format accommodation type
function getAccommodationLabel(type: string | null): string {
  switch (type) {
    case 'hotel': return 'Hotel'
    case 'apartment': return 'Apartman'
    case 'villa': return 'Vila'
    case 'hostel': return 'Hostel'
    default: return type || 'Nije navedeno'
  }
}

// Format transport type
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
  const [internalNotes, setInternalNotes] = useState('')
  const [createLead, setCreateLead] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Email-related state
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null)
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseTemplate | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const supabase = createClient()
  const { user, organizationId } = useUser()

  // Load email integration and templates
  useEffect(() => {
    if (organizationId) {
      loadEmailIntegration()
      loadTemplates()
    }
  }, [organizationId])

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
    setLoadingTemplates(true)

    const { data } = await supabase
      .from('response_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (data) {
      setTemplates(data)
    }
    setLoadingTemplates(false)
  }

  // Reset form when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setResponseType('can_help')
      setInternalNotes('')
      setCreateLead(true)
      setError(null)
      setSuccess(null)
      setSendEmail(!!inquiry.customer_email && !!emailIntegration)

      // Select default template for response type
      selectDefaultTemplate('can_help')
    }
  }, [inquiry?.id, templates])

  // Update template when response type changes
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

  const handleSubmit = async () => {
    if (!inquiry || !user || !organizationId) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Send email if enabled and customer has email
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

      // Update the inquiry with response
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError

      // Create lead if checkbox is checked
      if (createLead) {
        const { data: defaultStage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_default', true)
          .single()

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

        if (!leadError && newLead) {
          await supabase
            .from('custom_inquiries')
            .update({ converted_to_lead_id: newLead.id })
            .eq('id', inquiry.id)
        }
      }

      setSuccess(sendEmail && inquiry.customer_email ? 'Email uspešno poslat!' : 'Odgovor zabeležen!')
      setTimeout(() => {
        onResponded()
      }, 1500)
    } catch (err: any) {
      console.error('Error responding to inquiry:', err)
      setError(err.message || 'Greška pri slanju odgovora')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !inquiry) return null

  const qualification = inquiry.qualification_data
  const canSendEmail = !!inquiry.customer_email && !!emailIntegration
  const filteredTemplates = templates.filter(t => t.template_type === RESPONSE_TYPE_MAP[responseType])

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
            <div>
              <h2 className="font-semibold text-slate-900">Upit #{inquiry.id.slice(0, 8)}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getSourceLabel(inquiry.source).color}`}>
                  {getSourceLabel(inquiry.source).icon} {getSourceLabel(inquiry.source).label}
                </span>
                <span className="text-xs text-slate-400">
                  {formatTimeAgo(inquiry.created_at)}
                </span>
              </div>
            </div>
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

          {/* Package-specific info */}
          {qualification?.package_name && (
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Paket
              </h3>
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                <p className="text-sm font-medium text-teal-800">
                  🏨 {qualification.package_name}
                </p>
                {qualification.selected_date && (
                  <p className="text-xs text-teal-600 mt-1">
                    📅 Datum polaska: {new Date(qualification.selected_date).toLocaleDateString('sr-Latn', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
                {qualification.selected_meal_plan && (
                  <p className="text-xs text-teal-600">
                    🍽️ Usluga: {getBoardLabel(qualification.selected_meal_plan)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Request Details */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Zahtev klijenta
            </h3>

            <div className="space-y-3">
              {qualification?.destination && (qualification.destination.country || qualification.destination.city) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Destinacija</span>
                    <p className="text-slate-600">
                      {[qualification.destination.city, qualification.destination.country]
                        .filter(Boolean)
                        .join(', ') || 'Nije navedeno'}
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
                      {qualification.guests.adults} {qualification.guests.adults === 1 ? 'odrasla osoba' : 'odraslih'}
                      {qualification.guests.children > 0 && (
                        <> + {qualification.guests.children} {qualification.guests.children === 1 ? 'dete' : 'dece'}</>
                      )}
                    </p>
                    {qualification.guests.childAges && qualification.guests.childAges.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Uzrast dece: {qualification.guests.childAges.join(', ')} god.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {qualification?.dates && !qualification?.package_name && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Termin</span>
                    <p className="text-slate-600">
                      {qualification.dates.exactStart ? (
                        <>
                          {new Date(qualification.dates.exactStart).toLocaleDateString('sr-Latn')}
                          {qualification.dates.exactEnd && (
                            <> - {new Date(qualification.dates.exactEnd).toLocaleDateString('sr-Latn')}</>
                          )}
                        </>
                      ) : qualification.dates.month ? (
                        qualification.dates.month
                      ) : (
                        'Fleksibilno'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {qualification?.accommodation && (
                qualification.accommodation.type ||
                qualification.accommodation.board ||
                qualification.accommodation.transport
              ) && (
                <div className="flex items-start gap-3 text-sm">
                  <Home className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Smeštaj i prevoz</span>
                    <div className="text-slate-600 space-y-0.5">
                      {qualification.accommodation.type && (
                        <p>Tip: {getAccommodationLabel(qualification.accommodation.type)}</p>
                      )}
                      {qualification.accommodation.board && (
                        <p>Usluga: {getBoardLabel(qualification.accommodation.board)}</p>
                      )}
                      {qualification.accommodation.transport && (
                        <p>Prevoz: {getTransportLabel(qualification.accommodation.transport)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {qualification?.budget && (qualification.budget.min || qualification.budget.max) && (
                <div className="flex items-start gap-3 text-sm">
                  <Wallet className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-slate-700">Budžet</span>
                    <p className="text-slate-600">
                      {qualification.budget.min && qualification.budget.max ? (
                        <>€{qualification.budget.min.toLocaleString()} - €{qualification.budget.max.toLocaleString()}</>
                      ) : qualification.budget.min ? (
                        <>Od €{qualification.budget.min.toLocaleString()}</>
                      ) : qualification.budget.max ? (
                        <>Do €{qualification.budget.max.toLocaleString()}</>
                      ) : null}
                      {qualification.budget.perPerson && ' po osobi'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {inquiry.customer_note && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">💬 Poruka klijenta</p>
                <p className="text-sm text-amber-800">"{inquiry.customer_note}"</p>
              </div>
            )}
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

            {/* Email Section */}
            {canSendEmail ? (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium text-slate-700">Pošalji email</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {sendEmail && (
                  <>
                    {/* Template Selector */}
                    <div className="mb-3 relative">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Šablon
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-left hover:border-slate-300 transition-colors"
                      >
                        <span className="truncate">
                          {selectedTemplate?.name || 'Izaberi šablon...'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>

                      {showTemplateDropdown && filteredTemplates.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => handleTemplateSelect(template)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                                selectedTemplate?.id === template.id ? 'bg-teal-50 text-teal-700' : ''
                              }`}
                            >
                              <span className="truncate">{template.name}</span>
                              {template.is_default && (
                                <span className="text-xs text-slate-400 ml-2">Podrazumevani</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {filteredTemplates.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          Nema šablona za ovaj tip odgovora.{' '}
                          <Link href="/dashboard/settings/sabloni-odgovora" className="text-teal-600 hover:underline">
                            Kreirajte šablon
                          </Link>
                        </p>
                      )}
                    </div>

                    {/* Subject */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Predmet
                      </label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Predmet email-a"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Poruka
                      </label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono text-xs"
                        placeholder="Tekst email-a..."
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Promenljive kao {`{{ime}}`}, {`{{destinacija}}`} biće automatski zamenjene.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    {!inquiry.customer_email ? (
                      <p className="text-sm text-amber-700">
                        Klijent nema email adresu. Kontaktirajte ga telefonom ili putem Viber-a.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-700">
                        Email nije povezan.{' '}
                        <Link href="/dashboard/settings/integracije" className="font-medium underline">
                          Povežite email
                        </Link>{' '}
                        da biste slali odgovore direktno iz aplikacije.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (sendEmail && (!emailSubject || !emailBody))}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {sendEmail && canSendEmail ? 'Slanje email-a...' : 'Čuvanje...'}
              </>
            ) : (
              <>
                {sendEmail && canSendEmail ? (
                  <>
                    <Send className="w-4 h-4" />
                    Pošalji email
                  </>
                ) : (
                  <>✓ Zabeleži odgovor</>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default InquirySlideOver
