'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

interface ChatContextType {
  chatLeadId: string | null
  isChatOpen: boolean
  openChat: (leadId: string) => void
  closeChat: () => void
  onLeadUpdated: () => void
  subscribeToLeadUpdates: (callback: () => void) => () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatLeadId, setChatLeadId] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const updateListenersRef = useRef<Set<() => void>>(new Set())

  const openChat = useCallback((leadId: string) => {
    setChatLeadId(leadId)
    setIsChatOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsChatOpen(false)
    setChatLeadId(null)
  }, [])

  // Notify all listeners when a lead is updated (e.g., message sent)
  const onLeadUpdated = useCallback(() => {
    updateListenersRef.current.forEach(callback => callback())
  }, [])

  // Subscribe to lead update notifications
  const subscribeToLeadUpdates = useCallback((callback: () => void) => {
    updateListenersRef.current.add(callback)
    return () => {
      updateListenersRef.current.delete(callback)
    }
  }, [])

  return (
    <ChatContext.Provider value={{ chatLeadId, isChatOpen, openChat, closeChat, onLeadUpdated, subscribeToLeadUpdates }}>
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
