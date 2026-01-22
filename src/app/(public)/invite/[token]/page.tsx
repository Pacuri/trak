'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, Mail, CheckCircle, XCircle, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface InvitationData {
  email: string
  role: string
  organization: {
    id: string
    name: string
    slug: string
  }
  expires_at: string
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function checkInvitation() {
      try {
        // Check auth status
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)
        setCurrentUserEmail(user?.email || null)

        // Validate invitation
        const response = await fetch(`/api/team/invite/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invitation')
          setLoading(false)
          return
        }

        setInvitation(data.invitation)
        setLoading(false)
      } catch (err) {
        setError('Failed to validate invitation')
        setLoading(false)
      }
    }

    checkInvitation()
  }, [token, supabase])

  const handleAcceptInvitation = async () => {
    if (!invitation) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/team/invite/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation')
        setAccepting(false)
        return
      }

      setSuccess(true)
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Failed to accept invitation')
      setAccepting(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'agent': return 'Agent'
      default: return 'Član tima'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Učitavanje pozivnice...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Pozivnica nije validna</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors">
              Nazad na prijavu
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Uspešno ste se pridružili!</h1>
          <p className="text-gray-600 mb-4">
            Sada ste član tima <strong>{invitation?.organization.name}</strong>
          </p>
          <p className="text-sm text-gray-500">Preusmeravamo vas na dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pozivnica u tim</h1>
          <p className="text-gray-600 mt-2">Pozvani ste da se pridružite organizaciji</p>
        </div>

        {/* Invitation Details */}
        {invitation && (
          <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Organizacija</p>
                <p className="font-semibold text-gray-900">{invitation.organization.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Vaša uloga</p>
                <p className="font-semibold text-gray-900">{getRoleLabel(invitation.role)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold text-gray-900">{invitation.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        {isLoggedIn ? (
          <div className="space-y-3">
            {currentUserEmail?.toLowerCase() === invitation?.email.toLowerCase() ? (
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Pridruživanje...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Prihvati pozivnicu
                  </>
                )}
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-4 mb-4">
                  Prijavljeni ste kao <strong>{currentUserEmail}</strong>, ali je pozivnica poslata na <strong>{invitation?.email}</strong>.
                </p>
                <Link href={`/login?redirect=/invite/${token}`}>
                  <button className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                    Prijavite se sa drugačijim nalogom
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Link href={`/register?invite=${token}&email=${encodeURIComponent(invitation?.email || '')}`}>
              <button className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors">
                <UserPlus className="h-5 w-5" />
                Kreiraj nalog i pridruži se
              </button>
            </Link>
            <Link href={`/login?redirect=/invite/${token}`}>
              <button className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                Već imam nalog - Prijavi se
              </button>
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Pozivnica ističe {invitation ? new Date(invitation.expires_at).toLocaleDateString('sr-RS') : ''}
        </p>
      </div>
    </div>
  )
}
