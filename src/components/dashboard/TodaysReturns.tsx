'use client'

import Link from 'next/link'
import { ChevronRight, MapPin, Users, Plane, Bus, Car } from 'lucide-react'
import type { TodayReturn } from '@/types/dashboard'

interface TodaysReturnsProps {
  returns: TodayReturn[]
  loading?: boolean
}

// Get transport icon
function getTransportIcon(type: string | null) {
  switch (type) {
    case 'avion':
    case 'flight':
      return <Plane className="w-3.5 h-3.5" />
    case 'autobus':
    case 'bus':
      return <Bus className="w-3.5 h-3.5" />
    default:
      return <Car className="w-3.5 h-3.5" />
  }
}

// Format time string
function formatTime(time: string | null): string {
  if (!time) return '--:--'
  return time.substring(0, 5)
}

function ReturnRow({ ret }: { ret: TodayReturn }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Time Badge */}
      <div className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold min-w-[52px] text-center">
        {formatTime(ret.arrival_time)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate text-sm">
            {ret.destination}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {ret.passenger_count}
          </span>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl">🛬</span>
      </div>
      <p className="font-semibold text-slate-900">Nema povrataka</p>
      <p className="text-sm text-slate-500 mt-1">Danas niko ne stiže.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-[52px] h-7 bg-amber-100 rounded-lg" />
          <div className="flex-1">
            <div className="w-28 h-4 bg-slate-200 rounded mb-1" />
            <div className="w-16 h-3 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodaysReturns({ returns, loading }: TodaysReturnsProps) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛬</span>
          <h3 className="font-semibold text-slate-900">Povratci</h3>
          {returns.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {returns.length}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/trips"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="text-xs text-slate-400 mb-3">
        Današnji dolasci
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : returns.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {returns.slice(0, 5).map((ret) => (
            <ReturnRow key={ret.id} ret={ret} />
          ))}
          {returns.length > 5 && (
            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">
                +{returns.length - 5} više
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TodaysReturns
