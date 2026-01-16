'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { 
  Package, 
  Departure,
  PackageFormData, 
  PackageFilters,
  DepartureFormData,
  GenerateWeeklyDeparturesParams,
} from '@/types/packages'

export interface PackagesListResult {
  packages: Package[]
  total: number
  limit: number
  offset: number
}

export function usePackages() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { user, loading: userLoading } = useUser()

  /**
   * Get list of packages with filters
   */
  const getPackages = useCallback(
    async (filters?: PackageFilters): Promise<Package[]> => {
      // Wait for user to load before checking organization
      if (userLoading) {
        return []
      }
      
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (filters?.package_type) params.set('package_type', filters.package_type)
        if (filters?.status) params.set('status', filters.status)
        if (filters?.search) params.set('search', filters.search)
        if (filters?.is_featured) params.set('is_featured', 'true')

        const response = await fetch(`/api/packages?${params.toString()}`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri učitavanju paketa')
        }

        const data = await response.json()
        return data.packages || []
      } catch (err: any) {
        setError(err.message || 'Greška pri učitavanju paketa')
        return []
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Get a single package with all relations
   */
  const getPackage = useCallback(
    async (id: string): Promise<Package | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${id}`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri učitavanju paketa')
        }

        return await response.json()
      } catch (err: any) {
        setError(err.message || 'Greška pri učitavanju paketa')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Create a new package with departures and images
   */
  const createPackage = useCallback(
    async (data: PackageFormData): Promise<Package | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const respData = await response.json()
          throw new Error(respData.error || 'Greška pri kreiranju paketa')
        }

        return await response.json()
      } catch (err: any) {
        setError(err.message || 'Greška pri kreiranju paketa')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Update an existing package
   */
  const updatePackage = useCallback(
    async (id: string, data: Partial<PackageFormData>): Promise<Package | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const respData = await response.json()
          throw new Error(respData.error || 'Greška pri ažuriranju paketa')
        }

        return await response.json()
      } catch (err: any) {
        setError(err.message || 'Greška pri ažuriranju paketa')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Archive a package (soft delete)
   */
  const archivePackage = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri arhiviranju paketa')
        }

        return true
      } catch (err: any) {
        setError(err.message || 'Greška pri arhiviranju paketa')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Get departures for a package
   */
  const getDepartures = useCallback(
    async (packageId: string): Promise<Departure[]> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return []
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${packageId}/departures`)
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri učitavanju polazaka')
        }

        const data = await response.json()
        return data.departures || []
      } catch (err: any) {
        setError(err.message || 'Greška pri učitavanju polazaka')
        return []
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Add a single departure to a package
   */
  const addDeparture = useCallback(
    async (packageId: string, data: DepartureFormData): Promise<Departure | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${packageId}/departures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const respData = await response.json()
          throw new Error(respData.error || 'Greška pri kreiranju polaska')
        }

        return await response.json()
      } catch (err: any) {
        setError(err.message || 'Greška pri kreiranju polaska')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Generate weekly departures for a package
   */
  const generateWeeklyDepartures = useCallback(
    async (params: GenerateWeeklyDeparturesParams): Promise<number> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return 0
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/packages/${params.package_id}/departures?action=generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_date: params.start_date,
            end_date: params.end_date,
            price: params.price,
            capacity: params.capacity,
          }),
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri generisanju polazaka')
        }

        const data = await response.json()
        return data.count || 0
      } catch (err: any) {
        setError(err.message || 'Greška pri generisanju polazaka')
        return 0
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Update a departure
   */
  const updateDeparture = useCallback(
    async (departureId: string, data: Partial<Departure>): Promise<Departure | null> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/departures/${departureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const respData = await response.json()
          throw new Error(respData.error || 'Greška pri ažuriranju polaska')
        }

        return await response.json()
      } catch (err: any) {
        setError(err.message || 'Greška pri ažuriranju polaska')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Delete a departure
   */
  const deleteDeparture = useCallback(
    async (departureId: string): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/departures/${departureId}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri brisanju polaska')
        }

        return true
      } catch (err: any) {
        setError(err.message || 'Greška pri brisanju polaska')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Quick update capacity for a departure
   */
  const updateCapacity = useCallback(
    async (departureId: string, availableSpots: number): Promise<boolean> => {
      if (!user?.organization_id) {
        setError('Organizacija nije pronađena')
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/departures/${departureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ available_spots: availableSpots }),
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Greška pri ažuriranju kapaciteta')
        }

        return true
      } catch (err: any) {
        setError(err.message || 'Greška pri ažuriranju kapaciteta')
        return false
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  /**
   * Get unique countries from packages
   */
  const getCountries = useCallback(
    async (): Promise<string[]> => {
      if (!user?.organization_id) return []

      try {
        const { data } = await supabase
          .from('packages')
          .select('destination_country')
          .eq('organization_id', user.organization_id)
          .eq('status', 'active')
          .eq('is_active', true)

        if (!data) return []

        const countries = [...new Set(data.map(p => p.destination_country).filter(Boolean))]
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
    // Package operations
    getPackages,
    getPackage,
    createPackage,
    updatePackage,
    archivePackage,
    // Departure operations
    getDepartures,
    addDeparture,
    generateWeeklyDepartures,
    updateDeparture,
    deleteDeparture,
    updateCapacity,
    // Utilities
    getCountries,
  }
}
