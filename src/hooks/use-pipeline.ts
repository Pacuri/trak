'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import { useOrganization } from './use-organization'
import type { Lead, PipelineStage } from '@/types'

// Extended lead type with pipeline card data
// Sent offer data for pipeline cards
export interface PipelineSentOffer {
  id: string
  destination: string | null
  package_name: string | null
  price_total: number | null
  duration_nights: number | null
  meal_plan: string | null
  guests_adults: number | null
  guests_children: number | null
  sent_at: string
}

export interface PipelineCardLead extends Lead {
  // Channel source derived from meta or messages
  channel_source?: 'messenger' | 'instagram' | 'whatsapp' | 'email' | 'web' | 'phone' | 'trak' | null
  // Last message from customer
  last_message_preview?: string | null
  last_message_at?: string | null
  has_unread_messages?: boolean
  // Most recent sent offer (for display)
  sent_offer_destination?: string | null
  // Full sent offer data
  sent_offer?: PipelineSentOffer | null
  // Package name for Trak leads
  package_name?: string | null
}

interface UsePipelineReturn {
  stages: PipelineStage[]
  leadsByStage: Record<string, PipelineCardLead[]>
  moveLeadToStage: (leadId: string, newStageId: string | null) => Promise<boolean>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePipeline(): UsePipelineReturn {
  const { organizationId } = useUser()
  const { stages } = useOrganization()
  const [leadsByStage, setLeadsByStage] = useState<Record<string, PipelineCardLead[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all leads for the organization (excluding archived)
      // Note: Using explicit foreign key reference for source_inquiry to avoid ambiguity
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          source:lead_sources(id, name),
          stage:pipeline_stages(id, name),
          assignee:users!assigned_to(id, email, full_name)
        `)
        .eq('organization_id', organizationId)
        .or('is_archived.is.null,is_archived.eq.false')
        .order('created_at', { ascending: false })

      if (leadsError) {
        setError(leadsError.message)
        return
      }

      if (!leadsData || leadsData.length === 0) {
        const grouped: Record<string, PipelineCardLead[]> = {}
        stages.forEach((stage) => {
          grouped[stage.id] = []
        })
        grouped['null'] = []
        setLeadsByStage(grouped)
        return
      }

      type LeadRow = { id: string; source_inquiry_id: string | null; stage_id: string }
      const leadIds = leadsData.map((l: LeadRow) => l.id)

      // Get source_inquiry_ids for package name lookup
      const sourceInquiryIds = leadsData
        .filter((l: LeadRow) => l.source_inquiry_id)
        .map((l: LeadRow) => l.source_inquiry_id)

      // Fetch meta conversations for channel source
      const { data: metaConversations } = await supabase
        .from('meta_conversations')
        .select('lead_id, platform')
        .in('lead_id', leadIds)

      // Fetch package names for Trak leads (via custom_inquiries -> packages)
      let packageNameByInquiryId = new Map<string, string>()
      if (sourceInquiryIds.length > 0) {
        const { data: inquiriesWithPackages } = await supabase
          .from('custom_inquiries')
          .select('id, package:packages(name)')
          .in('id', sourceInquiryIds)

        inquiriesWithPackages?.forEach((inq: { id: string; package?: { name: string } | null }) => {
          const pkgName = (inq as any).package?.name
          if (pkgName) {
            packageNameByInquiryId.set(inq.id, pkgName)
          }
        })
      }

      // Fetch last messages for each lead (from customer)
      const { data: messages } = await supabase
        .from('messages')
        .select('lead_id, content, channel, sent_at, is_from_customer, is_read')
        .in('lead_id', leadIds)
        .eq('is_from_customer', true)
        .order('sent_at', { ascending: false })

      // Fetch sent offers (most recent per lead) with full data
      const { data: sentOffers } = await supabase
        .from('lead_sent_offers')
        .select('id, lead_id, destination, package_name, price_total, duration_nights, meal_plan, guests_adults, guests_children, sent_at')
        .in('lead_id', leadIds)
        .order('sent_at', { ascending: false })

      // Create lookup maps
      const metaByLeadId = new Map<string, string>()
      type MetaConv = { lead_id: string; platform: string }
      metaConversations?.forEach((mc: MetaConv) => {
        if (!metaByLeadId.has(mc.lead_id)) {
          metaByLeadId.set(mc.lead_id, mc.platform)
        }
      })

      const lastMessageByLeadId = new Map<string, { content: string, channel: string, sent_at: string, is_read: boolean }>()
      const unreadByLeadId = new Map<string, boolean>()
      type MsgRow = { lead_id: string; content: string; channel: string; sent_at: string; is_read: boolean }
      messages?.forEach((msg: MsgRow) => {
        if (!lastMessageByLeadId.has(msg.lead_id)) {
          lastMessageByLeadId.set(msg.lead_id, {
            content: msg.content,
            channel: msg.channel,
            sent_at: msg.sent_at,
            is_read: msg.is_read
          })
        }
        // Check if any unread messages
        if (!msg.is_read) {
          unreadByLeadId.set(msg.lead_id, true)
        }
      })

      const sentOfferByLeadId = new Map<string, PipelineSentOffer>()
      type SentOfferRow = { id: string; lead_id: string; destination: string; package_name: string; price_total: number; duration_nights: number; meal_plan: string; guests_adults: number; guests_children: number; sent_at: string }
      sentOffers?.forEach((so: SentOfferRow) => {
        if (!sentOfferByLeadId.has(so.lead_id)) {
          sentOfferByLeadId.set(so.lead_id, {
            id: so.id,
            destination: so.destination,
            package_name: so.package_name,
            price_total: so.price_total,
            duration_nights: so.duration_nights,
            meal_plan: so.meal_plan,
            guests_adults: so.guests_adults,
            guests_children: so.guests_children,
            sent_at: so.sent_at,
          })
        }
      })

      // Derive channel source
      const deriveChannelSource = (lead: any): PipelineCardLead['channel_source'] => {
        // First check meta conversations
        const metaPlatform = metaByLeadId.get(lead.id)
        if (metaPlatform === 'messenger' || metaPlatform === 'facebook') return 'messenger'
        if (metaPlatform === 'instagram') return 'instagram'
        if (metaPlatform === 'whatsapp') return 'whatsapp'

        // Then check source_type
        const sourceType = lead.source_type?.toLowerCase()
        if (sourceType === 'email' || sourceType === 'gmail') return 'email'
        if (sourceType === 'messenger' || sourceType === 'facebook') return 'messenger'
        if (sourceType === 'instagram') return 'instagram'
        if (sourceType === 'whatsapp') return 'whatsapp'
        if (sourceType === 'phone') return 'phone'
        if (sourceType === 'trak') return 'trak'
        if (sourceType === 'web' || sourceType === 'website') return 'web'

        // Check last message channel
        const lastMsg = lastMessageByLeadId.get(lead.id)
        if (lastMsg?.channel) {
          const ch = lastMsg.channel.toLowerCase()
          if (ch === 'email') return 'email'
          if (ch === 'messenger' || ch === 'facebook') return 'messenger'
          if (ch === 'instagram') return 'instagram'
          if (ch === 'whatsapp') return 'whatsapp'
        }

        return 'web'
      }

      // Group leads by stage_id with enhanced data
      const grouped: Record<string, PipelineCardLead[]> = {}
      stages.forEach((stage) => {
        grouped[stage.id] = []
      })
      grouped['null'] = [] // For unassigned leads

      leadsData.forEach((lead: any) => {
        const stageId = lead.stage_id || 'null'
        if (!grouped[stageId]) {
          grouped[stageId] = []
        }

        const lastMsg = lastMessageByLeadId.get(lead.id)

        // Get package name from source inquiry if available (via separate lookup)
        const packageName = lead.source_inquiry_id
          ? packageNameByInquiryId.get(lead.source_inquiry_id) || null
          : null
        const sentOffer = sentOfferByLeadId.get(lead.id) || null

        const enhancedLead: PipelineCardLead = {
          ...(lead as Lead),
          channel_source: deriveChannelSource(lead),
          last_message_preview: lastMsg?.content || lead.original_message || null,
          last_message_at: lastMsg?.sent_at || lead.created_at,
          has_unread_messages: unreadByLeadId.get(lead.id) || false,
          sent_offer_destination: sentOffer?.destination || null,
          sent_offer: sentOffer,
          package_name: packageName,
        }

        grouped[stageId].push(enhancedLead)
      })

      setLeadsByStage(grouped)
    } catch (err) {
      console.error('Pipeline fetch error:', err)
      setError('Failed to fetch pipeline data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, stages])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const moveLeadToStage = useCallback(
    async (leadId: string, newStageId: string | null): Promise<boolean> => {
      if (!organizationId) {
        setError('Organization not found')
        return false
      }

      // Store original state for rollback
      const originalLeadsByStage = { ...leadsByStage }

      // Find the lead in current state
      let leadToMove: PipelineCardLead | null = null
      let oldStageId: string | null = null
      for (const stageId in leadsByStage) {
        const lead = leadsByStage[stageId].find(l => l.id === leadId)
        if (lead) {
          leadToMove = lead
          oldStageId = stageId === 'null' ? null : stageId
          break
        }
      }

      if (!leadToMove) {
        setError('Lead not found')
        return false
      }

      const newStageIdKey = newStageId || 'null'
      const oldStageIdKey = oldStageId || 'null'

      // 1. UPDATE LOCAL STATE SYNCHRONOUSLY (compute new state, then set it once)
      const newLeadsByStage = { ...leadsByStage }

      // Remove from old stage
      if (newLeadsByStage[oldStageIdKey]) {
        newLeadsByStage[oldStageIdKey] = newLeadsByStage[oldStageIdKey].filter(l => l.id !== leadId)
      }

      // Ensure new stage array exists
      if (!newLeadsByStage[newStageIdKey]) {
        newLeadsByStage[newStageIdKey] = []
      }

      // Update lead's stage_id and add to new stage
      const updatedLead = { ...leadToMove!, stage_id: newStageId }
      newLeadsByStage[newStageIdKey] = [...newLeadsByStage[newStageIdKey], updatedLead]

      // Defer state update to allow drag library to finish cleanup
      requestAnimationFrame(() => {
        // Set state once
        setLeadsByStage(newLeadsByStage)
      })

      // 2. UPDATE DATABASE IN BACKGROUND (don't await before state update)
      try {
        // Get current user for activity logging
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          throw new Error('User not authenticated')
        }

        // Update lead stage
        const { error: updateError } = await supabase
          .from('leads')
          .update({ stage_id: newStageId })
          .eq('id', leadId)
          .eq('organization_id', organizationId)

        if (updateError) {
          throw updateError
        }

        // Log activity (don't block on this - fire and forget)
        const { error: activityError } = await supabase.from('lead_activities').insert({
          lead_id: leadId,
          user_id: authUser.id,
          type: 'stage_changed',
          description: 'Stage changed',
          metadata: {
            old_stage_id: oldStageId,
            new_stage_id: newStageId
          }
        });

        if (activityError) {
          console.error('Failed to log activity:', activityError);
        }

        return true
      } catch (err: any) {
        // 3. REVERT ON ERROR - refetch data
        console.error('Failed to update lead:', err)
        setError(err.message || 'Failed to move lead')
        setLeadsByStage(originalLeadsByStage)
        await fetchLeads()
        return false
      }
    },
    [organizationId, fetchLeads, leadsByStage] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    stages,
    leadsByStage,
    moveLeadToStage,
    loading,
    error,
    refresh: fetchLeads,
  }
}
