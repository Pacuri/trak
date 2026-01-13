'use client'

import { Clock } from 'lucide-react'
import { formatResponseTime } from '@/lib/formatting'

interface ResponseTimeDisplayProps {
  responseTimeMinutes?: number
  isWithinWorkingHours?: boolean
  compact?: boolean
}

export default function ResponseTimeDisplay({
  responseTimeMinutes = 30,
  isWithinWorkingHours = true,
  compact = false,
}: ResponseTimeDisplayProps) {
  if (compact) {
    return (
      <span className="text-sm">
        Odgovor u roku od {formatResponseTime(responseTimeMinutes)}
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
