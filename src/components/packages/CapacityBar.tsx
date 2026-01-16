'use client'

import { cn } from '@/lib/utils'
import type { CapacityBarProps } from '@/types/packages'
import { getCapacityPercentage, getCapacityColor, getCapacityString } from '@/lib/package-labels'

export function CapacityBar({ 
  total, 
  available, 
  showLabel = true,
  size = 'md' 
}: CapacityBarProps) {
  const percentage = getCapacityPercentage(total, available)
  const colorClass = getCapacityColor(percentage)
  
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div 
          className={cn('h-full transition-all duration-300', colorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {getCapacityString(total, available)}
        </span>
      )}
    </div>
  )
}
