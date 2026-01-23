'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, MessageCircle, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { useChat } from '@/contexts/ChatContext'
import type { Lead, LeadActivity, CustomInquiry, QualificationData, User, Booking, Message } from '@/types'
import {
  PipelineProgress,
  ClientInfoCard,
  TripDetailsCard,
  SentOffersCard,
  CommunicationCard,
  FinancialsCard,
  ChecklistCard,
  QuickActionsCard,
  NotesCard,
  AssignedAgentCard,
  defaultChecklistItems
} from '@/components/lead-detail'
import type { SentOffer, ChecklistItem } from '@/components/lead-detail'

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string
  const supabase = createClient()

  const { getLead, updateLead, archiveLead, loading } = useLeads()
  const { stages, teamMembers } = useOrganization()
  const { openChat } = useChat()

  // State
  const [lead, setLead] = useState<Lead | null>(null)
  const [sourceInquiry, setSourceInquiry] = useState<CustomInquiry | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [booking, setBooking] = useState<Booking | null>(null)
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string; authorName?: string }[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklistItems)
  const [sentOffers, setSentOffers] = useState<SentOffer[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Load all data
  useEffect(() => {
    async function loadData() {
      const leadData = await getLead(leadId)
      if (!leadData) return
      setLead(leadData)

      // Load source inquiry
      if (leadData.source_inquiry_id) {
        const { data: inquiryData } = await supabase
          .from('custom_inquiries')
          .select(`*, package:packages(id, name, hotel_name, destination_country, destination_city)`)
          .eq('id', leadData.source_inquiry_id)
          .single()

        if (inquiryData) {
          setSourceInquiry(inquiryData as CustomInquiry)
        }
      }

      // Load activities
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select(`*, user:users(id, email, full_name)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (activitiesData) {
        setActivities(activitiesData as LeadActivity[])

        // Extract notes from activities
        const noteActivities = (activitiesData as LeadActivity[])
          .filter((a: LeadActivity) => a.type === 'note' && a.description)
          .map((a: LeadActivity) => ({
            id: a.id,
            content: a.description!,
            createdAt: a.created_at,
            authorName: (a as any).user?.full_name || (a as any).user?.email
          }))
        setNotes(noteActivities)
      }

      // Load messages
      loadMessages()

      // Load booking if exists
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (bookingData) {
        setBooking(bookingData)
      }

      // Determine checklist state based on activities and lead state
      updateChecklistFromData(leadData, activitiesData || [])
    }

    loadData()
  }, [leadId, getLead])

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true)
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .limit(50)

    if (messagesData) {
      setMessages(messagesData)
    }
    setLoadingMessages(false)
  }, [leadId, supabase])

  // Update checklist based on actual stage name
  const updateChecklistFromData = (leadData: Lead, activities: LeadActivity[]) => {
    const currentStage = stages.find(s => s.id === leadData.stage_id)
    const stageName = currentStage?.name?.toLowerCase() || ''

    // Map stage names to checklist items that should be completed
    // When you're AT a stage, the previous steps should be complete
    const stageToCompletedItems: Record<string, string[]> = {
      'novi': [],
      'kontaktiran': [],
      'poslata ponuda': ['offer_sent'],
      'ponuda poslata': ['offer_sent'],
      'pregovori': ['offer_sent'],
      'rezervisano': ['offer_sent', 'offer_accepted'],
      'rezervacija': ['offer_sent', 'offer_accepted'],
      'uplaceno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'full_payment'],
      'plaćeno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'full_payment'],
      'placeno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'full_payment'],
      'zatvoreno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'full_payment', 'contract_signed', 'voucher_sent'],
      'završeno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'passports_collected', 'contract_signed', 'full_payment', 'voucher_sent', 'feedback_received'],
      'zavrseno': ['offer_sent', 'offer_accepted', 'deposit_paid', 'passports_collected', 'contract_signed', 'full_payment', 'voucher_sent', 'feedback_received'],
    }

    // Find matching stage (partial match)
    let completedItemIds: string[] = []
    for (const [key, items] of Object.entries(stageToCompletedItems)) {
      if (stageName.includes(key) || key.includes(stageName)) {
        completedItemIds = items
        break
      }
    }

    setChecklist(prev => prev.map(item => ({
      ...item,
      isCompleted: completedItemIds.includes(item.id)
    })))
  }

  // Get current and next stage
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const currentStageIndex = sortedStages.findIndex(s => s.id === lead?.stage_id)
  const currentStage = currentStageIndex >= 0 ? sortedStages[currentStageIndex] : null
  const nextStage = currentStageIndex >= 0 && currentStageIndex < sortedStages.length - 1
    ? sortedStages[currentStageIndex + 1]
    : null

  // Handlers
  const handleStageChange = async (stageId: string) => {
    if (!lead) return
    const updated = await updateLead(leadId, { stage_id: stageId })
    if (updated) {
      setLead(updated)
      // Refresh activities
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select(`*, user:users(id, email, full_name)`)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (activitiesData) {
        setActivities(activitiesData as LeadActivity[])
        updateChecklistFromData(updated, activitiesData)
      }
    }
  }

  const handleMoveToNextStage = async () => {
    if (nextStage) {
      await handleStageChange(nextStage.id)
    }
  }

  const handleArchive = async () => {
    if (!lead) return
    const updated = await archiveLead(leadId, !lead.is_archived)
    if (updated) {
      setLead(updated)
    }
  }

  const handleAddNote = async (content: string) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: activity } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id: userData.user.id,
        type: 'note',
        description: content
      })
      .select(`*, user:users(id, email, full_name)`)
      .single()

    if (activity) {
      setNotes(prev => [{
        id: activity.id,
        content: activity.description!,
        createdAt: activity.created_at,
        authorName: activity.user?.full_name || activity.user?.email
      }, ...prev])
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!lead?.email) return

    // Send via API
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        to: lead.email,
        subject: `Re: ${lead.name}`,
        body: content
      })
    })

    if (response.ok) {
      loadMessages()
    }
  }

  const handleToggleChecklistItem = (itemId: string, completed: boolean) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, isCompleted: completed } : item
    ))
  }

  const handleOpenChat = () => {
    if (lead) {
      openChat(lead.id)
    }
  }

  // Get qualification data
  const qualification = sourceInquiry?.qualification_data as QualificationData | null

  // Find assigned agent
  const assignedAgent = teamMembers.find(m => m.id === lead?.assigned_to) || null

  // Calculate financial values
  const totalValue = lead?.value || booking?.total_amount || 0
  const amountPaid = booking?.amount_paid || 0

  // Format messages for communication card
  const formattedMessages = messages.map(m => ({
    id: m.id,
    content: m.content || '',
    direction: m.direction as 'inbound' | 'outbound',
    senderName: m.direction === 'outbound' ? (m.sender_name || undefined) : undefined,
    sentAt: m.sent_at
  }))

  if (loading && !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Lead nije pronađen</p>
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            Nazad
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar - integrated into content flow */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Nazad
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-lg font-semibold text-gray-900">{lead.name}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {lead.id.substring(0, 8).toUpperCase()}
              </span>
              {lead.is_archived && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                  Arhivirano
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenChat}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Pošalji poruku
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Progress integrated into header card */}
        <PipelineProgress
          stages={sortedStages}
          currentStageId={lead.stage_id}
          onStageClick={handleStageChange}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <ClientInfoCard
              lead={lead}
              source={lead.source}
              originalMessage={sourceInquiry?.customer_note || lead.original_message}
            />

            {/* Trip Details */}
            <TripDetailsCard
              destination={lead.destination || qualification?.destination?.country}
              departureDate={lead.travel_date || qualification?.dates?.exactStart}
              qualification={qualification}
              booking={booking}
              hotelName={sourceInquiry?.package?.hotel_name}
            />

            {/* Sent Offers */}
            <SentOffersCard
              offers={sentOffers}
              onNewOffer={() => {/* TODO: Open offer modal */}}
            />

            {/* Communication */}
            <CommunicationCard
              messages={formattedMessages}
              leadName={lead.name}
              onSendMessage={lead.email ? handleSendMessage : undefined}
              onRefresh={loadMessages}
              onShowAll={handleOpenChat}
              isLoading={loadingMessages}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActionsCard
              currentStage={currentStage}
              nextStage={nextStage}
              onMoveToNextStage={nextStage ? handleMoveToNextStage : undefined}
              onSendMessage={handleOpenChat}
              onArchive={handleArchive}
              isArchived={lead.is_archived}
            />

            {/* Financials */}
            {totalValue > 0 && (
              <FinancialsCard
                totalValue={totalValue}
                amountPaid={amountPaid}
              />
            )}

            {/* Checklist */}
            <ChecklistCard
              items={checklist}
              onToggleItem={handleToggleChecklistItem}
            />

            {/* Assigned Agent */}
            <AssignedAgentCard
              agent={assignedAgent}
              onChangeAgent={() => {/* TODO: Open agent selector */}}
            />

            {/* Notes */}
            <NotesCard
              notes={notes}
              onAddNote={handleAddNote}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
