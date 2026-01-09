'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import { useOrganization } from './use-organization'
import type { Lead, PipelineStage } from '@/types'

interface UsePipelineReturn {
  stages: PipelineStage[]
  leadsByStage: Record<string, Lead[]>
  moveLeadToStage: (leadId: string, newStageId: string | null) => Promise<boolean>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePipeline(): UsePipelineReturn {
  const { organizationId } = useUser()
  const { stages } = useOrganization()
  const [leadsByStage, setLeadsByStage] = useState<Record<string, Lead[]>>({})
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

      // Fetch all leads for the organization
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          source:lead_sources(id, name),
          stage:pipeline_stages(id, name),
          assigned_user:users(id, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (leadsError) {
        setError(leadsError.message)
        return
      }

      // Group leads by stage_id
      const grouped: Record<string, Lead[]> = {}
      stages.forEach((stage) => {
        grouped[stage.id] = []
      })
      grouped['null'] = [] // For unassigned leads

      if (leadsData) {
        leadsData.forEach((lead) => {
          const stageId = lead.stage_id || 'null'
          if (!grouped[stageId]) {
            grouped[stageId] = []
          }
          grouped[stageId].push(lead as Lead)
        })
      }

      setLeadsByStage(grouped)
    } catch (err) {
      setError('Failed to fetch pipeline data')
    } finally {
      setLoading(false)
    }
  }, [supabase, organizationId, stages])

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
      let leadToMove: Lead | null = null
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

      // Set state once
      setLeadsByStage(newLeadsByStage)

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
    [supabase, organizationId, fetchLeads, leadsByStage]
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
