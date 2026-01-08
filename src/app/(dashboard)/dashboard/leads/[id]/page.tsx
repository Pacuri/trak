'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Mail, Phone, MapPin, Users, DollarSign, Clock } from 'lucide-react'
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
      const newNote = `${currentNotes ? currentNotes + '\n\n' : ''}${new Date().toLocaleString()}: ${note}`
      const updated = await updateLead(leadId, { notes: newNote })
      if (updated) setLead(updated)
    }
    setAddingNote(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      created: 'Created',
      stage_changed: 'Stage Changed',
      assigned: 'Assigned',
      note: 'Note',
      call: 'Call',
      email: 'Email',
      message: 'Message',
    }
    return labels[type] || type
  }

  if (loading && !lead) {
    return (
      <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
        <p className="text-[#64748B]">Loading lead...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
        <p className="text-[#64748B] mb-4">Lead not found.</p>
        <button
          onClick={() => router.back()}
          className="text-[#3B82F6] hover:text-[#2563EB]"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-[#64748B] hover:text-[#1E293B]"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </button>

      {/* Lead Info Card */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="p-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">{lead.name}</h1>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lead.phone && (
                  <div className="flex items-start">
                    <Phone className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Phone</p>
                      <p className="text-sm text-[#1E293B]">{lead.phone}</p>
                    </div>
                  </div>
                )}

                {lead.email && (
                  <div className="flex items-start">
                    <Mail className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Email</p>
                      <p className="text-sm text-[#1E293B]">{lead.email}</p>
                    </div>
                  </div>
                )}

                {lead.source && (
                  <div className="flex items-start">
                    <div className="mr-3 h-5 w-5 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Source</p>
                      <p className="text-sm text-[#1E293B]">{lead.source.name}</p>
                    </div>
                  </div>
                )}

                {lead.destination && (
                  <div className="flex items-start">
                    <MapPin className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Destination</p>
                      <p className="text-sm text-[#1E293B]">{lead.destination}</p>
                    </div>
                  </div>
                )}

                {lead.travel_date && (
                  <div className="flex items-start">
                    <Calendar className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Travel Date</p>
                      <p className="text-sm text-[#1E293B]">{lead.travel_date}</p>
                    </div>
                  </div>
                )}

                {lead.guests && (
                  <div className="flex items-start">
                    <Users className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Guests</p>
                      <p className="text-sm text-[#1E293B]">{lead.guests}</p>
                    </div>
                  </div>
                )}

                {lead.budget && (
                  <div className="flex items-start">
                    <DollarSign className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Budget</p>
                      <p className="text-sm text-[#1E293B]">${lead.budget.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {lead.value && (
                  <div className="flex items-start">
                    <DollarSign className="mr-3 h-5 w-5 text-[#64748B] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#64748B]">Value</p>
                      <p className="text-sm text-[#1E293B]">${lead.value.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-[#64748B] mb-1">Created</p>
                <p className="text-sm text-[#1E293B]">{formatDate(lead.created_at)}</p>
              </div>
            </div>

            <div className="space-y-4 lg:w-64">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Stage
                </label>
                <select
                  value={lead.stage_id || ''}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                >
                  <option value="">Unassigned</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Assign To
                </label>
                <select
                  value={lead.assigned_to || ''}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
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
          <div className="p-5">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Original Message</h2>
            <div className="whitespace-pre-wrap text-sm text-[#1E293B] bg-gray-50 rounded-[10px] p-4">
              {lead.original_message}
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
        <div className="p-5">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Activity Timeline</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-[#64748B]">No activities yet.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-[#3B82F6] mt-1.5"></div>
                    {activity !== activities[activities.length - 1] && (
                      <div className="w-0.5 h-full bg-[#E2E8F0] mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#1E293B]">
                        {getActivityTypeLabel(activity.type)}
                      </span>
                      {activity.user && (
                        <span className="text-sm text-[#64748B]">
                          by {activity.user.full_name || activity.user.email}
                        </span>
                      )}
                      <span className="text-sm text-[#94A3B8] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-[#1E293B] mt-1">{activity.description}</p>
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
        <div className="p-5">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Notes</h2>

          {lead.notes ? (
            <div className="mb-4 whitespace-pre-wrap text-sm text-[#1E293B] bg-gray-50 rounded-[10px] p-4">
              {lead.notes}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[#64748B]">No notes yet.</p>
          )}

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
            />
            <button
              type="submit"
              disabled={!note.trim() || addingNote}
              className="rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}
    </div>
  )
}
