'use client'

import { Phone, MessageCircle, Mail } from 'lucide-react'

interface QuickActionButtonsProps {
  phone?: string | null
  email?: string | null
  showEmail?: boolean
  size?: 'sm' | 'md'
}

// Format phone for Viber link
function formatViberLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return `viber://chat?number=${encodeURIComponent(cleaned)}`
}

// Format phone for WhatsApp link
function formatWhatsAppLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${cleaned}`
}

export function QuickActionButtons({ 
  phone, 
  email, 
  showEmail = false,
  size = 'md' 
}: QuickActionButtonsProps) {
  const sizeClasses = {
    sm: {
      button: 'px-2.5 py-1 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1',
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5',
    },
  }

  const classes = sizeClasses[size]

  if (!phone && !email) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {phone && (
        <>
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center ${classes.gap} ${classes.button} bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors`}
          >
            <Phone className={classes.icon} />
            Pozovi
          </a>
          <a
            href={formatViberLink(phone)}
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center ${classes.gap} ${classes.button} bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 transition-colors`}
          >
            <MessageCircle className={classes.icon} />
            Viber
          </a>
        </>
      )}
      {showEmail && email && (
        <a
          href={`mailto:${email}`}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center ${classes.gap} ${classes.button} bg-slate-50 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors`}
        >
          <Mail className={classes.icon} />
          Email
        </a>
      )}
    </div>
  )
}

export default QuickActionButtons
