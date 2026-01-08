'use client'

import { AlertTriangle, MapPin, Calendar } from 'lucide-react'
import type { Lead } from '@/types'
import { differenceInDays } from 'date-fns'

interface PipelineCardProps {
  lead: Lead
  onClick: () => void
}

export default function PipelineCard({ lead, onClick }: PipelineCardProps) {
  const daysAgo = differenceInDays(new Date(), new Date(lead.created_at))
  const lastContactDays = lead.last_contact_at
    ? differenceInDays(new Date(), new Date(lead.last_contact_at))
    : daysAgo
  const needsAttention = lastContactDays >= 3

  const formatDaysAgo = (days: number) => {
    if (days === 0) return 'Danas'
    if (days === 1) return 'Juče'
    return `pre ${days} ${days === 1 ? 'dan' : 'dana'}`
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[10px] border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md hover:border-[#3B82F6]/30 transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-[#1E293B] text-sm group-hover:text-[#3B82F6] transition-colors">
          {lead.name}
        </h3>
        {needsAttention && (
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-[#FEF2F2] flex-shrink-0">
            <AlertTriangle className="h-3 w-3 text-[#EF4444]" />
          </div>
        )}
      </div>

      {/* Destination */}
      {lead.destination && (
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="h-3.5 w-3.5 text-[#94A3B8]" />
          <p className="text-xs text-[#64748B] truncate">{lead.destination}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
        {lead.value ? (
          <span className="text-sm font-bold text-[#10B981]">
            €{lead.value.toLocaleString()}
          </span>
        ) : (
          <span className="text-xs text-[#94A3B8]">Bez vrednosti</span>
        )}

        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-[#94A3B8]" />
          <span className={`text-xs font-medium ${
            lastContactDays >= 4
              ? 'text-[#EF4444]'
              : lastContactDays >= 3
                ? 'text-[#F59E0B]'
                : 'text-[#64748B]'
          }`}>
            {formatDaysAgo(lastContactDays)}
          </span>
        </div>
      </div>
    </div>
  )
}
