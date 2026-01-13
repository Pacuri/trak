'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Booking, BookingStatus } from '@/types'

export interface BookingFilters {
  status?: BookingStatus
  offer_id?: string
  travel_date_from?: string
  travel_date_to?: string
  closed_by?: string
  search?: string
}

export interface CreateBookingData {
  lead_id?: string
  offer_id?: string
  reservation_id?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  adults: number
  children?: number
  child_ages?: number[]
  total_amount: number
  amount_paid?: number
  currency?: string
  payment_method?: 'card' | 'bank' | 'cash' | 'mixed'
  is_external?: boolean
  external_destination?: string
  external_accommodation?: string
  external_dates?: string
  external_value?: number
  travel_date?: string
  return_date?: string
}

export function useBookings() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { user } = useUser()

  const getBookings = useCallback(
    async (filters?: BookingFilters): Promise<Booking[]> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('bookings')
          .select(`
            *,
            offer:offers(id, name, country, city, departure_date, return_date),
            lead:leads(id, name, email, phone),
            closer:users!closed_by(id, email, full_name)
          `)
          .eq('organization_id', user.organization_id)
          .order('booked_at', { ascending: false })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.offer_id) {
          query = query.eq('offer_id', filters.offer_id)
        }
        if (filters?.closed_by) {
          query = query.eq('closed_by', filters.closed_by)
        }
        if (filters?.travel_date_from) {
          query = query.gte('travel_date', filters.travel_date_from)
        }
        if (filters?.travel_date_to) {
          query = query.lte('travel_date', filters.travel_date_to)
        }
        if (filters?.search) {
          query = query.or(`customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          return []
        }

        return (data as Booking[]) || []
      } catch (err) {
        setError('Greška pri učitavanju aranžmana')
        return []
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const getBooking = useCallback(
    async (id: string): Promise<Booking | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            offer:offers(*),
            lead:leads(*),
            reservation:reservations(*),
            closer:users!closed_by(id, email, full_name)
          `)
          .eq('id', id)
          .eq('organization_id', user.organization_id)
          .single()

        if (fetchError) {
          setError(fetchError.message)
          return null
        }

        return data as Booking
      } catch (err) {
        setError('Greška pri učitavanju aranžmana')
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const createBooking = useCallback(
    async (data: CreateBookingData): Promise<Booking | null> => {
      if (!user?.organization_id || !user?.id) {
        setError('Niste prijavljeni')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const insertData = {
          ...data,
          organization_id: user.organization_id,
          closed_by: user.id,
          currency: data.currency || 'EUR',
          amount_paid: data.amount_paid || 0,
          children: data.children || 0,
          payment_status: (data.amount_paid || 0) >= data.total_amount ? 'paid' : (data.amount_paid || 0) > 0 ? 'partial' : 'unpaid',
          status: 'confirmed',
          booked_at: new Date().toISOString(),
        }

        const { data: newBooking, error: createError } = await supabase
          .from('bookings')
          .insert(insertData)
          .select(`
            *,
            offer:offers(id, name, country, city, departure_date, return_date),
            lead:leads(id, name, email, phone)
          `)
          .single()

        if (createError) {
          setError(createError.message)
          return null
        }

        // Update offer capacity if linked to an offer
        if (data.offer_id && newBooking) {
          const guestCount = data.adults + (data.children || 0)
          await supabase.rpc('decrement_offer_spots', {
            p_offer_id: data.offer_id,
            p_spots: guestCount,
          })
        }

        // Update lead stage if linked
        if (data.lead_id && newBooking) {
          // Get won stage
          const { data: wonStage } = await supabase
            .from('pipeline_stages')
            .select('id')
            .eq('organization_id', user.organization_id)
            .eq('is_won', true)
            .single()

          if (wonStage) {
            await supabase
              .from('leads')
              .update({ 
                stage_id: wonStage.id,
                closed_at: new Date().toISOString(),
                value: data.total_amount,
              })
              .eq('id', data.lead_id)
          }
        }

        return newBooking as Booking
      } catch (err) {
        setError('Greška pri kreiranju aranžmana')
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const cancelBooking = useCallback(
    async (id: string, reason: string, refundAmount?: number): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        // Get booking first to restore capacity
        const { data: booking } = await supabase
          .from('bookings')
          .select('offer_id, adults, children')
          .eq('id', id)
          .eq('organization_id', user.organization_id)
          .single()

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: reason,
            refund_amount: refundAmount || 0,
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('organization_id', user.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        // Restore offer capacity if linked
        if (booking?.offer_id) {
          const guestCount = booking.adults + (booking.children || 0)
          await supabase.rpc('increment_offer_spots', {
            p_offer_id: booking.offer_id,
            p_spots: guestCount,
          })
        }

        return true
      } catch (err) {
        setError('Greška pri otkazivanju aranžmana')
        return false
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const getBookingsByTravelDate = useCallback(
    async (): Promise<Record<string, Booking[]>> => {
      if (!user?.organization_id) return {}

      try {
        const { data } = await supabase
          .from('bookings')
          .select(`
            *,
            offer:offers(id, name, country, city, departure_date, return_date),
            lead:leads(id, name, email, phone)
          `)
          .eq('organization_id', user.organization_id)
          .eq('status', 'confirmed')
          .not('travel_date', 'is', null)
          .order('travel_date', { ascending: true })

        if (!data) return {}

        // Group by travel_date
        const grouped: Record<string, Booking[]> = {}
        for (const booking of data as Booking[]) {
          const date = booking.travel_date!
          if (!grouped[date]) {
            grouped[date] = []
          }
          grouped[date].push(booking)
        }

        return grouped
      } catch {
        return {}
      }
    },
    [supabase, user]
  )

  const getStats = useCallback(
    async (): Promise<{ confirmed: number; cancelled: number; totalRevenue: number }> => {
      if (!user?.organization_id) return { confirmed: 0, cancelled: 0, totalRevenue: 0 }

      try {
        const { data } = await supabase
          .from('bookings')
          .select('status, total_amount')
          .eq('organization_id', user.organization_id)

        if (!data) return { confirmed: 0, cancelled: 0, totalRevenue: 0 }

        const confirmed = data.filter(b => b.status === 'confirmed')
        return {
          confirmed: confirmed.length,
          cancelled: data.filter(b => b.status === 'cancelled').length,
          totalRevenue: confirmed.reduce((sum, b) => sum + b.total_amount, 0),
        }
      } catch {
        return { confirmed: 0, cancelled: 0, totalRevenue: 0 }
      }
    },
    [supabase, user]
  )

  return {
    loading,
    error,
    getBookings,
    getBooking,
    createBooking,
    cancelBooking,
    getBookingsByTravelDate,
    getStats,
  }
}
