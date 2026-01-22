'use client'

import { useEffect, useState } from 'react'
import { X, Mail, MessageSquare, ExternalLink, UserPlus, CheckCircle, Eye } from 'lucide-react'

export interface Toast {
  id: string
  type: 'new_message' | 'new_email' | 'new_inquiry' | 'offer_confirmed' | 'offer_viewed'
  title: string
  message: string
  leadId?: string
  timestamp: Date
}

interface ToastNotificationProps {
  toast: Toast
  onDismiss: (id: string) => void
  onOpenChat?: (leadId: string) => void
}

export function ToastNotification({ toast, onDismiss, onOpenChat }: ToastNotificationProps) {
  const [isLeaving, setIsLeaving] = useState(false)

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  const handleOpenChat = () => {
    if (toast.leadId && onOpenChat) {
      onOpenChat(toast.leadId)
      handleDismiss()
    }
  }

  const Icon =
    toast.type === 'new_email' ? Mail :
    toast.type === 'new_inquiry' ? UserPlus :
    toast.type === 'offer_confirmed' ? CheckCircle :
    toast.type === 'offer_viewed' ? Eye :
    MessageSquare

  const getIconStyles = () => {
    switch (toast.type) {
      case 'new_email': return { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-500' }
      case 'new_inquiry': return { bg: 'bg-teal-100', text: 'text-teal-600', bar: 'bg-teal-500' }
      case 'offer_confirmed': return { bg: 'bg-emerald-100', text: 'text-emerald-600', bar: 'bg-emerald-500' }
      case 'offer_viewed': return { bg: 'bg-amber-100', text: 'text-amber-600', bar: 'bg-amber-500' }
      default: return { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-500' }
    }
  }
  const styles = getIconStyles()

  return (
    <div
      className={`
        w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden
        transform transition-all duration-300 ease-out
        ${isLeaving ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${styles.bg}
          `}>
            <Icon className={`w-5 h-5 ${styles.text}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {toast.title}
            </p>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {toast.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action button */}
        {toast.leadId && onOpenChat && (
          <button
            onClick={handleOpenChat}
            className="mt-3 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Otvori razgovor
          </button>
        )}
      </div>

      {/* Progress bar for auto-dismiss */}
      <div className="h-1 bg-slate-100">
        <div
          className={`h-full ${styles.bar} animate-shrink-width`}
          style={{ animationDuration: '5s' }}
        />
      </div>
    </div>
  )
}

// Container for stacking toasts
interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  onOpenChat?: (leadId: string) => void
}

export function ToastContainer({ toasts, onDismiss, onOpenChat }: ToastContainerProps) {
  // Only show max 3 toasts
  const visibleToasts = toasts.slice(0, 3)

  if (visibleToasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {visibleToasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  )
}
