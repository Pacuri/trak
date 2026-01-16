'use client'

import { CheckCircle, Package, Calendar, FileText, Phone } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

const defaultIcons = {
  success: <CheckCircle className="w-7 h-7 text-emerald-600" />,
  package: <Package className="w-7 h-7 text-slate-400" />,
  calendar: <Calendar className="w-7 h-7 text-teal-600" />,
  document: <FileText className="w-7 h-7 text-purple-600" />,
  phone: <Phone className="w-7 h-7 text-blue-600" />,
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        {icon || defaultIcons.success}
      </div>
      <p className="font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
