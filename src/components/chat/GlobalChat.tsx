'use client'

import { useChat } from '@/contexts/ChatContext'
import ChatSlideOver from './ChatSlideOver'

export function GlobalChat() {
  const { chatLeadId, isChatOpen, closeChat, refreshInbox } = useChat()

  return (
    <ChatSlideOver
      leadId={chatLeadId}
      isOpen={isChatOpen}
      onClose={closeChat}
      onLeadUpdated={refreshInbox}
    />
  )
}
