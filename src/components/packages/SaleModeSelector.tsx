'use client'

import { cn } from '@/lib/utils'
import type { SaleMode } from '@/types/packages'
import { Users, CalendarDays, User } from 'lucide-react'

interface SaleModeSelectorProps {
  value?: SaleMode
  onChange: (value: SaleMode) => void
  disabled?: boolean
}

const SALE_MODES: {
  value: SaleMode
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'GRUPNO_SMENA',
    label: 'Grupno + Smena',
    description: 'Organizovane ture sa autobusom, rotacija grupa',
    icon: <Users className="h-6 w-6" />,
  },
  {
    value: 'GRUPNO',
    label: 'Grupno',
    description: 'Fiksni datumi bez smene',
    icon: <CalendarDays className="h-6 w-6" />,
  },
  {
    value: 'INDIVIDUALNO',
    label: 'Individualno',
    description: 'Gost bira datume, sopstveni ili organizovan prevoz',
    icon: <User className="h-6 w-6" />,
  },
]

export function SaleModeSelector({ value, onChange, disabled }: SaleModeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Način prodaje
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {SALE_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
              value === mode.value
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={cn(
                'rounded-full p-2',
                value === mode.value ? 'bg-teal-100' : 'bg-gray-100'
              )}
            >
              {mode.icon}
            </div>
            <span className="font-medium">{mode.label}</span>
            <span className="text-xs text-gray-500">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
