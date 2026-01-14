'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { Offer, OfferImage } from '@/types'

export interface OfferFilters {
  status?: 'active' | 'sold_out' | 'archived'
  inventory_type?: 'owned' | 'inquiry'
  country?: string
  search?: string
  departure_from?: string
  departure_to?: string
}

export interface CreateOfferData {
  name: string
  description?: string
  star_rating?: number
  country: string
  city?: string
  departure_date: string
  return_date: string
  price_per_person: number
  original_price?: number
  currency?: string
  total_spots: number
  available_spots?: number
  accommodation_type?: string
  board_type?: string
  transport_type?: string
  inventory_type?: 'owned' | 'inquiry'
  is_recommended?: boolean
  status?: 'active' | 'sold_out' | 'archived'
}

export function useOffers() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { user } = useUser()

  const getOffers = useCallback(
    async (filters?: OfferFilters): Promise<Offer[]> => {
      // Explicit validation - don't execute if user is not loaded or doesn't have organization_id
      if (!user || !user.organization_id) {
        console.log('getOffers: User not ready', { hasUser: !!user, orgId: user?.organization_id })
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        console.log('getOffers: Executing query', { orgId: user.organization_id, filters })
        
        let query = supabase
          .from('offers')
          .select(`
            *,
            images:offer_images(id, url, position)
          `)
          .eq('organization_id', user.organization_id)
          .order('departure_date', { ascending: true })

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        // If no status filter, return all offers (needed for stats)
        if (filters?.inventory_type) {
          query = query.eq('inventory_type', filters.inventory_type)
        }
        if (filters?.country) {
          query = query.eq('country', filters.country)
        }
        if (filters?.departure_from) {
          query = query.gte('departure_date', filters.departure_from)
        }
        if (filters?.departure_to) {
          query = query.lte('departure_date', filters.departure_to)
        }
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,country.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          console.error('Error fetching offers:', fetchError)
          setError(fetchError.message)
          return []
        }

        console.log('Fetched offers:', data?.length || 0, 'offers')
        return (data as Offer[]) || []
      } catch (err) {
        setError('Greška pri učitavanju ponuda')
        return []
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const getOffer = useCallback(
    async (id: string): Promise<Offer | null> => {
      // Explicit validation - don't execute if user is not loaded or doesn't have organization_id
      if (!user || !user.organization_id) {
        console.log('getOffer: User not ready', { hasUser: !!user, orgId: user?.organization_id, offerId: id })
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        console.log('getOffer: Executing query', { 
          offerId: id,
          orgId: user.organization_id 
        })
        
        const { data, error: fetchError } = await supabase
          .from('offers')
          .select(`
            *,
            images:offer_images(id, url, position)
          `)
          .eq('id', id)
          .eq('organization_id', user.organization_id)
          .single()

        if (fetchError) {
          console.error('Error fetching offer:', fetchError)
          setError(fetchError.message)
          return null
        }

        console.log('Fetched offer:', data?.id)
        return data as Offer
      } catch (err) {
        setError('Greška pri učitavanju ponude')
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const createOffer = useCallback(
    async (data: CreateOfferData, images?: { url: string; is_primary?: boolean }[]): Promise<Offer | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const insertData = {
          ...data,
          organization_id: user?.organization_id,
          available_spots: data.available_spots ?? data.total_spots,
          currency: data.currency || 'EUR',
          inventory_type: data.inventory_type || 'owned',
          status: data.status || 'active',
        }

        const { data: newOffer, error: createError } = await supabase
          .from('offers')
          .insert(insertData)
          .select()
          .single()

        if (createError) {
          setError(createError.message)
          return null
        }

        // Add images if provided
        if (images && images.length > 0 && newOffer) {
          const imageInserts = images.map((img, index) => ({
            offer_id: newOffer.id,
            url: img.url,
            position: index,
            is_primary: img.is_primary || index === 0,
          }))

          await supabase.from('offer_images').insert(imageInserts)
        }

        return newOffer as Offer
      } catch (err) {
        setError('Greška pri kreiranju ponude')
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const updateOffer = useCallback(
    async (id: string, data: Partial<CreateOfferData>): Promise<Offer | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const { data: updatedOffer, error: updateError } = await supabase
          .from('offers')
          .update(data)
          .eq('id', id)
          .eq('organization_id', user?.organization_id)
          .select(`
            *,
            images:offer_images(id, url, position)
          `)
          .single()

        if (updateError) {
          setError(updateError.message)
          return null
        }

        return updatedOffer as Offer
      } catch (err) {
        setError('Greška pri ažuriranju ponude')
        return null
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const updateCapacity = useCallback(
    async (id: string, available_spots: number): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('offers')
          .update({ 
            available_spots,
            status: available_spots <= 0 ? 'sold_out' : 'active'
          })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri ažuriranju kapaciteta')
        return false
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const archiveOffer = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('offers')
          .update({ status: 'archived' })
          .eq('id', id)
          .eq('organization_id', user?.organization_id)

        if (updateError) {
          setError(updateError.message)
          return false
        }

        return true
      } catch (err) {
        setError('Greška pri arhiviranju ponude')
        return false
      } finally {
        setLoading(false)
      }
    },
    [supabase, user]
  )

  const getCountries = useCallback(
    async (): Promise<string[]> => {
      if (!user?.organization_id) return []

      try {
        const { data } = await supabase
          .from('offers')
          .select('country')
          .eq('organization_id', user?.organization_id)
          .eq('status', 'active')

        if (!data) return []

        const countries = [...new Set(data.map(o => o.country))]
        return countries.sort()
      } catch {
        return []
      }
    },
    [supabase, user]
  )

  return {
    loading,
    error,
    getOffers,
    getOffer,
    createOffer,
    updateOffer,
    updateCapacity,
    archiveOffer,
    getCountries,
  }
}
