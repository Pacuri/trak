'use client'

import Link from 'next/link'
import { Phone, MessageCircle, ChevronRight, CheckCircle } from 'lucide-react'
import { PriorityDot } from './PriorityDot'
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
  if (days === 1) return 'pre 1 dan'
  return `pre ${days} dana`
}

// Format phone for Viber link
function formatViberLink(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '')
  return `viber://chat?number=${encodeURIComponent(cleaned)}`
}

function LeadCard({ lead }: { lead: LeadToCall }) {
  return (
    <Link
      href={`/dashboard/leads/${lead.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="flex items-start gap-3">
        <PriorityDot priority={lead.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {lead.name}
            </h4>
            <span className={`text-xs font-medium whitespace-nowrap ${
              lead.priority === 'urgent' ? 'text-red-600' : 
              lead.priority === 'high' ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {formatWaitTime(lead.wait_hours)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {lead.destination || 'Destinacija nije navedena'}
            {lead.guests && ` • ${lead.guests} osoba`}
            {lead.value && ` • €${lead.value.toLocaleString()}`}
          </p>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            {lead.phone && (
              <>
                <a
                  href={`tel:${lead.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Pozovi
                </a>
                <a
                  href={formatViberLink(lead.phone)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Viber
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
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
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-full mt-1.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-slate-200 rounded" />
                <div className="w-16 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-48 h-4 bg-slate-200 rounded mt-2" />
              <div className="flex gap-2 mt-3">
                <div className="w-20 h-8 bg-slate-200 rounded-lg" />
                <div className="w-16 h-8 bg-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function LeadsToCall({ leads, loading }: LeadsToCallProps) {
  return (
    <div className="bg-slate-50 rounded-[14px] p-4 h-full">
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
          Vidi sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : leads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

export default LeadsToCall
