'use client'

import Link from 'next/link'
import { ChevronRight, CheckCircle } from 'lucide-react'
import type { PendingInquiry } from '@/types/dashboard'

interface InquiriesWaitingProps {
  inquiries: PendingInquiry[]
  loading?: boolean
  onInquiryClick: (inquiry: PendingInquiry) => void
}

// Format wait time in Serbian
function formatWaitTime(hours: number): string {
  if (hours < 1) return 'sada'
  if (hours < 24) return `pre ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'pre 1d'
  return `pre ${days}d`
}

function InquiryRow({ 
  inquiry, 
  onClick 
}: { 
  inquiry: PendingInquiry
  onClick: () => void 
}) {
  const destination = inquiry.qualification_data?.destination?.country || 
    inquiry.qualification_data?.destination?.city || 
    'Destinacija nije navedena'
  
  const guests = inquiry.qualification_data?.guests
  const guestText = guests ? `${guests.adults}${guests.children ? `+${guests.children}` : ''}` : null
  
  // Try to get travel month from qualification data
  const travelMonth = inquiry.qualification_data?.dates?.month
  const monthText = travelMonth || null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Priority dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        inquiry.priority === 'urgent' ? 'bg-red-500' : 
        inquiry.priority === 'high' ? 'bg-amber-500' : 'bg-slate-300'
      }`} />
      
      {/* Inquiry info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">
            {inquiry.customer_name}
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase whitespace-nowrap">
            UPIT
          </span>
        </div>
        <div className="text-sm text-slate-500 truncate">
          {destination}
          {guestText && ` • ${guestText}`}
          {monthText && ` • ${monthText}`}
        </div>
      </div>

      {/* Time label */}
      <span className={`text-xs font-medium whitespace-nowrap ${
        inquiry.priority === 'urgent' ? 'text-red-600' : 
        inquiry.priority === 'high' ? 'text-amber-600' : 'text-slate-400'
      }`}>
        {formatWaitTime(inquiry.wait_hours)}
      </span>

      {/* Respond button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex-shrink-0"
      >
        Odgovori
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
        <CheckCircle className="w-7 h-7 text-emerald-600" />
      </div>
      <p className="font-semibold text-slate-900">Nema upita!</p>
      <p className="text-sm text-slate-500 mt-1">Svi upiti su obrađeni.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-2 h-2 bg-slate-200 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-28 h-4 bg-slate-200 rounded" />
              <div className="w-14 h-4 bg-emerald-100 rounded" />
            </div>
            <div className="w-40 h-3 bg-slate-200 rounded" />
          </div>
          <div className="w-12 h-4 bg-slate-200 rounded" />
          <div className="w-20 h-8 bg-slate-200 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function InquiriesWaiting({ inquiries, loading, onInquiryClick }: InquiriesWaitingProps) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-slate-900">Upiti čekaju odgovor</h3>
          {inquiries.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              {inquiries.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/inquiries"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="text-xs text-slate-400 mb-3">
        Individualna putovanja
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : inquiries.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {inquiries.map((inquiry) => (
            <InquiryRow 
              key={inquiry.id} 
              inquiry={inquiry} 
              onClick={() => onInquiryClick(inquiry)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default InquiriesWaiting
