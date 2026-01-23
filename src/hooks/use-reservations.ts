'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Reservation, ReservationStatus } from '@/types'

export interface ReservationFilters {
  status?: ReservationStatus
  offer_id?: string
  from_date?: string
  to_date?: string
  search?: string
}

export function useReservations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { user } = useUser()

  const getReservations = useCallback(
    async (filters?: ReservationFilters): Promise<Reservation[]> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('reservations')
          .select(`
            *,
            offer:offers(id, name, country, city, departure_date, return_date, price_per_person),
            lead:leads(id, name, email, phone)
          `)
          .eq('organization_id', user?.organization_id)
          .order('created_at', { ascending: false })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.offer_id) {
          query = query.eq('offer_id', filters.offer_id)
        }
        if (filters?.from_date) {
          query = query.gte('created_at', filters.from_date)
        }
        if (filters?.to_date) {
          query = query.lte('created_at', filters.to_date)
        }
        if (filters?.search) {
          query = query.or(`customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          return []
        }

        return (data as Reservation[]) || []
      } catch (err) {
        setError('Greška pri učitavanju rezervacija')
        return []
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const getReservation = useCallback(
    async (id: string): Promise<Reservation | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('reservations')
          .select(`
            *,
            offer:offers(*),
            lead:leads(*)
          `)
          .eq('id', id)
          .eq('organization_id', user?.organization_id)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          return null
        }

        return data as Reservation
      } catch (err) {
        setError('Greška pri učitavanju rezervacije')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const updateReservationStatus = useCallback(
    async (id: string, status: ReservationStatus, additionalData?: Partial<Reservation>): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const updateData: Record<string, unknown> = { status, ...additionalData }
        
        if (status === 'paid') {
          updateData.paid_at = new Date().toISOString()
        } else if (status === 'cancelled') {
          updateData.cancelled_at = new Date().toISOString()
        } else if (status === 'expired') {
          updateData.expired_at = new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('reservations')
          .update(updateData)
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri ažuriranju rezervacije')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const recordPayment = useCallback(
    async (id: string, amount: number): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        // Get current reservation
        const { data: reservation } = await supabase
          .from('reservations')
          .select('amount_paid, total_price')
          .eq('id', id)
          .eq('organization_id', user?.organization_id)
          .single()

        if (!reservation) {
          setError('Rezervacija nije pronađena')
          return false
        }

        const newAmountPaid = (reservation.amount_paid || 0) + amount
        const isPaid = newAmountPaid >= reservation.total_price

        const { error: updateError } = await supabase
          .from('reservations')
          .update({
            amount_paid: newAmountPaid,
            status: isPaid ? 'paid' : 'pending',
            paid_at: isPaid ? new Date().toISOString() : null,
          })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri unosu uplate')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const getStats = useCallback(
    async (): Promise<{ pending: number; paid: number; expired: number; total: number }> => {
      if (!user?.organization_id) return { pending: 0, paid: 0, expired: 0, total: 0 }

      try {
        const { data } = await supabase
          .from('reservations')
          .select('status')
          .eq('organization_id', user?.organization_id)

        if (!data) return { pending: 0, paid: 0, expired: 0, total: 0 }

        type ReservationStatus = { status: string }
        return {
          pending: data.filter((r: ReservationStatus) => r.status === 'pending').length,
          paid: data.filter((r: ReservationStatus) => r.status === 'paid').length,
          expired: data.filter((r: ReservationStatus) => r.status === 'expired').length,
          total: data.length,
        }
      } catch {
        return { pending: 0, paid: 0, expired: 0, total: 0 }
      }
    },
    [user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    loading,
    error,
    getReservations,
    getReservation,
    updateReservationStatus,
    recordPayment,
    getStats,
  }
}
