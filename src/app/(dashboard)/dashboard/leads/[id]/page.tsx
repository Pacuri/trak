'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Mail, Phone, MapPin, Users, Euro, Clock, User, MessageSquare, FileText, Activity } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { getStageBadgeColor } from '@/lib/utils'
import type { Lead, LeadActivity } from '@/types'

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  const { getLead, updateLead, addActivity, loading, error } = useLeads()
  const { stages, teamMembers } = useOrganization()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const leadData = await getLead(leadId)
      setLead(leadData)

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
      // Refresh activities to show the new stage change activity
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

  const handleAssignChange = async (userId: string) => {
    if (!lead) return
    const updated = await updateLead(leadId, { assigned_to: userId || null })
    if (updated) {
      setLead(updated)
      // Refresh activities
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim() || !lead) return

    setAddingNote(true)
    const activity = await addActivity(leadId, 'note', note)
    if (activity) {
      setActivities((prev) => [activity, ...prev])
      setNote('')
      // Also update the notes field
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
      note: 'Beleška',
      call: 'Poziv',
      email: 'Email',
      message: 'Poruka',
    }
    return labels[type] || type
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
        <p className="text-[#64748B] mb-4">Upit nije pronađen.</p>
        <button
          onClick={() => router.back()}
          className="text-[#3B82F6] hover:text-[#2563EB] font-medium transition-colors"
        >
          Nazad
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad
      </button>

      {/* Lead Info Card */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-base font-semibold text-white">
            {lead.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1E293B]">{lead.name}</h1>
            <p className="text-sm text-[#64748B]">Kreiran {formatDate(lead.created_at)}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lead.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF]">
                      <Phone className="h-4 w-4 text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Telefon</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lead.phone}</p>
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
                      <p className="text-sm font-medium text-[#1E293B]">{lead.email}</p>
                    </div>
                  </div>
                )}

                {lead.source && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F3FF]">
                      <User className="h-4 w-4 text-[#8B5CF6]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Izvor</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lead.source.name}</p>
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

                {lead.travel_date && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF7ED]">
                      <Calendar className="h-4 w-4 text-[#F97316]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Datum putovanja</p>
                      <p className="text-sm font-medium text-[#1E293B]">{lead.travel_date}</p>
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

                {lead.budget && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFBEB]">
                      <Euro className="h-4 w-4 text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Budžet</p>
                      <p className="text-sm font-medium text-[#1E293B]">€{lead.budget.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {lead.value && (
                  <div className="flex items-start gap-3 p-3 rounded-[10px] bg-[#F8FAFC]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5]">
                      <Euro className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">Vrednost</p>
                      <p className="text-sm font-bold text-[#10B981]">€{lead.value.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 lg:w-64">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Faza
                </label>
                <select
                  value={lead.stage_id || ''}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Bez faze</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Zadužen
                </label>
                <select
                  value={lead.assigned_to || ''}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Nije dodeljeno</option>
                  {teamMembers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Original Message Section */}
      {lead.original_message && (
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3FF]">
              <MessageSquare className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1E293B]">Originalna poruka</h2>
          </div>
          <div className="p-5">
            <div className="whitespace-pre-wrap text-sm text-[#1E293B] bg-[#F8FAFC] rounded-[10px] p-4">
              {lead.original_message}
            </div>
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
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-[#3B82F6] mt-1"></div>
                    {activity !== activities[activities.length - 1] && (
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
                      <p className="text-sm text-[#1E293B] mt-2 bg-[#F8FAFC] rounded-[8px] p-3">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7ED]">
            <FileText className="h-5 w-5 text-[#F97316]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1E293B]">Beleške</h2>
        </div>
        <div className="p-5">
          {lead.notes ? (
            <div className="mb-4 whitespace-pre-wrap text-sm text-[#1E293B] bg-[#F8FAFC] rounded-[10px] p-4">
              {lead.notes}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[#64748B] text-center py-2">Nema beleški.</p>
          )}

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodaj belešku..."
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
                'Dodaj belešku'
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
