'use client'

import Link from 'next/link'
import { Plane, Bus, Car, ChevronRight, FileText, File, Smartphone } from 'lucide-react'
import type { TodayDeparture, TodayReturn } from '@/types/dashboard'

interface TodaysDeparturesProps {
  departures: TodayDeparture[]
  returns: TodayReturn[]
  loading?: boolean
}

// Get transport icon
function TransportIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'flight':
      return <Plane className="w-4 h-4" />
    case 'bus':
      return <Bus className="w-4 h-4" />
    default:
      return <Car className="w-4 h-4" />
  }
}

// Format time string
function formatTime(time: string | null): string {
  if (!time) return '--:--'
  return time.substring(0, 5)
}

// Get star rating display
function StarRating({ stars }: { stars: number | null }) {
  if (!stars) return null
  return (
    <span className="text-amber-500">
      {'★'.repeat(stars)}
    </span>
  )
}

function DepartureCard({ departure }: { departure: TodayDeparture }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Time */}
        <div className="text-center min-w-[50px]">
          <div className="text-lg font-bold text-slate-900">
            {formatTime(departure.departure_time)}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 truncate">
              {departure.destination_city || departure.destination_country}
            </h4>
            {departure.hotel_name && (
              <>
                <span className="text-slate-300">-</span>
                <span className="text-sm text-slate-600 truncate">
                  {departure.hotel_name}
                </span>
              </>
            )}
            {departure.hotel_stars && (
              <StarRating stars={departure.hotel_stars} />
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <span className="font-medium">{departure.passenger_count}</span> putnika
            </span>
            <span className="flex items-center gap-1">
              <TransportIcon type={departure.transport_type} />
              {departure.transport_type === 'flight' ? 'Avion' : 
               departure.transport_type === 'bus' ? 'Autobus' : 'Sopstveni'}
            </span>
            {departure.departure_location && (
              <span className="text-slate-400 truncate">
                {departure.departure_location}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              Rooming
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
              <File className="w-3.5 h-3.5" />
              Voucher
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
              <Smartphone className="w-3.5 h-3.5" />
              Info
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReturnItem({ ret }: { ret: TodayReturn }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">
        {ret.destination} ({ret.passenger_count} putnika)
      </span>
      <span className="text-sm text-slate-400">
        {ret.arrival_time ? formatTime(ret.arrival_time) : '--:--'}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl">🏖️</span>
      </div>
      <p className="font-semibold text-slate-900">Danas nema polazaka</p>
      <p className="text-sm text-slate-500 mt-1">Uživajte u mirnom danu!</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-[50px] h-6 bg-slate-200 rounded" />
            <div className="flex-1">
              <div className="w-48 h-5 bg-slate-200 rounded" />
              <div className="w-32 h-4 bg-slate-200 rounded mt-2" />
              <div className="flex gap-2 mt-3">
                <div className="w-20 h-7 bg-slate-200 rounded-lg" />
                <div className="w-20 h-7 bg-slate-200 rounded-lg" />
                <div className="w-16 h-7 bg-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodaysDepartures({ departures, returns, loading }: TodaysDeparturesProps) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛫</span>
          <h3 className="font-semibold text-slate-900">Današnji polasci</h3>
          {departures.length > 0 && (
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
              {departures.length}
            </span>
          )}
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
            Vlastite ponude
          </span>
        </div>
        <Link
          href="/dashboard/trips"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Vidi sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : departures.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {departures.map((departure) => (
            <DepartureCard key={departure.id} departure={departure} />
          ))}
        </div>
      )}

      {/* Returns Section */}
      {returns.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🛬</span>
            <h4 className="font-medium text-slate-700">Povratci</h4>
            <span className="text-xs text-slate-400">({returns.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {returns.map((ret) => (
              <ReturnItem key={ret.id} ret={ret} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TodaysDepartures
