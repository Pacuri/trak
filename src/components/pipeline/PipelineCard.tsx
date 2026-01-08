'use client'

import { AlertCircle } from 'lucide-react'
import type { Lead } from '@/types'
import { differenceInDays } from 'date-fns'

interface PipelineCardProps {
  lead: Lead
  onClick: () => void
}

export default function PipelineCard({ lead, onClick }: PipelineCardProps) {
  const daysAgo = differenceInDays(new Date(), new Date(lead.created_at))
  const needsAttention =
    !lead.last_contact_at ||
    differenceInDays(new Date(), new Date(lead.last_contact_at || lead.created_at)) >= 3

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[10px] border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-[#1E293B] text-sm">{lead.name}</h3>
        {needsAttention && (
          <AlertCircle className="h-4 w-4 text-[#F59E0B] flex-shrink-0 ml-2" />
        )}
      </div>

      {lead.destination && (
        <p className="text-xs text-[#64748B] mb-3 truncate">{lead.destination}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        {lead.value && (
          <span className="text-sm font-semibold text-[#10B981]">
            ${lead.value.toLocaleString()}
          </span>
        )}
        <span className={`text-xs ${daysAgo >= 3 ? 'text-[#EF4444]' : 'text-[#64748B]'}`}>
          {daysAgo}d ago
        </span>
      </div>
    </div>
  )
}
