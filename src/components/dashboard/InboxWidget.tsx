'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageCircle, Clock, RefreshCw, CheckCircle2, Send, Mail } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { useChat } from '@/contexts/ChatContext'

interface InboxLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  stage_id: string | null
  value: number | null
  awaiting_response: boolean
  last_customer_message_at: string | null
  stage?: {
    id: string
    name: string
    color: string
  }
  last_message?: {
    id: string
    content: string
    subject: string | null
    sent_at: string
    direction: 'inbound' | 'outbound'
  } | null
}

interface InboxWidgetProps {
  onOpenChat?: (leadId: string) => void
}

export function InboxWidget({ onOpenChat }: InboxWidgetProps) {
  const [leads, setLeads] = useState<InboxLead[]>([])
  const [loading, setLoading] = useState(true)
  const { organizationId } = useUser()
  const { subscribeToInboxRefresh } = useChat()
  const supabase = useMemo(() => createClient(), [])

  const fetchInbox = useCallback(async () => {
    console.log('[InboxWidget] fetchInbox called')
    try {
      // Add cache-busting timestamp to prevent stale data
      const response = await fetch(`/api/inbox?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log('[InboxWidget] Fetched inbox, leads count:', data.leads?.length, 'leads:', data.leads?.map((l: any) => ({ id: l.id, name: l.name, awaiting: l.awaiting_response })))
        setLeads(data.leads || [])
      } else {
        console.error('[InboxWidget] Fetch failed with status:', response.status)
      }
    } catch (err) {
      console.error('[InboxWidget] Error fetching inbox:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  // Subscribe to inbox refresh notifications (from chat, email acceptance, etc.)
  useEffect(() => {
    console.log('[InboxWidget] Subscribing to inbox refresh')
    const unsubscribe = subscribeToInboxRefresh(() => {
      console.log('[InboxWidget] Refresh callback triggered, fetching inbox...')
      // Fetch immediately - the API caller has already ensured DB commit
      fetchInbox()
    })
    return () => {
      console.log('[InboxWidget] Unsubscribing from inbox refresh')
      unsubscribe()
    }
  }, [subscribeToInboxRefresh, fetchInbox])

  // Real-time subscription for lead updates
  useEffect(() => {
    if (!organizationId) return

    console.log('[InboxWidget] Setting up realtime subscription for org:', organizationId)
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[InboxWidget] Realtime: leads table changed', payload)
          fetchInbox()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[InboxWidget] Realtime: new message inserted', payload)
          fetchInbox()
        }
      )
      .subscribe((status) => {
        console.log('[InboxWidget] Realtime subscription status:', status)
      })

    return () => {
      console.log('[InboxWidget] Removing realtime channel')
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId, fetchInbox])

  // Calculate waiting time and urgency
  const getWaitingInfo = (lastMessageAt: string | null) => {
    if (!lastMessageAt) return { text: 'sada', isUrgent: false, isCritical: false }

    const waitMs = Date.now() - new Date(lastMessageAt).getTime()
    const hours = Math.floor(waitMs / (1000 * 60 * 60))
    const minutes = Math.floor(waitMs / (1000 * 60))

    let text = ''
    if (minutes < 1) {
      text = 'sada'
    } else if (minutes < 60) {
      text = `pre ${minutes}min`
    } else if (hours < 24) {
      text = `pre ${hours}h`
    } else {
      const days = Math.floor(hours / 24)
      text = `pre ${days}d`
    }

    return {
      text,
      isUrgent: hours >= 2,
      isCritical: hours >= 4,
    }
  }

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900">Čeka odgovor</h3>
          {leads.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              {leads.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-4 ml-[42px]">
        Poruke koje čekaju vaš odgovor
      </p>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : leads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {leads.slice(0, 7).map((lead) => {
              const waitingInfo = getWaitingInfo(lead.last_customer_message_at)

              return (
                <div
                  key={lead.id}
                  className={`
                    relative p-3 rounded-xl border transition-all
                    ${waitingInfo.isCritical
                      ? 'border-red-200 bg-red-50/50'
                      : waitingInfo.isUrgent
                        ? 'border-orange-200 bg-orange-50/50'
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                    }
                  `}
                >
                  {/* Urgency indicator dot */}
                  {(waitingInfo.isUrgent || waitingInfo.isCritical) && (
                    <div
                      className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                        waitingInfo.isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
                      }`}
                    />
                  )}

                  {/* Lead info */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {lead.name.substring(0, 1).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name and time row */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {lead.name}
                        </span>
                        <span
                          className={`text-[11px] font-medium flex-shrink-0 ${
                            waitingInfo.isCritical
                              ? 'text-red-600'
                              : waitingInfo.isUrgent
                                ? 'text-orange-600'
                                : 'text-slate-400'
                          }`}
                        >
                          {waitingInfo.text}
                        </span>
                      </div>

                      {/* Message preview */}
                      {lead.last_message && (
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {truncateMessage(lead.last_message.content)}
                        </p>
                      )}

                      {/* Reply button */}
                      <button
                        onClick={() => onOpenChat?.(lead.id)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${waitingInfo.isCritical
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                            : waitingInfo.isUrgent
                              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }
                        `}
                      >
                        <Send className="w-3 h-3" />
                        Odgovori
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {leads.length > 7 && (
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  +{leads.length - 7} više poruka
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
        <CheckCircle2 className="w-7 h-7 text-green-600" />
      </div>
      <p className="font-semibold text-slate-900">Sve je odgovoreno!</p>
      <p className="text-sm text-slate-500 mt-1">Nema poruka koje čekaju odgovor</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="w-24 h-4 bg-slate-200 rounded" />
                <div className="w-12 h-3 bg-slate-200 rounded" />
              </div>
              <div className="w-full h-3 bg-slate-200 rounded mb-2" />
              <div className="w-20 h-6 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default InboxWidget
