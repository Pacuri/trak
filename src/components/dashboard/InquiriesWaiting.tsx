'use client'

import { ChevronRight, CheckCircle } from 'lucide-react'
import { PriorityDot } from './PriorityDot'
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
  if (days === 1) return 'pre 1 dan'
  return `pre ${days} dana`
}

function InquiryCard({ 
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
  const guestText = guests ? `${guests.adults}${guests.children ? `+${guests.children}` : ''} osoba` : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <PriorityDot priority={inquiry.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                {inquiry.customer_name}
              </h4>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase whitespace-nowrap">
                Na upit
              </span>
            </div>
            <span className={`text-xs font-medium whitespace-nowrap ${
              inquiry.priority === 'urgent' ? 'text-red-600' : 
              inquiry.priority === 'high' ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {formatWaitTime(inquiry.wait_hours)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {destination}
            {guestText && ` • ${guestText}`}
          </p>
          
          {inquiry.customer_note && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic">
              "{inquiry.customer_note}"
            </p>
          )}
          
          {/* Respond Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="mt-3 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Odgovori
          </button>
        </div>
      </div>
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
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 bg-slate-200 rounded-full mt-1.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-28 h-5 bg-slate-200 rounded" />
                  <div className="w-14 h-4 bg-purple-100 rounded" />
                </div>
                <div className="w-12 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-40 h-4 bg-slate-200 rounded mt-2" />
              <div className="w-20 h-8 bg-slate-200 rounded-lg mt-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InquiriesWaiting({ inquiries, loading, onInquiryClick }: InquiriesWaitingProps) {
  return (
    <div className="bg-slate-50 rounded-[14px] p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-slate-900">Upiti čekaju</h3>
          {inquiries.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              {inquiries.length}
            </span>
          )}
        </div>
        <button className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          Vidi sve
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : inquiries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard 
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
