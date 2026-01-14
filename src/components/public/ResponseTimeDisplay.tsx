'use client'

import { Clock } from 'lucide-react'
import { formatResponseTime } from '@/lib/formatting'

interface ResponseTimeDisplayProps {
  responseTimeMinutes?: number
  isWithinWorkingHours?: boolean
  compact?: boolean
  inline?: boolean
}

export default function ResponseTimeDisplay({
  responseTimeMinutes = 30,
  isWithinWorkingHours = true,
  compact = false,
  inline = false,
}: ResponseTimeDisplayProps) {
  if (compact || inline) {
    return (
      <span className={inline ? 'text-xs' : 'text-sm'}>
        {inline ? formatResponseTime(responseTimeMinutes) : `Odgovor u roku od ${formatResponseTime(responseTimeMinutes)}`}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 text-blue-600">
      <Clock className="w-4 h-4" />
      <div className="text-sm">
        <span>Odgovor u roku od </span>
        <span className="font-semibold">{formatResponseTime(responseTimeMinutes)}</span>
        {!isWithinWorkingHours && (
          <span className="text-gray-500"> (van radnog vremena)</span>
        )}
      </div>
    </div>
  )
}
