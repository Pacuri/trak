'use client'

import Link from 'next/link'
import { CheckCircle, ChevronRight } from 'lucide-react'
import type { AttentionSection, AttentionItem } from '@/types/dashboard'

interface AttentionRequiredProps {
  sections: AttentionSection[]
  loading?: boolean
  onInquiryClick: (id: string) => void
}

const categoryConfig = {
  late_payments: {
    icon: '💳',
    label: 'Kasne uplate',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  expiring_reservations: {
    icon: '⏰',
    label: 'Rez. ističu',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  last_seats: {
    icon: '🔥',
    label: 'Poslednja mesta',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  unanswered_inquiries: {
    icon: '📋',
    label: 'Upiti bez odg.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
}

function AttentionItemRow({ 
  item, 
  onInquiryClick 
}: { 
  item: AttentionItem
  onInquiryClick: (id: string) => void 
}) {
  const handleClick = () => {
    if (item.inquiry_id) {
      onInquiryClick(item.inquiry_id)
    }
  }

  const content = (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
          {item.title}
        </span>
        {item.subtitle && (
          <span className="text-xs text-slate-400 ml-2">
            - {item.subtitle}
          </span>
        )}
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ml-2 ${
        item.urgency === 'critical' ? 'text-red-600' : 
        item.urgency === 'warning' ? 'text-amber-600' : 'text-slate-500'
      }`}>
        {item.meta}
      </span>
    </div>
  )

  if (item.link) {
    return (
      <Link href={item.link}>
        {content}
      </Link>
    )
  }

  return (
    <div onClick={handleClick}>
      {content}
    </div>
  )
}

function CategorySection({ 
  section, 
  onInquiryClick 
}: { 
  section: AttentionSection
  onInquiryClick: (id: string) => void 
}) {
  const config = categoryConfig[section.category]

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span>{config.icon}</span>
        <span className={`text-sm font-semibold ${config.color}`}>
          {config.label}
        </span>
        <span className={`px-1.5 py-0.5 ${config.bgColor} ${config.color} text-xs font-medium rounded`}>
          {section.count}
        </span>
      </div>
      <div className="space-y-1">
        {section.items.map((item) => (
          <AttentionItemRow 
            key={item.id} 
            item={item} 
            onInquiryClick={onInquiryClick}
          />
        ))}
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
      <p className="font-semibold text-slate-900">Odlično!</p>
      <p className="text-sm text-slate-500 mt-1">Nema hitnih stavki.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="w-24 h-4 bg-slate-200 rounded" />
            <div className="w-6 h-4 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-8 bg-slate-100 rounded-lg" />
            <div className="w-full h-8 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AttentionRequired({ sections, loading, onInquiryClick }: AttentionRequiredProps) {
  const totalCount = sections.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <h3 className="font-semibold text-slate-900">Zahteva pažnju</h3>
          {totalCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : sections.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => (
            <CategorySection 
              key={section.category} 
              section={section}
              onInquiryClick={onInquiryClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AttentionRequired
