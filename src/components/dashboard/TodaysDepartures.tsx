'use client'

import Link from 'next/link'
import { Plane, Bus, Car, ChevronRight, FileText, File, Info, MapPin, Users } from 'lucide-react'
import type { TodayDeparture, TodayReturn } from '@/types/dashboard'

interface TodaysDeparturesProps {
  departures: TodayDeparture[]
  returns: TodayReturn[]
  loading?: boolean
}

// Get transport icon and label
function getTransportInfo(type: string | null): { icon: React.ReactNode; label: string } {
  switch (type) {
    case 'avion':
    case 'flight':
      return { icon: <Plane className="w-4 h-4" />, label: 'Avion' }
    case 'autobus':
    case 'bus':
      return { icon: <Bus className="w-4 h-4" />, label: 'Autobus' }
    default:
      return { icon: <Car className="w-4 h-4" />, label: 'Sopstveni' }
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
    <span className="text-amber-500 text-sm">
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  )
}

function DepartureCard({ departure }: { departure: TodayDeparture }) {
  const transport = getTransportInfo(departure.transport_type)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Time Badge */}
        <div className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-bold min-w-[60px] text-center">
          {formatTime(departure.departure_time)}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-900">
              {departure.destination_city || departure.destination_country}
              {departure.hotel_name && (
                <span className="text-slate-600 font-normal"> - {departure.hotel_name}</span>
              )}
            </h4>
            {departure.hotel_stars && (
              <StarRating stars={departure.hotel_stars} />
            )}
          </div>

          {/* Meta info row */}
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{departure.passenger_count}</span> putnika
            </span>
            <span className="flex items-center gap-1.5">
              {transport.icon}
              {transport.label}
            </span>
            {departure.departure_location && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 text-red-400" />
                {departure.departure_location}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200">
              <FileText className="w-3.5 h-3.5" />
              Rooming
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200">
              <File className="w-3.5 h-3.5" />
              Voucher
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors border border-slate-200">
              <Info className="w-3.5 h-3.5" />
              Info
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReturnRow({ ret }: { ret: TodayReturn }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-slate-600">
        {ret.destination} ({ret.passenger_count} putnika)
      </span>
      <span className="text-slate-500 font-medium">
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
            <div className="w-[60px] h-8 bg-teal-100 rounded-lg" />
            <div className="flex-1">
              <div className="w-48 h-5 bg-slate-200 rounded" />
              <div className="flex gap-4 mt-2">
                <div className="w-20 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
                <div className="w-24 h-4 bg-slate-200 rounded" />
              </div>
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
            Fiksne ponude
          </span>
        </div>
        <Link
          href="/dashboard/trips"
          className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 font-medium"
        >
          Svi polasci
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
            <span className="text-base">🛬</span>
            <h4 className="font-medium text-slate-700">Današnji povratci ({returns.length})</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {returns.map((ret) => (
              <ReturnRow key={ret.id} ret={ret} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TodaysDepartures
