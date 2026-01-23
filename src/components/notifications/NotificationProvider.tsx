'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { ToastContainer, Toast } from './ToastNotification'
import { useChat } from '@/contexts/ChatContext'

interface NotificationSettings {
  soundEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
}

interface NotificationContextType extends NotificationSettings {
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Sound for notifications
const playNotificationSound = () => {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (e) {
    console.log('Could not play notification sound')
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [soundEnabled, setSoundEnabledState] = useState(true)
  const { organizationId } = useUser()
  const { openChat, isChatOpen, chatLeadId } = useChat()
  const supabase = useMemo(() => createClient(), [])

  // Load sound preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notification_sound_enabled')
    if (stored !== null) {
      setSoundEnabledState(stored === 'true')
    }
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    localStorage.setItem('notification_sound_enabled', String(enabled))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'timestamp'>) => {
    const newToast: Toast = {
      ...toast,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
    }
    setToasts((prev) => [newToast, ...prev])

    // Play sound if enabled
    if (soundEnabled) {
      playNotificationSound()
    }
  }, [soundEnabled])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Listen for new messages from existing leads
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel('notifications-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const message = payload.new as any

          // Only notify for inbound messages
          if (message.direction !== 'inbound') return

          // Don't notify if we're currently viewing this lead's chat
          if (isChatOpen && chatLeadId === message.lead_id) return

          // Fetch lead name
          const { data: lead } = await supabase
            .from('leads')
            .select('name')
            .eq('id', message.lead_id)
            .single()

          addToast({
            type: 'new_message',
            title: `Nova poruka od ${lead?.name || 'klijenta'}`,
            message: message.content?.substring(0, 50) + (message.content?.length > 50 ? '...' : '') || 'Nova poruka',
            leadId: message.lead_id,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId, addToast, isChatOpen, chatLeadId])

  // Listen for new email candidates
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel('notifications-emails')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_candidates',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const email = payload.new as any

          // Only notify for pending emails
          if (email.status !== 'pending') return

          addToast({
            type: 'new_email',
            title: `Novi email od ${email.from_name || email.from_email}`,
            message: email.subject || 'Bez naslova',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId, addToast])

  // Listen for new custom inquiries (from qualification flow)
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel('notifications-inquiries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'custom_inquiries',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const inquiry = payload.new as any

          // Build description from qualification data
          const destination = inquiry.qualification_data?.destination?.country || ''
          const guests = inquiry.qualification_data?.guests
          const guestText = guests?.adults ? `${guests.adults + (guests.children || 0)} putnika` : ''
          const description = [destination, guestText].filter(Boolean).join(' • ')

          addToast({
            type: 'new_inquiry',
            title: `Novi upit: ${inquiry.customer_name || 'Nepoznat'}`,
            message: description || 'Novi upit sa sajta',
            leadId: inquiry.lead_id, // May be null initially, but will link later
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId, addToast])

  // Listen for offer quote confirmations
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel('notifications-offers')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offer_quotes',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const offer = payload.new as any
          const oldOffer = payload.old as any

          // Only notify when status changes to 'confirmed'
          if (offer.status === 'confirmed' && oldOffer.status !== 'confirmed') {
            addToast({
              type: 'offer_confirmed',
              title: `Ponuda potvrđena!`,
              message: `${offer.customer_name} je potvrdio ponudu od €${offer.total_amount?.toLocaleString()}`,
              leadId: offer.lead_id,
            })
          }

          // Also notify when viewed
          if (offer.status === 'viewed' && oldOffer.status === 'sent') {
            addToast({
              type: 'offer_viewed',
              title: `Ponuda pregledana`,
              message: `${offer.customer_name} je otvorio vašu ponudu`,
              leadId: offer.lead_id,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, organizationId, addToast])

  const handleOpenChat = useCallback((leadId: string) => {
    openChat(leadId)
  }, [openChat])

  return (
    <NotificationContext.Provider value={{ soundEnabled, setSoundEnabled, addToast, dismissToast }}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onOpenChat={handleOpenChat}
      />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
