'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { OfferInquiry, InquiryStatus } from '@/types'

export interface InquiryFilters {
  status?: InquiryStatus
  offer_id?: string
  responded_by?: string
}

export function useInquiries() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { user } = useUser()

  const getInquiries = useCallback(
    async (filters?: InquiryFilters): Promise<OfferInquiry[]> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('offer_inquiries')
          .select(`
            *,
            offer:offers(id, name, country, city, departure_date, return_date, price_per_person, inventory_type),
            responder:users!responded_by(id, email, full_name),
            alternative_offer:offers!alternative_offer_id(id, name, country, departure_date)
          `)
          .eq('organization_id', user?.organization_id)
          .order('created_at', { ascending: false })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.offer_id) {
          query = query.eq('offer_id', filters.offer_id)
        }
        if (filters?.responded_by) {
          query = query.eq('responded_by', filters.responded_by)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          return []
        }

        return (data as OfferInquiry[]) || []
      } catch (err) {
        setError('Greška pri učitavanju upita')
        return []
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const getInquiry = useCallback(
    async (id: string): Promise<OfferInquiry | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('offer_inquiries')
          .select(`
            *,
            offer:offers(*),
            responder:users!responded_by(id, email, full_name),
            alternative_offer:offers!alternative_offer_id(*)
          `)
          .eq('id', id)
          .eq('organization_id', user?.organization_id)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          return null
        }

        return data as OfferInquiry
      } catch (err) {
        setError('Greška pri učitavanju upita')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const markAsAvailable = useCallback(
    async (id: string, note?: string): Promise<boolean> => {
      if (!user?.organization_id || !user?.id) {
        setError('Niste prijavljeni')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('offer_inquiries')
          .update({
            status: 'available',
            responded_by: user?.id,
            responded_at: new Date().toISOString(),
            response_note: note || null,
          })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri ažuriranju upita')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const markAsUnavailable = useCallback(
    async (id: string, note?: string): Promise<boolean> => {
      if (!user?.organization_id || !user?.id) {
        setError('Niste prijavljeni')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('offer_inquiries')
          .update({
            status: 'unavailable',
            responded_by: user?.id,
            responded_at: new Date().toISOString(),
            response_note: note || null,
          })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri ažuriranju upita')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const markAsAlternative = useCallback(
    async (id: string, alternativeOfferId: string, note?: string): Promise<boolean> => {
      if (!user?.organization_id || !user?.id) {
        setError('Niste prijavljeni')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('offer_inquiries')
          .update({
            status: 'alternative',
            responded_by: user?.id,
            responded_at: new Date().toISOString(),
            response_note: note || null,
            alternative_offer_id: alternativeOfferId,
          })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri ažuriranju upita')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const getStats = useCallback(
    async (): Promise<{ pending: number; checking: number; responded: number; total: number }> => {
      if (!user?.organization_id) return { pending: 0, checking: 0, responded: 0, total: 0 }

      try {
        const { data } = await supabase
          .from('offer_inquiries')
          .select('status')
          .eq('organization_id', user?.organization_id)

        if (!data) return { pending: 0, checking: 0, responded: 0, total: 0 }

        type InquiryStatus = { status: string }
        return {
          pending: data.filter((i: InquiryStatus) => i.status === 'pending').length,
          checking: data.filter((i: InquiryStatus) => i.status === 'checking').length,
          responded: data.filter((i: InquiryStatus) => ['available', 'unavailable', 'alternative'].includes(i.status)).length,
          total: data.length,
        }
      } catch {
        return { pending: 0, checking: 0, responded: 0, total: 0 }
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    loading,
    error,
    getInquiries,
    getInquiry,
    markAsAvailable,
    markAsUnavailable,
    markAsAlternative,
    getStats,
  }
}
