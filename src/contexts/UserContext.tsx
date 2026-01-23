'use client'

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface UserContextValue {
  user: User | null
  organizationId: string | null
  organization_id: string | null
  loading: boolean
  error: string | null
  hasOrganization: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true

    async function fetchUser() {
      try {
        if (isMounted) {
          setLoading(true)
          setError(null)
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (!isMounted) return

        if (authError || !authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!isMounted) return

        if (userError || !userData) {
          setUser(null)
          setLoading(false)
          return
        }

        setUser(userData as User)
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch user')
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    // Single auth state listener for the entire app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        fetchUser()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const organizationId = user?.organization_id || null

  const value = useMemo(() => ({
    user,
    organizationId,
    organization_id: organizationId,
    loading,
    error,
    hasOrganization: !!organizationId,
  }), [user, organizationId, loading, error])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
