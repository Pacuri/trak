'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mail, Check, X, RefreshCw, ChevronRight, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'

interface EmailCandidate {
  id: string
  from_email: string
  from_name: string | null
  subject: string | null
  snippet: string | null
  email_date: string | null
  created_at: string
  organization_id: string
  status: string
}

interface NewEmailsProps {
  onEmailAccepted?: (leadId?: string) => void
}

export function NewEmails({ onEmailAccepted }: NewEmailsProps) {
  const [emails, setEmails] = useState<EmailCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { organizationId } = useUser()
  // Memoize supabase client to prevent recreating on every render
  const supabase = useMemo(() => createClient(), [])

  const fetchEmails = useCallback(async () => {
    try {
      const response = await fetch('/api/email-candidates')
      if (response.ok) {
        const data = await response.json()
        setEmails(data.candidates || [])
      }
    } catch (err) {
      console.error('Error fetching email candidates:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  // Real-time subscription for new email candidates
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel('email-candidates-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_candidates',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('New email candidate received:', payload.new)
          const newEmail = payload.new as EmailCandidate
          // Only add if it's pending status
          if (newEmail.status === 'pending') {
            setEmails((prev) => {
              // Avoid duplicates
              if (prev.some((e) => e.id === newEmail.id)) {
                return prev
              }
              // Add to beginning of list
              return [newEmail, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'email_candidates',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const updatedEmail = payload.new as EmailCandidate
          // Remove from list if no longer pending
          if (updatedEmail.status !== 'pending') {
            setEmails((prev) => prev.filter((e) => e.id !== updatedEmail.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'email_candidates',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const deletedId = payload.old.id
          setEmails((prev) => prev.filter((e) => e.id !== deletedId))
        }
      )
      .subscribe((status) => {
        console.log('Email candidates subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId])

  const handleAccept = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/email-candidates/${id}/accept`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setEmails(prev => prev.filter(e => e.id !== id))
        // Pass the new lead ID so we can open the chat immediately
        onEmailAccepted?.(data.lead?.id)
      }
    } catch (err) {
      console.error('Error accepting email:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDismiss = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/email-candidates/${id}/dismiss`, {
        method: 'POST',
      })
      if (response.ok) {
        setEmails(prev => prev.filter(e => e.id !== id))
      }
    } catch (err) {
      console.error('Error dismissing email:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (date: string | null) => {
    if (!date) return ''
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sr })
    } catch {
      return ''
    }
  }

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📧</span>
          <h3 className="font-semibold text-slate-900">Novi emailovi</h3>
          {emails.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {emails.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchEmails}
          disabled={loading}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="text-xs text-slate-400 mb-3 flex-shrink-0">
        Emailovi za pregled i prihvatanje
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : emails.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {emails.slice(0, 7).map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              processing={processingId === email.id}
              onAccept={() => handleAccept(email.id)}
              onDismiss={() => handleDismiss(email.id)}
              formatTime={formatTime}
            />
          ))}
          {emails.length > 7 && (
            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                +{emails.length - 7} više emailova
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmailRow({
  email,
  processing,
  onAccept,
  onDismiss,
  formatTime,
}: {
  email: EmailCandidate
  processing: boolean
  onAccept: () => void
  onDismiss: () => void
  formatTime: (date: string | null) => string
}) {
  const senderName = email.from_name || email.from_email.split('@')[0]

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      {/* Header: Sender + Time */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-slate-900 text-sm">
          {senderName}
        </span>
        <span className="text-[10px] text-slate-400">
          {formatTime(email.email_date || email.created_at)}
        </span>
      </div>

      {/* Subject */}
      {email.subject && (
        <p className="text-sm text-slate-700 truncate mb-1">
          {email.subject}
        </p>
      )}

      {/* Snippet */}
      {email.snippet && (
        <p className="text-xs text-slate-400 truncate mb-2">
          {email.snippet}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAccept()
          }}
          disabled={processing}
          className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {processing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Prihvati</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          disabled={processing}
          className="py-1.5 px-3 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          title="Odbaci"
        >
          Odbaci
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-7 h-7 text-blue-600" />
      </div>
      <p className="font-semibold text-slate-900">Nema novih emailova</p>
      <p className="text-sm text-slate-500 mt-1">Svi emailovi su obrađeni.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 py-3 animate-pulse">
          <div className="w-8 h-8 bg-slate-200 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-12 h-3 bg-slate-200 rounded" />
            </div>
            <div className="w-40 h-3 bg-slate-200 rounded mb-1" />
            <div className="w-56 h-2 bg-slate-200 rounded" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            <div className="w-20 h-8 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default NewEmails
