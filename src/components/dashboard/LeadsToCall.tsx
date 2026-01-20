'use client'

import Link from 'next/link'
import { ChevronRight, CheckCircle } from 'lucide-react'
import type { LeadToCall } from '@/types/dashboard'

interface LeadsToCallProps {
  leads: LeadToCall[]
  loading?: boolean
}

// Format wait time in Serbian
function formatWaitTime(hours: number): string {
  if (hours < 1) return 'sada'
  if (hours < 24) return `pre ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'pre 1d'
  return `pre ${days}d`
}

function LeadRow({ lead }: { lead: LeadToCall }) {
  const priorityColor = lead.priority === 'urgent' ? 'bg-red-500' : 
                        lead.priority === 'high' ? 'bg-amber-500' : 'bg-slate-300'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Priority dot */}
      <div className={`w-2 h-2 rounded-full ${priorityColor} flex-shrink-0`} />
      
      {/* Lead info */}
      <Link 
        href={`/dashboard/leads/${lead.id}`}
        className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div className="font-medium text-slate-900 truncate">
          {lead.name}
        </div>
        <div className="text-sm text-slate-500 truncate">
          {lead.destination || 'Destinacija nije navedena'}
          {lead.guests && ` • ${lead.guests}`}
          {lead.value && ` • €${lead.value.toLocaleString()}`}
        </div>
      </Link>

      {/* Time label */}
      <span className={`text-xs font-medium whitespace-nowrap ${
        lead.priority === 'urgent' ? 'text-red-600' : 
        lead.priority === 'high' ? 'text-amber-600' : 'text-slate-400'
      }`}>
        {formatWaitTime(lead.wait_hours)}
      </span>

      {/* Phone number */}
      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0"
        >
          {lead.phone}
        </a>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
        <CheckCircle className="w-7 h-7 text-emerald-600" />
      </div>
      <p className="font-semibold text-slate-900">Sve je pod kontrolom!</p>
      <p className="text-sm text-slate-500 mt-1">Nema upita koji čekaju poziv.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-2 h-2 bg-slate-200 rounded-full" />
          <div className="flex-1">
            <div className="w-32 h-4 bg-slate-200 rounded mb-1" />
            <div className="w-48 h-3 bg-slate-200 rounded" />
          </div>
          <div className="w-12 h-4 bg-slate-200 rounded" />
          <div className="w-24 h-4 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  )
}

export function LeadsToCall({ leads, loading }: LeadsToCallProps) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📞</span>
          <h3 className="font-semibold text-slate-900">Pozovi danas</h3>
          {leads.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {leads.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/leads"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : leads.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

export default LeadsToCall
