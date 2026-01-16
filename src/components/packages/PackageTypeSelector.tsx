'use client'

import { cn } from '@/lib/utils'
import type { PackageType } from '@/types/packages'
import { PACKAGE_TYPE_LABELS, PACKAGE_TYPE_DESCRIPTIONS } from '@/lib/package-labels'
import { Building2, MessageCircleQuestion } from 'lucide-react'

interface PackageTypeSelectorProps {
  value: PackageType
  onChange: (value: PackageType) => void
  disabled?: boolean
}

export function PackageTypeSelector({ value, onChange, disabled }: PackageTypeSelectorProps) {
  const options: { type: PackageType; icon: React.ReactNode }[] = [
    { type: 'fiksni', icon: <Building2 className="h-6 w-6" /> },
    { type: 'na_upit', icon: <MessageCircleQuestion className="h-6 w-6" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {options.map(({ type, icon }) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onChange(type)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
            'hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20',
            value === type
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 bg-white',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className={cn(
            'p-3 rounded-full',
            value === type ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
          )}>
            {icon}
          </div>
          <div className="text-center">
            <p className={cn(
              'font-semibold text-sm',
              value === type ? 'text-teal-700' : 'text-gray-700'
            )}>
              {PACKAGE_TYPE_LABELS[type].split('(')[0].trim()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {PACKAGE_TYPE_DESCRIPTIONS[type]}
            </p>
          </div>
          {value === type && (
            <div className="absolute top-2 right-2 h-5 w-5 bg-teal-500 rounded-full flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
