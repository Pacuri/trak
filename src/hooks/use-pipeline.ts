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

      try {
        // Get current user for activity logging
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('User not authenticated')
          return false
        }

        // Get current lead to check stage
        const { data: currentLead } = await supabase
          .from('leads')
          .select('stage_id')
          .eq('id', leadId)
          .eq('organization_id', organizationId)
          .single()

        if (!currentLead) {
          setError('Lead not found')
          return false
        }

        // Update lead stage
        const { error: updateError } = await supabase
          .from('leads')
          .update({ stage_id: newStageId })
          .eq('id', leadId)
          .eq('organization_id', organizationId)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        // Log activity
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          user_id: authUser.id,
          type: 'stage_changed',
          description: 'Stage changed',
          metadata: { old_stage_id: currentLead.stage_id, new_stage_id: newStageId },
        })

        // Refresh leads
        await fetchLeads()

        return true
      } catch (err) {
        setError('Failed to move lead')
        return false
      }
    },
    [supabase, organizationId, fetchLeads]
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
