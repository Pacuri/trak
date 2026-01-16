'use client'

import { useState, useCallback } from 'react'
import type { AgencyLandingSettings } from '@/types/landing'
import type { AgencyInquirySettings } from '@/types/inquiry'

export interface CombinedLandingSettings {
  landing: AgencyLandingSettings
  inquiry: AgencyInquirySettings
  slug: string | null
}

interface UseLandingSettingsReturn {
  settings: CombinedLandingSettings | null
  loading: boolean
  saving: boolean
  error: string | null
  fetchSettings: (orgId: string) => Promise<CombinedLandingSettings | null>
  saveSettings: (orgId: string, data: Partial<CombinedLandingSettings>) => Promise<boolean>
}

export function useLandingSettings(): UseLandingSettingsReturn {
  const [settings, setSettings] = useState<CombinedLandingSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async (orgId: string): Promise<CombinedLandingSettings | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/agencies/${orgId}/landing-settings`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Greška pri učitavanju podešavanja')
      }

      const data = await response.json()
      setSettings(data)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri učitavanju podešavanja'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (
    orgId: string, 
    data: Partial<CombinedLandingSettings>
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/agencies/${orgId}/landing-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || 'Greška pri čuvanju podešavanja')
      }

      const updatedData = await response.json()
      setSettings(updatedData)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greška pri čuvanju podešavanja'
      setError(message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    settings,
    loading,
    saving,
    error,
    fetchSettings,
    saveSettings,
  }
}
