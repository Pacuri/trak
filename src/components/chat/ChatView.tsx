'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, RefreshCw, Mail, MessageSquare, Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { sr } from 'date-fns/locale'

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

interface ChatViewProps {
  leadId: string
  leadName?: string
  leadEmail?: string
  onClose?: () => void
}

export default function ChatView({ leadId, leadName, leadEmail, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        const data = await response.json()
        setError(data.error || 'Greška pri učitavanju')
      }
    } catch (err) {
      setError('Greška pri učitavanju poruka')
    } finally {
      setLoading(false)
    }
  }

  // Sync from Gmail
  const syncMessages = async () => {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch(`/api/leads/${leadId}/messages/sync`, {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        // Refresh messages after sync
        await fetchMessages()
      } else {
        setError(data.error || 'Greška pri sinhronizaciji')
      }
    } catch (err) {
      setError('Greška pri sinhronizaciji')
    } finally {
      setSyncing(false)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

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
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      } else {
        setError(data.error || 'Greška pri slanju')
      }
    } catch (err) {
      setError('Greška pri slanju poruke')
    } finally {
      setSending(false)
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [leadId])

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sr })
    } catch {
      return ''
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6] text-white font-semibold">
            {leadName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-[#1E293B]">{leadName || 'Nepoznato'}</h3>
            <p className="text-xs text-[#64748B]">{leadEmail || 'Nema email'}</p>
          </div>
        </div>
        <button
          onClick={syncMessages}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#64748B] hover:text-[#3B82F6] hover:bg-[#F1F5F9] rounded-lg transition-colors disabled:opacity-50"
          title="Sinhronizuj sa Gmail-om"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sinhronizacija...' : 'Osveži'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <MessageSquare className="h-10 w-10 text-[#CBD5E1] mb-2" />
            <p className="text-[#64748B] text-sm">Nema poruka</p>
            <button
              onClick={syncMessages}
              disabled={syncing}
              className="mt-2 text-sm text-[#3B82F6] hover:underline"
            >
              Sinhronizuj sa Gmail-om
            </button>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.direction === 'outbound'
                      ? 'bg-[#3B82F6] text-white rounded-br-md'
                      : 'bg-white text-[#1E293B] border border-[#E2E8F0] rounded-bl-md shadow-sm'
                  }`}
                >
                  {message.subject && message.direction === 'inbound' && (
                    <p className={`text-xs font-medium mb-1 ${
                      message.direction === 'outbound' ? 'text-white/80' : 'text-[#64748B]'
                    }`}>
                      {message.subject}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content.length > 500
                      ? message.content.substring(0, 500) + '...'
                      : message.content}
                  </p>
                  {message.content.length > 500 && (
                    <button
                      className={`text-xs mt-1 underline ${
                        message.direction === 'outbound' ? 'text-white/70' : 'text-[#3B82F6]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Toggle showing full content - for now just alert
                        alert(message.content)
                      }}
                    >
                      Prikaži celu poruku
                    </button>
                  )}
                  <div className={`flex items-center gap-1.5 mt-1.5 ${
                    message.direction === 'outbound' ? 'text-white/60' : 'text-[#94A3B8]'
                  }`}>
                    {getChannelIcon(message.channel)}
                    <span className="text-[10px]">{formatTime(message.sent_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-[#E2E8F0]">
        {!leadEmail ? (
          <p className="text-sm text-[#64748B] text-center py-2">
            Klijent nema email adresu
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Unesite poruku..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] min-h-[42px] max-h-[120px]"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
