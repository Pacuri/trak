'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Mail, Phone, MapPin, Users, Euro, Clock, User,
  MessageSquare, FileText, Activity, Globe, Package, Home, UtensilsCrossed,
  Car, Baby, MessagesSquare, Archive, ArchiveRestore
} from 'lucide-react'
import ChatView from '@/components/chat/ChatView'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadActivity, CustomInquiry, QualificationData } from '@/types'

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  const { getLead, updateLead, addActivity, archiveLead, loading, error } = useLeads()
  const [archiving, setArchiving] = useState(false)
  const { stages, teamMembers } = useOrganization()
  const [lead, setLead] = useState<Lead | null>(null)
  const [sourceInquiry, setSourceInquiry] = useState<CustomInquiry | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const leadData = await getLead(leadId)
      setLead(leadData)

      // Fetch source inquiry if exists (for rich data display)
      if (leadData?.source_inquiry_id) {
        const { data: inquiryData } = await supabase
          .from('custom_inquiries')
          .select(`
            *,
            package:packages(id, name, hotel_name, destination_country, destination_city)
          `)
          .eq('id', leadData.source_inquiry_id)
          .single()

        if (inquiryData) {
          setSourceInquiry(inquiryData as CustomInquiry)
        }
      }

      // Fetch activities
      if (leadData) {
        const { data: activitiesData } = await supabase
          .from('lead_activities')
          .select(`
            *,
            user:users(id, email, full_name)
          `)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })

        if (activitiesData) {
          setActivities(activitiesData as LeadActivity[])
        }
      }
    }

    loadData()
  }, [leadId, getLead, supabase])

  const handleStageChange = async (stageId: string) => {
    if (!lead) return
    const updated = await updateLead(leadId, { stage_id: stageId || null })
    if (updated) {
      setLead(updated)
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select(`*, user:users(id, email, full_name)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (activitiesData) setActivities(activitiesData as LeadActivity[])
    }
  }

  const handleAssignChange = async (userId: string) => {
    if (!lead) return
    const updated = await updateLead(leadId, { assigned_to: userId || null })
    if (updated) {
      setLead(updated)
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select(`*, user:users(id, email, full_name)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (activitiesData) setActivities(activitiesData as LeadActivity[])
    }
  }

  const handleArchive = async () => {
    if (!lead) return
    setArchiving(true)
    const updated = await archiveLead(leadId, !lead.is_archived)
    if (updated) {
      setLead(updated)
      // Refresh activities
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select(`*, user:users(id, email, full_name)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (activitiesData) setActivities(activitiesData as LeadActivity[])
    }
    setArchiving(false)
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim() || !lead) return

    setAddingNote(true)
    const activity = await addActivity(leadId, 'note', note)
    if (activity) {
      setActivities((prev) => [activity, ...prev])
      setNote('')
      const currentNotes = lead.notes || ''
      const newNote = `${currentNotes ? currentNotes + '\n\n' : ''}${new Date().toLocaleString('sr-Latn-RS')}: ${note}`
      const updated = await updateLead(leadId, { notes: newNote })
      if (updated) setLead(updated)
    }
    setAddingNote(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('sr-Latn-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-Latn-RS', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      created: 'Kreiran',
      stage_changed: 'Promena faze',
      assigned: 'Dodeljen',
      note: 'Beleska',
      call: 'Poziv',
      email: 'Email',
      message: 'Poruka',
      archived: 'Arhiviran',
      unarchived: 'Vraćen iz arhive',
    }
    return labels[type] || type
  }

  // Helper to get accommodation type label
  const getAccommodationLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      hotel: 'Hotel',
      apartment: 'Apartman',
      villa: 'Vila',
      any: 'Bilo koji',
    }
    return type ? labels[type] || type : null
  }

  // Helper to get board type label
  const getBoardLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      all_inclusive: 'All Inclusive',
      half_board: 'Polupansion',
      breakfast: 'Dorucak',
      room_only: 'Samo soba',
      any: 'Bilo koji',
    }
    return type ? labels[type] || type : null
  }

  // Helper to get transport label
  const getTransportLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      flight: 'Avion',
      bus: 'Autobus',
      own: 'Sopstveni prevoz',
      none: 'Bez prevoza',
    }
    return type ? labels[type] || type : null
  }

  // Get time since creation
  const getTimeSince = (dateString: string) => {
    const created = new Date(dateString)
    const now = new Date()
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    if (hours < 1) return 'upravo'
    if (hours < 24) return `pre ${hours} sati`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'pre 1 dan'
    return `pre ${days} dana`
  }

  if (loading && !lead) {
    return (
      <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
        <p className="text-[#64748B] mb-4">Upit nije pronadjen.</p>
        <button
          onClick={() => router.back()}
          className="text-[#3B82F6] hover:text-[#2563EB] font-medium transition-colors"
        >
          Nazad
        </button>
      </div>
    )
  }

  const qualification = sourceInquiry?.qualification_data as QualificationData | null

  return (
    <div className="space-y-6">
      {/* Top Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad
        </button>

        <button
          onClick={handleArchive}
          disabled={archiving}
          className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-all ${
            lead.is_archived
              ? 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5] border border-[#059669]/20'
              : 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] border border-[#DC2626]/20'
          } disabled:opacity-50`}
        >
          {archiving ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : lead.is_archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          {lead.is_archived ? 'Vrati iz arhive' : 'Arhiviraj'}
        </button>
      </div>

      {/* Archived Banner */}
      {lead.is_archived && (
        <div className="rounded-[10px] bg-[#FEF3C7] border border-[#F59E0B]/30 p-4 flex items-center gap-3">
          <Archive className="h-5 w-5 text-[#D97706]" />
          <div>
            <p className="text-sm font-medium text-[#92400E]">Ovaj lead je arhiviran</p>
            {lead.archived_at && (
              <p className="text-xs text-[#B45309]">
                Arhiviran {new Date(lead.archived_at).toLocaleDateString('sr-Latn-RS', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lead Header Card */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-base font-semibold text-white">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#1E293B]">{lead.name}</h1>
              {/* Source Badge */}
              {lead.source_type === 'website' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B4D84] text-xs font-medium">
                  <img src="/trak-logo-circle.png" alt="trak" className="h-4 w-4" />
                  trak
                </span>
              )}
              {sourceInquiry?.package && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#F59E0B] text-xs font-medium">
                  <Package className="h-3 w-3" />
                  Paket stranica
                </span>
              )}
            </div>
            <p className="text-sm text-[#64748B]">
              Kreiran {formatDate(lead.created_at)} · {getTimeSince(lead.created_at)}
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            {/* Contact Info */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lead.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF]">
                      <Phone className="h-4 w-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Telefon</p>
                      <a href={`tel:${lead.phone}`} className="text-sm font-medium text-[#1E293B] hover:text-[#3B82F6]">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2]">
                      <Mail className="h-4 w-4 text-[#EF4444]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Email</p>
                      <a href={`mailto:${lead.email}`} className="text-sm font-medium text-[#1E293B] hover:text-[#3B82F6]">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {lead.destination && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5]">
                      <MapPin className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Destinacija</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lead.destination}</p>
                    </div>
                  </div>
                )}

                {lead.guests && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF]">
                      <Users className="h-4 w-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Broj gostiju</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lead.guests}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stage & Assignment */}
            <div className="space-y-4 lg:w-64">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Faza</label>
                <select
                  value={lead.stage_id || ''}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Bez faze</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">Zaduzen</label>
                <select
                  value={lead.assigned_to || ''}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Nije dodeljeno</option>
                  {teamMembers.map((user) => (
                    <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package Info - if from package inquiry */}
      {sourceInquiry?.package && (
        <div className="rounded-[14px] bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border border-[#F59E0B]/20 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 text-2xl">
              <Package className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#92400E] uppercase tracking-wide mb-1">Paket</p>
              <h3 className="text-lg font-bold text-[#1E293B]">{sourceInquiry.package.name}</h3>
              {sourceInquiry.package.hotel_name && (
                <p className="text-sm text-[#78350F]">{sourceInquiry.package.hotel_name}</p>
              )}
              {qualification?.selected_date && (
                <p className="text-sm text-[#78350F] mt-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Datum polaska: {new Date(qualification.selected_date).toLocaleDateString('sr-Latn-RS', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              )}
              {qualification?.selected_meal_plan && (
                <p className="text-sm text-[#78350F]">
                  <UtensilsCrossed className="inline h-4 w-4 mr-1" />
                  Usluga: {getBoardLabel(qualification.selected_meal_plan)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rich Inquiry Data - Zahtev Klijenta */}
      {qualification && (
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FDF4]">
              <FileText className="h-5 w-5 text-[#22C55E]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1E293B]">Zahtev klijenta</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Destination */}
            {qualification.destination && (qualification.destination.country || qualification.destination.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#64748B] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Destinacija</p>
                  <p className="text-sm font-medium text-[#1E293B]">
                    {qualification.destination.city && `${qualification.destination.city}, `}
                    {qualification.destination.country}
                  </p>
                </div>
              </div>
            )}

            {/* Guests */}
            {qualification.guests && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[#64748B] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Putnici</p>
                  <p className="text-sm font-medium text-[#1E293B]">
                    {qualification.guests.adults} odraslih
                    {qualification.guests.children > 0 && ` + ${qualification.guests.children} dece`}
                  </p>
                  {qualification.guests.childAges && qualification.guests.childAges.length > 0 && (
                    <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                      <Baby className="h-3 w-3" />
                      Uzrast dece: {qualification.guests.childAges.join(', ')} god.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            {qualification.dates && (qualification.dates.month || qualification.dates.exactStart) && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#64748B] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Termin</p>
                  <p className="text-sm font-medium text-[#1E293B]">
                    {qualification.dates.exactStart
                      ? formatDate(qualification.dates.exactStart)
                      : qualification.dates.month}
                    {qualification.dates.duration && ` · ${qualification.dates.duration} nocenja`}
                    {qualification.dates.flexible && ' (fleksibilno)'}
                  </p>
                </div>
              </div>
            )}

            {/* Accommodation */}
            {qualification.accommodation && (
              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-[#64748B] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Smestaj i prevoz</p>
                  <p className="text-sm font-medium text-[#1E293B]">
                    {getAccommodationLabel(qualification.accommodation.type) && (
                      <span>Tip: {getAccommodationLabel(qualification.accommodation.type)}</span>
                    )}
                    {getBoardLabel(qualification.accommodation.board) && (
                      <span className="ml-2">· Usluga: {getBoardLabel(qualification.accommodation.board)}</span>
                    )}
                  </p>
                  {getTransportLabel(qualification.accommodation.transport) && (
                    <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                      <Car className="h-3 w-3" />
                      Prevoz: {getTransportLabel(qualification.accommodation.transport)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Budget */}
            {qualification.budget && (qualification.budget.min || qualification.budget.max) && (
              <div className="flex items-start gap-3">
                <Euro className="h-5 w-5 text-[#64748B] mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-[#64748B]">Budzet</p>
                  <p className="text-sm font-medium text-[#1E293B]">
                    {qualification.budget.min && qualification.budget.max
                      ? `${qualification.budget.min} - ${qualification.budget.max} EUR`
                      : qualification.budget.max
                        ? `Do ${qualification.budget.max} EUR`
                        : `Od ${qualification.budget.min} EUR`}
                    {qualification.budget.perPerson && ' po osobi'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Message */}
      {(sourceInquiry?.customer_note || lead.original_message) && (
        <div className="rounded-[14px] bg-[#FEF3C7]/50 border border-[#F59E0B]/20 shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-[#F59E0B]/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7]">
              <MessageSquare className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <h2 className="text-lg font-semibold text-[#92400E]">Poruka klijenta</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-[#78350F] whitespace-pre-wrap">
              &quot;{sourceInquiry?.customer_note || lead.original_message}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
            <Activity className="h-5 w-5 text-[#3B82F6]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1E293B]">Vremenska linija aktivnosti</h2>
        </div>
        <div className="p-5">
          {activities.length === 0 ? (
            <p className="text-sm text-[#64748B] text-center py-4">Nema aktivnosti.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-[#3B82F6] mt-1"></div>
                    {idx !== activities.length - 1 && (
                      <div className="w-0.5 h-full bg-[#E2E8F0] mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#3B82F6]">
                        {getActivityTypeLabel(activity.type)}
                      </span>
                      {activity.user && (
                        <span className="text-sm text-[#64748B]">
                          od {activity.user.full_name || activity.user.email}
                        </span>
                      )}
                      <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-[#1E293B] mt-2 bg-[#F8FAFC] rounded-[8px] p-3">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      {lead.email && (
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
              <MessagesSquare className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1E293B]">Komunikacija</h2>
              <p className="text-xs text-[#64748B]">Email prepiska sa klijentom</p>
            </div>
          </div>
          <div className="h-[500px]">
            <ChatView
              leadId={lead.id}
              leadName={lead.name}
              leadEmail={lead.email}
            />
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7ED]">
            <FileText className="h-5 w-5 text-[#F97316]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1E293B]">Beleske</h2>
        </div>
        <div className="p-5">
          {lead.notes ? (
            <div className="mb-4 whitespace-pre-wrap text-sm text-[#1E293B] bg-[#F8FAFC] rounded-[10px] p-4">
              {lead.notes}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[#64748B] text-center py-2">Nema beleski.</p>
          )}

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodaj belesku..."
              rows={3}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E293B] bg-white placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
            <button
              type="submit"
              disabled={!note.trim() || addingNote}
              className="rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {addingNote ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Dodavanje...
                </span>
              ) : (
                'Dodaj belesku'
              )}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}
    </div>
  )
}
