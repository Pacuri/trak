'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

interface ChatContextType {
  chatLeadId: string | null
  isChatOpen: boolean
  openChat: (leadId: string) => void
  closeChat: () => void
  refreshInbox: () => void
  subscribeToInboxRefresh: (callback: () => void) => () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatLeadId, setChatLeadId] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const inboxListenersRef = useRef<Set<() => void>>(new Set())

  const openChat = useCallback((leadId: string) => {
    setChatLeadId(leadId)
    setIsChatOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsChatOpen(false)
    setChatLeadId(null)
  }, [])

  // Trigger inbox refresh - call this when leads change (message sent, email accepted, etc.)
  const refreshInbox = useCallback(() => {
    console.log('[ChatContext] refreshInbox called, listeners:', inboxListenersRef.current.size)
    inboxListenersRef.current.forEach(callback => {
      console.log('[ChatContext] Calling inbox listener callback')
      callback()
    })
  }, [])

  // Subscribe to inbox refresh notifications
  const subscribeToInboxRefresh = useCallback((callback: () => void) => {
    inboxListenersRef.current.add(callback)
    return () => {
      inboxListenersRef.current.delete(callback)
    }
  }, [])

  return (
    <ChatContext.Provider value={{ chatLeadId, isChatOpen, openChat, closeChat, refreshInbox, subscribeToInboxRefresh }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
