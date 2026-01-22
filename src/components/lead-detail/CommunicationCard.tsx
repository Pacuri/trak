'use client'

import { useState } from 'react'
import { MessageCircle, Send, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils'

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  senderName?: string
  sentAt: string
}

interface CommunicationCardProps {
  messages: Message[]
  leadName: string
  agentName?: string
  onSendMessage?: (message: string) => Promise<void>
  onRefresh?: () => void
  onShowAll?: () => void
  isLoading?: boolean
}

export default function CommunicationCard({
  messages,
  leadName,
  agentName = 'Agent',
  onSendMessage,
  onRefresh,
  onShowAll,
  isLoading
}: CommunicationCardProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!newMessage.trim() || !onSendMessage) return

    setSending(true)
    try {
      await onSendMessage(newMessage.trim())
      setNewMessage('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Take last 5 messages for preview
  const recentMessages = messages.slice(-5)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-400" />
          Komunikacija
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onShowAll && messages.length > 5 && (
            <button
              onClick={onShowAll}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              Prikaži sve ({messages.length})
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="p-6">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">Nema poruka</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentMessages.map((message) => {
              const isInbound = message.direction === 'inbound'
              const senderName = isInbound ? leadName : (message.senderName || agentName)
              const initials = getInitials(senderName)
              const gradient = getAvatarGradient(senderName)

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isInbound ? '' : 'justify-end'}`}
                >
                  {isInbound && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${gradient}`}>
                      {initials}
                    </div>
                  )}

                  <div className={`flex-1 max-w-md ${isInbound ? '' : 'flex flex-col items-end'}`}>
                    <div
                      className={`rounded-2xl p-3 ${
                        isInbound
                          ? 'bg-gray-100 rounded-tl-none'
                          : 'bg-blue-500 text-white rounded-tr-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(message.sentAt), "d. MMM, HH:mm", { locale: sr })}
                      {!isInbound && message.senderName && ` • ${message.senderName}`}
                    </p>
                  </div>

                  {!isInbound && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${gradient}`}>
                      {initials}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Reply */}
        {onSendMessage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napiši poruku..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
