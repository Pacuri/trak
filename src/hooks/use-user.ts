'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface UseUserReturn {
  user: User | null
  organizationId: string | null
  organization_id: string | null
  loading: boolean
  error: string | null
  hasOrganization: boolean
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true)
        setError(null)

        // Get auth user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        // Get user record from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userError || !userData) {
          setUser(null)
          setLoading(false)
          return
        }

        setUser(userData as User)
      } catch (err) {
        setError('Failed to fetch user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const organizationId = user?.organization_id || null

  return {
    user,
    organizationId,
    organization_id: organizationId, // Alias for backward compatibility
    loading,
    error,
    hasOrganization: !!organizationId,
  }
}
