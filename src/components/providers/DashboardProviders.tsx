'use client'

import { ReactNode } from 'react'
import { ChatProvider } from '@/contexts/ChatContext'
import { NotificationProvider } from '@/components/notifications/NotificationProvider'
import { GlobalChat } from '@/components/chat/GlobalChat'

interface DashboardProvidersProps {
  children: ReactNode
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <ChatProvider>
      <NotificationProvider>
        {children}
        <GlobalChat />
      </NotificationProvider>
    </ChatProvider>
  )
}
