'use client'

import { useState, useEffect, useRef } from 'react'
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
  const isMounted = useRef(true)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  useEffect(() => {
    isMounted.current = true

    async function fetchUser() {
      try {
        if (!isMounted.current) return
        setLoading(true)
        setError(null)

        // Get auth user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (!isMounted.current) return

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

        if (!isMounted.current) return

        if (userError || !userData) {
          setUser(null)
          setLoading(false)
          return
        }

        setUser(userData as User)
      } catch (err: unknown) {
        // Ignore AbortError - happens during cleanup
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        if (isMounted.current) {
          setError('Failed to fetch user')
          setUser(null)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    // Setup function that handles initialization
    async function setup() {
      // First fetch user
      await fetchUser()

      if (!isMounted.current) return

      // Then setup auth listener after a small delay to let Supabase initialize
      setTimeout(() => {
        if (!isMounted.current) return

        try {
          const { data } = supabase.auth.onAuthStateChange((_event: string, _session: unknown) => {
            if (isMounted.current) {
              fetchUser()
            }
          })
          subscriptionRef.current = data.subscription
        } catch {
          // Ignore errors during subscription setup
        }
      }, 100)
    }

    setup().catch(() => {
      // Ignore setup errors
    })

    return () => {
      isMounted.current = false
      subscriptionRef.current?.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
