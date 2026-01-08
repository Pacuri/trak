'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Organization, PipelineStage, LeadSource, User } from '@/types'

interface UseOrganizationReturn {
  organization: Organization | null
  stages: PipelineStage[]
  sources: LeadSource[]
  teamMembers: User[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useOrganization(): UseOrganizationReturn {
  const { organizationId } = useUser()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [sources, setSources] = useState<LeadSource[]>([])
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrganization = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch organization, stages, sources, and team members in parallel
      const [orgRes, stagesRes, sourcesRes, teamRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', organizationId).single(),
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('organization_id', organizationId)
          .order('position'),
        supabase
          .from('lead_sources')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true),
        supabase
          .from('users')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true),
      ])

      if (orgRes.error) {
        setError(orgRes.error.message)
        return
      }

      if (stagesRes.error) {
        setError(stagesRes.error.message)
        return
      }

      if (sourcesRes.error) {
        setError(sourcesRes.error.message)
        return
      }

      if (teamRes.error) {
        setError(teamRes.error.message)
        return
      }

      setOrganization(orgRes.data as Organization)
      setStages((stagesRes.data as PipelineStage[]) || [])
      setSources((sourcesRes.data as LeadSource[]) || [])
      setTeamMembers((teamRes.data as User[]) || [])
    } catch (err) {
      setError('Failed to fetch organization data')
    } finally {
      setLoading(false)
    }
  }, [supabase, organizationId])

  useEffect(() => {
    fetchOrganization()
  }, [fetchOrganization])

  return {
    organization,
    stages,
    sources,
    teamMembers,
    loading,
    error,
    refresh: fetchOrganization,
  }
}
