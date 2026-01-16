'use client'

import type { LeadPriority, InquiryPriority } from '@/types/dashboard'

interface PriorityDotProps {
  priority: LeadPriority | InquiryPriority
  size?: 'sm' | 'md'
}

const priorityColors = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  normal: 'bg-emerald-500',
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
}

export function PriorityDot({ priority, size = 'md' }: PriorityDotProps) {
  return (
    <span
      className={`inline-block rounded-full ${priorityColors[priority]} ${sizeClasses[size]}`}
      title={priority === 'urgent' ? 'Hitno' : priority === 'high' ? 'Visok prioritet' : 'Normalan prioritet'}
    />
  )
}

export default PriorityDot
