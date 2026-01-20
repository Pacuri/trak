'use client'

import Link from 'next/link'
import { ChevronRight, Hotel } from 'lucide-react'
import type { PackageCapacity } from '@/types/dashboard'

interface CapacityOverviewProps {
  packages: PackageCapacity[]
  loading?: boolean
}

// Get day name in Serbian (short)
function getDayShort(day: number | null): string {
  if (day === null) return ''
  const days = ['Ned', 'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub']
  return days[day]
}

// Format date for display
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = date.getMonth() + 1
  return `${day}.${month}.`
}

// Get month name short
function getMonthShort(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
  return months[month]
}

// Get season description from packages
function getSeasonDescription(packages: PackageCapacity[]): string {
  if (packages.length === 0) return ''
  
  const now = new Date()
  const year = now.getFullYear()
  
  // Find the range of months covered
  const months = new Set<number>()
  packages.forEach(pkg => {
    if (pkg.rental_period_start && pkg.rental_period_end) {
      const start = new Date(pkg.rental_period_start)
      const end = new Date(pkg.rental_period_end)
      for (let m = start.getMonth(); m <= end.getMonth(); m++) {
        months.add(m)
      }
    }
  })
  
  if (months.size === 0) return `Sezona ${year}`
  
  const sortedMonths = Array.from(months).sort((a, b) => a - b)
  const monthNames = sortedMonths.map(m => getMonthShort(m))
  
  return `Sezona ${year} - ${monthNames.join('/')}`
}

// Get color based on fill percentage
function getCapacityColor(percentage: number): {
  bar: string
  text: string
} {
  if (percentage >= 90) {
    return { bar: 'bg-red-500', text: 'text-red-600' }
  }
  if (percentage >= 70) {
    return { bar: 'bg-amber-500', text: 'text-amber-600' }
  }
  if (percentage >= 50) {
    return { bar: 'bg-emerald-500', text: 'text-emerald-600' }
  }
  return { bar: 'bg-blue-500', text: 'text-blue-600' }
}

function CapacityBar({ percentage }: { percentage: number }) {
  const colors = getCapacityColor(percentage)
  
  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors.bar} transition-all duration-500 rounded-full`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

// Star rating display
function StarRating({ stars }: { stars: number | null }) {
  if (!stars) return null
  return (
    <span className="text-amber-500 text-sm ml-1">
      {'★'.repeat(stars)}
    </span>
  )
}

function PackageRow({ pkg }: { pkg: PackageCapacity }) {
  const colors = getCapacityColor(pkg.fill_percentage)
  const isUrgent = pkg.next_departure && pkg.next_departure.available <= 3

  return (
    <div className="py-4 border-b border-slate-100 last:border-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Hotel className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-900 truncate">
                {pkg.destination_city || pkg.destination_country}
                {pkg.hotel_name && ` - ${pkg.hotel_name}`}
              </span>
              {pkg.hotel_stars && <StarRating stars={pkg.hotel_stars} />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {pkg.rental_period_start && pkg.rental_period_end && (
                <>
                  {formatDateShort(pkg.rental_period_start)} - {formatDateShort(pkg.rental_period_end)}
                </>
              )}
              {pkg.departure_day !== null && (
                <> • {getDayShort(pkg.departure_day)}om</>
              )}
              {pkg.total_spots > 0 && (
                <> • {pkg.total_spots} mesta</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-2">
        <CapacityBar percentage={pkg.fill_percentage} />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {pkg.booked_spots} / {pkg.total_spots} mesta
        </span>
        <span className={`text-sm font-bold ${colors.text}`}>
          {pkg.fill_percentage}%
        </span>
      </div>

      {/* Next departure info */}
      {pkg.next_departure && (
        <div className={`mt-2 text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-slate-500'}`}>
          {isUrgent && '🔥 '}
          Sledeći: {getDayShort(new Date(pkg.next_departure.date).getDay())} {formatDateShort(pkg.next_departure.date)} - {isUrgent ? `samo ${pkg.next_departure.available} mesta!` : `${pkg.next_departure.available} mesta`}
        </div>
      )}
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
    <div className="space-y-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="py-4 border-b border-slate-100 animate-pulse">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="flex-1">
              <div className="w-48 h-4 bg-slate-200 rounded mb-1" />
              <div className="w-32 h-3 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full mb-2" />
          <div className="flex justify-between">
            <div className="w-24 h-4 bg-slate-200 rounded" />
            <div className="w-12 h-4 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CapacityOverview({ packages, loading }: CapacityOverviewProps) {
  const seasonDescription = getSeasonDescription(packages)

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-slate-900">Popunjenost</h3>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
            Fiksne ponude
          </span>
        </div>
        <Link
          href="/dashboard/packages"
          className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1 font-medium"
        >
          Svi paketi
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Season header */}
      {packages.length > 0 && seasonDescription && (
        <p className="text-xs text-slate-400 mb-4">{seasonDescription}</p>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : packages.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {packages.map((pkg) => (
            <PackageRow key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CapacityOverview
