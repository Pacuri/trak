'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageCircle, Clock, RefreshCw, CheckCircle2, Send, Mail, Phone, MessageSquare, Facebook, Instagram, X, Plus } from 'lucide-react'
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
  created_at?: string
  unread_count?: number
  source_type?: string | null
  destination?: string | null
  guests?: number | null
  notes?: string | null
  package_name?: string | null
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
    channel?: 'email' | 'phone' | 'sms' | 'whatsapp' | 'manual' | 'messenger' | 'instagram'
  } | null
}

interface InboxWidgetProps {
  onOpenChat?: (leadId: string) => void
  onOpenInquiry?: (inquiry: any) => void
}

export function InboxWidget({ onOpenChat, onOpenInquiry }: InboxWidgetProps) {
  const [leads, setLeads] = useState<InboxLead[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null)
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

  // Handle click on a lead - open inquiry slideover for trak leads, chat for others
  const handleLeadClick = async (lead: InboxLead) => {
    if (lead.source_type === 'trak' && onOpenInquiry) {
      // Fetch the custom_inquiry data for this lead
      try {
        const { data: inquiry } = await supabase
          .from('custom_inquiries')
          .select('*')
          .eq('lead_id', lead.id)
          .single()

        if (inquiry) {
          // Transform to PendingInquiry format
          const pendingInquiry = {
            id: inquiry.id,
            customer_name: inquiry.customer_name,
            customer_phone: inquiry.customer_phone,
            customer_email: inquiry.customer_email,
            customer_note: inquiry.customer_note,
            qualification_data: inquiry.qualification_data,
            created_at: inquiry.created_at,
            priority: 'normal' as const,
            wait_hours: 0,
            source: inquiry.source,
            lead_id: lead.id, // Pass the lead ID so we can update it
          }
          onOpenInquiry(pendingInquiry)
        } else {
          // Fallback: create inquiry-like object from lead data
          const pendingInquiry = {
            id: lead.id,
            customer_name: lead.name,
            customer_phone: lead.phone || '',
            customer_email: lead.email,
            customer_note: lead.notes,
            qualification_data: {
              destination: lead.destination ? { country: lead.destination } : null,
              guests: lead.guests ? { adults: lead.guests, children: 0 } : null,
            },
            created_at: lead.last_customer_message_at || lead.created_at,
            priority: 'normal' as const,
            wait_hours: 0,
            source: 'trak',
            lead_id: lead.id, // Pass the lead ID so we can update it
          }
          onOpenInquiry(pendingInquiry)
        }
      } catch (err) {
        console.error('[InboxWidget] Error fetching inquiry:', err)
        // Fallback to chat
        onOpenChat?.(lead.id)
      }
    } else {
      // Open chat for non-trak leads
      onOpenChat?.(lead.id)
    }
  }

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
        (payload: unknown) => {
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
        (payload: unknown) => {
          console.log('[InboxWidget] Realtime: new message inserted', payload)
          fetchInbox()
        }
      )
      .subscribe((status: string) => {
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
      isUrgent: hours >= 3,
      isCritical: hours >= 24,
    }
  }

  const truncateMessage = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  // Show confirmation dialog for dismissing
  const handleDismissClick = (leadId: string) => {
    setConfirmDismissId(leadId)
  }

  // Actually dismiss a lead from inbox (mark as not awaiting response)
  const handleConfirmDismiss = async () => {
    if (!confirmDismissId) return

    const leadId = confirmDismissId
    setConfirmDismissId(null)
    setDismissingId(leadId)

    try {
      const response = await fetch(`/api/leads/${leadId}/dismiss`, {
        method: 'POST',
      })
      if (response.ok) {
        // Remove from local state immediately for responsive UI
        setLeads(prev => prev.filter(l => l.id !== leadId))
      }
    } catch (error) {
      console.error('[InboxWidget] Error dismissing lead:', error)
    } finally {
      setDismissingId(null)
    }
  }

  // Get channel icon based on message channel or source type
  const getChannelIcon = (channel?: string, sourceType?: string | null) => {
    // If it's from website (Trak inquiry form), show Trak logo
    if (sourceType === 'trak') {
      return (
        <img src="/trak-logo-circle.png" alt="Trak" className="w-full h-full object-cover" />
      )
    }

    switch (channel) {
      case 'messenger':
        return <Facebook className="w-5 h-5 text-[#1877F2]" strokeWidth={1.5} />
      case 'instagram':
        return <Instagram className="w-5 h-5 text-[#E4405F]" strokeWidth={1.5} />
      case 'whatsapp':
        return <Phone className="w-5 h-5 text-[#25D366]" strokeWidth={1.5} />
      case 'sms':
        return <MessageSquare className="w-5 h-5 text-green-500" strokeWidth={1.5} />
      case 'email':
      default:
        return <Mail className="w-5 h-5 text-red-500" strokeWidth={1.5} />
    }
  }

  // Get message preview for lead - returns string for regular messages
  const getMessagePreview = (lead: InboxLead): string | null => {
    if (lead.last_message?.content) {
      return truncateMessage(lead.last_message.content)
    }
    if (lead.source_type === 'trak') {
      return null // Will use styled tags instead
    }
    return 'Čeka odgovor'
  }

  // Render stylized info tags for trak inquiries (two rows: info + message)
  const renderTrakInfo = (lead: InboxLead) => {
    if (lead.source_type !== 'trak') return null

    return (
      <div className="mb-2 space-y-1.5">
        {/* Row 1: Info tags */}
        <div className="flex flex-wrap gap-1.5">
          {lead.package_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-full">
              🏨 {lead.package_name}
            </span>
          )}
          {lead.destination && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full">
              📍 {lead.destination}
            </span>
          )}
        </div>
        {/* Row 2: Message */}
        {lead.notes && (
          <p className="text-xs text-slate-500">
            {truncateMessage(lead.notes, 120)}
          </p>
        )}
      </div>
    )
  }

  // Check if channel supports dismiss (social channels)
  const canDismiss = (channel?: string) => {
    return channel === 'messenger' || channel === 'instagram' || channel === 'whatsapp'
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
        <a
          href="/dashboard/leads/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
        >
          <Plus className="w-3.5 h-3.5" />
          Novi upit
        </a>
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
            {leads.slice(0, 10).map((lead) => {
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

                  {/* Lead info */}
                  <div className="flex items-start gap-3">
                    {/* Channel icon */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-slate-200">
                      {getChannelIcon(lead.last_message?.channel, lead.source_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name and time row */}
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-900 text-sm truncate">
                            {lead.name}
                          </span>
                          {lead.unread_count && lead.unread_count > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                              {lead.unread_count}
                            </span>
                          )}
                        </div>
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

                      {/* Message preview or styled tags */}
                      {lead.source_type === 'trak' ? (
                        renderTrakInfo(lead)
                      ) : (
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {getMessagePreview(lead)}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {/* Reply button */}
                        <button
                          onClick={() => handleLeadClick(lead)}
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

                        {/* Dismiss button for social channels */}
                        {canDismiss(lead.last_message?.channel) && (
                          <button
                            onClick={() => handleDismissClick(lead.id)}
                            disabled={dismissingId === lead.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
                          >
                            {dismissingId === lead.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Odbaci
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {leads.length > 10 && (
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  +{leads.length - 10} više poruka
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDismissId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDismissId(null)}
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Odbaci poruku?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Da li ste sigurni da želite da odbacite ovu poruku? Lead će biti uklonjen iz liste čekanja.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDismissId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={handleConfirmDismiss}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Odbaci
              </button>
            </div>
          </div>
        </div>
      )}
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
