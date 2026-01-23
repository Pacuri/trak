'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Lead, LeadActivity } from '@/types'

export interface LeadFilters {
  stage_id?: string
  source_id?: string
  assigned_to?: string
  show_archived?: boolean
  only_won?: boolean // Only show leads in "won/closed" stages
}

export interface CreateLeadData {
  name: string
  phone?: string
  email?: string
  source_id?: string
  stage_id?: string | null
  assigned_to?: string | null
  destination?: string
  travel_date?: string
  guests?: number
  budget?: number
  value?: number
  notes?: string
  original_message?: string
  organization_id?: string
}

export function useLeads() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { organizationId } = useUser()

  const getLeads = useCallback(
    async (filters?: LeadFilters): Promise<Lead[]> => {
      if (!organizationId) {
        setError('Organization not found')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        // If filtering for only won leads, first get won stage IDs
        let wonStageIds: string[] = []
        if (filters?.only_won) {
          const { data: wonStages } = await supabase
            .from('pipeline_stages')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('is_won', true)
          wonStageIds = wonStages?.map(s => s.id) || []

          // If no won stages found, return empty (no customers yet)
          if (wonStageIds.length === 0) {
            setLoading(false)
            return []
          }
        }

        let query = supabase
          .from('leads')
          .select(`
            *,
            source:lead_sources(id, name),
            stage:pipeline_stages(id, name),
            assignee:users!assigned_to(id, email, full_name)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })

        if (filters?.stage_id) {
          query = query.eq('stage_id', filters.stage_id)
        }
        if (filters?.source_id) {
          query = query.eq('source_id', filters.source_id)
        }
        if (filters?.assigned_to) {
          query = query.eq('assigned_to', filters.assigned_to)
        }

        // Filter for only won/closed leads (actual customers)
        if (filters?.only_won && wonStageIds.length > 0) {
          query = query.in('stage_id', wonStageIds)
        }

        // By default, hide archived leads unless explicitly requested
        if (!filters?.show_archived) {
          query = query.or('is_archived.is.null,is_archived.eq.false')
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          return []
        }

        return (data as Lead[]) || []
      } catch (err) {
        setError('Failed to fetch leads')
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const getLead = useCallback(
    async (id: string): Promise<Lead | null> => {
      if (!organizationId) {
        setError('Organization not found')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('leads')
          .select(`
            *,
            source:lead_sources(id, name),
            stage:pipeline_stages(id, name),
            assignee:users!assigned_to(id, email, full_name)
          `)
          .eq('id', id)
          .eq('organization_id', organizationId)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          return null
        }

        return data as Lead
      } catch (err) {
        setError('Failed to fetch lead')
        return null
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const createLead = useCallback(
    async (data: CreateLeadData): Promise<Lead | null> => {
      if (!organizationId) {
        setError('Organization not found')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        // Get current user for activity logging
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('User not authenticated')
          return null
        }

        // Include organization_id and auto-assign to current user
        const insertData = {
          ...data,
          organization_id: organizationId,
          assigned_to: authUser.id, // Auto-assign to creator
        }

        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert(insertData)
          .select(`
            *,
            source:lead_sources(id, name),
            stage:pipeline_stages(id, name),
            assigned_user:users(id, email)
          `)
          .single()

        if (createError) {
          setError(createError.message)
          return null
        }

        // Log 'created' activity
        if (newLead) {
          await supabase.from('lead_activities').insert({
            lead_id: newLead.id,
            user_id: authUser.id,
            type: 'created',
            description: 'Lead created',
          })
        }

        return newLead as Lead
      } catch (err) {
        setError('Failed to create lead')
        return null
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const updateLead = useCallback(
    async (id: string, data: Partial<CreateLeadData>): Promise<Lead | null> => {
      if (!organizationId) {
        setError('Organization not found')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        // Get current user for activity logging
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('User not authenticated')
          return null
        }

        // Get current lead to compare changes
        const { data: currentLead } = await supabase
          .from('leads')
          .select('stage_id, assigned_to')
          .eq('id', id)
          .eq('organization_id', organizationId)
          .single()

        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update(data)
          .eq('id', id)
          .eq('organization_id', organizationId)
          .select(`
            *,
            source:lead_sources(id, name),
            stage:pipeline_stages(id, name),
            assignee:users!assigned_to(id, email, full_name)
          `)
          .single()

        if (updateError) {
          setError(updateError.message)
          return null
        }

        // Log activities for changes
        if (currentLead && updatedLead) {
          if (data.stage_id !== undefined && data.stage_id !== currentLead.stage_id) {
            await supabase.from('lead_activities').insert({
              lead_id: id,
              user_id: authUser.id,
              type: 'stage_changed',
              description: `Stage changed`,
              metadata: { old_stage_id: currentLead.stage_id, new_stage_id: data.stage_id },
            })
          }

          if (data.assigned_to !== undefined && data.assigned_to !== currentLead.assigned_to) {
            await supabase.from('lead_activities').insert({
              lead_id: id,
              user_id: authUser.id,
              type: 'assigned',
              description: `Assignment changed`,
              metadata: {
                old_assigned_to: currentLead.assigned_to,
                new_assigned_to: data.assigned_to,
              },
            })
          }
        }

        return updatedLead as Lead
      } catch (err) {
        setError('Failed to update lead')
        return null
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const deleteLead = useCallback(
    async (id: string): Promise<boolean> => {
      if (!organizationId) {
        setError('Organization not found')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .eq('id', id)
          .eq('organization_id', organizationId)

        if (deleteError) {
          setError(deleteError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Failed to delete lead')
        return false
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const archiveLead = useCallback(
    async (id: string, archive: boolean = true): Promise<Lead | null> => {
      if (!organizationId) {
        setError('Organization not found')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('User not authenticated')
          return null
        }

        const updateData = archive
          ? { is_archived: true, archived_at: new Date().toISOString() }
          : { is_archived: false, archived_at: null }

        const { data: updatedLead, error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', id)
          .eq('organization_id', organizationId)
          .select(`
            *,
            source:lead_sources(id, name),
            stage:pipeline_stages(id, name),
            assignee:users!assigned_to(id, email, full_name)
          `)
          .single()

        if (updateError) {
          setError(updateError.message)
          return null
        }

        // Log activity
        await supabase.from('lead_activities').insert({
          lead_id: id,
          user_id: authUser.id,
          type: archive ? 'archived' : 'unarchived',
          description: archive ? 'Lead arhiviran' : 'Lead vraćen iz arhive',
        })

        return updatedLead as Lead
      } catch (err) {
        setError('Failed to archive lead')
        return null
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const addActivity = useCallback(
    async (
      leadId: string,
      type: string,
      description: string,
      metadata?: Record<string, any>
    ): Promise<LeadActivity | null> => {
      if (!organizationId) {
        setError('Organization not found')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        // Get current user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('User not authenticated')
          return null
        }

        // Verify lead belongs to organization
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('id', leadId)
          .eq('organization_id', organizationId)
          .single()

        if (!lead) {
          setError('Lead not found')
          return null
        }

        const { data: activity, error: activityError } = await supabase
          .from('lead_activities')
          .insert({
            lead_id: leadId,
            user_id: authUser.id,
            type,
            description,
            metadata: metadata || {},
          })
          .select(`
            *,
            user:users(id, email, full_name)
          `)
          .single()

        if (activityError) {
          setError(activityError.message)
          return null
        }

        return activity as LeadActivity
      } catch (err) {
        setError('Failed to add activity')
        return null
      } finally {
        setLoading(false)
      }
    },
    [organizationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    loading,
    error,
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    archiveLead,
    addActivity,
  }
}
