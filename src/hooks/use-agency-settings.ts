'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AgencyBookingSettings, WorkingHours, DaySchedule } from '@/types'

interface UseAgencySettingsReturn {
  settings: AgencyBookingSettings | null
  loading: boolean
  error: string | null
  isWithinWorkingHours: boolean
  currentResponseTime: number // minutes
  refetch: () => Promise<void>
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: true, start: '09:00', end: '14:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' },
}

export function useAgencySettings(slug: string): UseAgencySettingsReturn {
  const [settings, setSettings] = useState<AgencyBookingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    if (!slug) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('agency_booking_settings')
        .select('*')
        .eq('slug', slug)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Agencija nije pronađena')
        } else {
          setError(fetchError.message)
        }
        setSettings(null)
      } else {
        setSettings(data as AgencyBookingSettings)
      }
    } catch (err) {
      setError('Greška pri učitavanju podešavanja')
      setSettings(null)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Calculate if currently within working hours
  const isWithinWorkingHours = useCallback((): boolean => {
    if (!settings) return false

    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const currentDay = dayNames[now.getDay()]
    
    const workingHours = (settings.working_hours || DEFAULT_WORKING_HOURS) as WorkingHours
    const todaySchedule = workingHours[currentDay]

    if (!todaySchedule?.enabled) return false

    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startHour, startMin] = todaySchedule.start.split(':').map(Number)
    const [endHour, endMin] = todaySchedule.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    return currentTime >= startTime && currentTime <= endTime
  }, [settings])

  // Calculate current response time based on working hours
  const getCurrentResponseTime = useCallback((): number => {
    if (!settings) return 60 // Default 1 hour
    
    if (isWithinWorkingHours()) {
      return settings.response_time_working || 30
    } else {
      return settings.response_time_outside || 240
    }
  }, [settings, isWithinWorkingHours])

  return {
    settings,
    loading,
    error,
    isWithinWorkingHours: isWithinWorkingHours(),
    currentResponseTime: getCurrentResponseTime(),
    refetch: fetchSettings,
  }
}
