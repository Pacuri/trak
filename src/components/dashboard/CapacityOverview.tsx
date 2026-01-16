'use client'

import Link from 'next/link'
import { ChevronRight, Package } from 'lucide-react'
import type { PackageCapacity } from '@/types/dashboard'

interface CapacityOverviewProps {
  packages: PackageCapacity[]
  loading?: boolean
}

// Get day name in Serbian
function getDayName(day: number | null): string {
  if (day === null) return ''
  const days = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
  return days[day]
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${day}.${month}.`
}

// Get color based on fill percentage
function getCapacityColor(percentage: number): {
  bar: string
  text: string
  bg: string
} {
  if (percentage >= 90) {
    return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
  }
  if (percentage >= 70) {
    return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
  }
  return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
}

function CapacityBar({ percentage }: { percentage: number }) {
  const colors = getCapacityColor(percentage)
  
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors.bar} transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

function PackageCard({ pkg }: { pkg: PackageCapacity }) {
  const colors = getCapacityColor(pkg.fill_percentage)
  const isUrgent = pkg.next_departure && pkg.next_departure.available <= 3

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <h4 className="font-semibold text-slate-900 truncate text-sm">
              {pkg.destination_city || pkg.destination_country}
              {pkg.hotel_name && ` - ${pkg.hotel_name}`}
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {pkg.rental_period_start && pkg.rental_period_end && (
              <>
                {formatDate(pkg.rental_period_start)} - {formatDate(pkg.rental_period_end)}
              </>
            )}
            {pkg.departure_day !== null && (
              <> • {getDayName(pkg.departure_day)}</>
            )}
            {pkg.total_spots > 0 && (
              <> • {pkg.total_spots}m</>
            )}
          </p>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>
          {pkg.fill_percentage}%
        </span>
      </div>

      <CapacityBar percentage={pkg.fill_percentage} />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">
          {pkg.booked_spots}/{pkg.total_spots} mesta
        </span>
        {pkg.next_departure && (
          <span className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-slate-500'}`}>
            {isUrgent && '🔥 '}
            Sledeći: {formatDate(pkg.next_departure.date)} - {pkg.next_departure.available} mesta
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <span className="text-2xl">📊</span>
      </div>
      <p className="font-semibold text-slate-900">Nema podataka</p>
      <p className="text-sm text-slate-500 mt-1">Dodajte vlastite pakete da vidite popunjenost.</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-4 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="w-40 h-4 bg-slate-200 rounded" />
              <div className="w-28 h-3 bg-slate-200 rounded mt-2" />
            </div>
            <div className="w-12 h-6 bg-slate-200 rounded" />
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full" />
          <div className="flex justify-between mt-2">
            <div className="w-20 h-3 bg-slate-200 rounded" />
            <div className="w-32 h-3 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CapacityOverview({ packages, loading }: CapacityOverviewProps) {
  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-slate-900">Popunjenost</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
            Vlastite ponude
          </span>
        </div>
        <Link
          href="/dashboard/packages"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Vidi sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : packages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CapacityOverview
