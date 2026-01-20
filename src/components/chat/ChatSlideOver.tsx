'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  X,
  Send,
  RefreshCw,
  Mail,
  Phone,
  User,
  ChevronDown,
  Clock,
  Package,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import Link from 'next/link'
import { OffersSearchPanel } from './OffersSearchPanel'

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  channel: string
  subject?: string
  content: string
  from_name?: string
  from_email?: string
  to_name?: string
  to_email?: string
  sent_at: string
  status: string
}

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  stage_id: string | null
  value: number | null
  notes: string | null
  awaiting_response: boolean
  last_customer_message_at: string | null
  stage?: {
    id: string
    name: string
    color: string
  }
}

interface PipelineStage {
  id: string
  name: string
  color: string
  position: number
}

interface ChatSlideOverProps {
  leadId: string | null
  isOpen: boolean
  onClose: () => void
  onLeadUpdated?: () => void
}

export default function ChatSlideOver({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
}: ChatSlideOverProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const [updatingStage, setUpdatingStage] = useState(false)
  const [offersSearchOpen, setOffersSearchOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const { organizationId } = useUser()

  // Fetch lead details
  const fetchLead = useCallback(async () => {
    if (!leadId) return

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          stage_id,
          value,
          notes,
          awaiting_response,
          last_customer_message_at,
          stage:pipeline_stages(id, name, color)
        `)
        .eq('id', leadId)
        .single()

      if (error) throw error
      // Supabase returns stage as an array for joins, extract the first item
      const leadData = {
        ...data,
        stage: Array.isArray(data.stage) ? data.stage[0] : data.stage,
      } as Lead
      setLead(leadData)
    } catch (err) {
      console.error('Error fetching lead:', err)
    }
  }, [leadId, supabase])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!leadId) return

    try {
      const response = await fetch(`/api/leads/${leadId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Fetch pipeline stages
  const fetchStages = useCallback(async () => {
    if (!organizationId) return

    try {
      const { data } = await supabase
        .from('pipeline_stages')
        .select('id, name, color, position')
        .eq('organization_id', organizationId)
        .order('position', { ascending: true })

      setStages(data || [])
    } catch (err) {
      console.error('Error fetching stages:', err)
    }
  }, [organizationId, supabase])

  // Initial fetch
  useEffect(() => {
    if (isOpen && leadId) {
      setLoading(true)
      setError(null)
      fetchLead()
      fetchMessages()
      fetchStages()
    }
  }, [isOpen, leadId, fetchLead, fetchMessages, fetchStages])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!isOpen || !leadId || !organizationId) return

    const channel = supabase
      .channel(`chat-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, leadId, organizationId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !leadId) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/leads/${leadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
        // Update lead's awaiting_response status
        setLead((prev) => (prev ? { ...prev, awaiting_response: false } : null))
        onLeadUpdated?.()
      } else {
        setError(data.error || 'Greška pri slanju')
      }
    } catch (err) {
      setError('Greška pri slanju poruke')
    } finally {
      setSending(false)
    }
  }

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Handle offer selection from search panel
  const handleSelectOffer = (offer: any, formatted: string) => {
    setNewMessage((prev) => {
      if (prev.trim()) {
        return prev + '\n\n' + formatted
      }
      return formatted
    })
    setOffersSearchOpen(false)
  }

  // Update lead stage
  const updateStage = async (stageId: string) => {
    if (!leadId || updatingStage) return

    setUpdatingStage(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      if (error) throw error

      const newStage = stages.find((s) => s.id === stageId)
      setLead((prev) =>
        prev
          ? {
              ...prev,
              stage_id: stageId,
              stage: newStage ? { id: newStage.id, name: newStage.name, color: newStage.color } : undefined,
            }
          : null
      )
      setStageDropdownOpen(false)
      onLeadUpdated?.()
    } catch (err) {
      console.error('Error updating stage:', err)
    } finally {
      setUpdatingStage(false)
    }
  }

  // Format time
  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: sr })
    } catch {
      return ''
    }
  }

  // Calculate waiting time
  const getWaitingTime = () => {
    if (!lead?.last_customer_message_at) return null
    const waitMs = Date.now() - new Date(lead.last_customer_message_at).getTime()
    const hours = Math.floor(waitMs / (1000 * 60 * 60))
    if (hours < 1) return 'manje od sat vremena'
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }

  const waitingTime = getWaitingTime()
  const isUrgent = lead?.last_customer_message_at
    ? Date.now() - new Date(lead.last_customer_message_at).getTime() > 2 * 60 * 60 * 1000
    : false
  const isCritical = lead?.last_customer_message_at
    ? Date.now() - new Date(lead.last_customer_message_at).getTime() > 4 * 60 * 60 * 1000
    : false

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide Over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {lead ? (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900 truncate">
                      {lead.name}
                    </h2>
                    {lead.awaiting_response && waitingTime && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isCritical
                            ? 'bg-red-100 text-red-700'
                            : isUrgent
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {waitingTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {lead.phone}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="animate-pulse">
                  <div className="h-6 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-200 rounded mt-2" />
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stage selector & actions */}
          {lead && (
            <div className="flex items-center gap-2 mt-3">
              {/* Stage dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                  disabled={updatingStage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-slate-50"
                  style={{
                    borderColor: lead.stage?.color || '#e2e8f0',
                    color: lead.stage?.color || '#64748b',
                  }}
                >
                  {updatingStage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: lead.stage?.color || '#94a3b8' }}
                    />
                  )}
                  {lead.stage?.name || 'Bez faze'}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {stageDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setStageDropdownOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                      {stages.map((stage) => (
                        <button
                          key={stage.id}
                          onClick={() => updateStage(stage.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                          {lead.stage_id === stage.id && (
                            <Check className="w-4 h-4 ml-auto text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Value */}
              {lead.value && (
                <span className="text-sm text-slate-600 font-medium">
                  €{lead.value.toLocaleString()}
                </span>
              )}

              {/* View full lead link */}
              <Link
                href={`/dashboard/leads/${lead.id}`}
                className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Otvori karticu
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Mail className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Nema poruka</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.direction === 'outbound'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {message.subject && message.direction === 'inbound' && (
                    <p className="text-xs font-medium mb-1 text-slate-500">
                      {message.subject}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content.length > 500
                      ? message.content.substring(0, 500) + '...'
                      : message.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      message.direction === 'outbound' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(message.sent_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Message composer */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-white">
          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setOffersSearchOpen(true)}
              disabled={!lead?.email}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="w-4 h-4" />
              Pronađi ponude
            </button>
          </div>

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Napišite odgovor... (Ctrl+Enter za slanje)"
              rows={1}
              disabled={!lead?.email}
              className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || !lead?.email}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          {!lead?.email && (
            <p className="text-xs text-slate-400 mt-2">
              Klijent nema email adresu. Dodajte email u kartici upita.
            </p>
          )}
        </div>
      </div>

      {/* Offers Search Panel */}
      <OffersSearchPanel
        isOpen={offersSearchOpen}
        onClose={() => setOffersSearchOpen(false)}
        onSelectOffer={handleSelectOffer}
      />
    </>
  )
}
