'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plane, Users, Euro } from 'lucide-react'
import { useBookings } from '@/hooks/use-bookings'
import type { Booking } from '@/types'
import TripColumn from '@/components/trips/TripColumn'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, parseISO } from 'date-fns'
import { sr } from 'date-fns/locale'

export default function TripsPage() {
  const { getBookings, getStats, loading } = useBookings()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ confirmed: 0, cancelled: 0, totalRevenue: 0 })
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/badb4ed9-fce4-4d3e-8955-79ca35110574',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trips/page.tsx:useEffect',message:'TripsPage useEffect triggered',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    loadData()
  }, [])

  const loadData = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/badb4ed9-fce4-4d3e-8955-79ca35110574',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trips/page.tsx:loadData:start',message:'loadData called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const [bookingsData, statsData] = await Promise.all([
      getBookings({ status: 'confirmed' }),
      getStats(),
    ])
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/badb4ed9-fce4-4d3e-8955-79ca35110574',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'trips/page.tsx:loadData:result',message:'loadData received data',data:{bookingsCount:bookingsData.length,stats:statsData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    setBookings(bookingsData)
    setStats(statsData)
  }

  // Calculate week dates
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Group bookings by travel date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, Booking[]> = {}
    
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd')
      grouped[dateStr] = []
    }

    for (const booking of bookings) {
      if (!booking.travel_date) continue
      const dateStr = booking.travel_date.split('T')[0]
      if (grouped[dateStr]) {
        grouped[dateStr].push(booking)
      }
    }

    return grouped
  }, [bookings, weekDays])

  // Calculate totals for the week
  const weekTotals = useMemo(() => {
    let travelers = 0
    let revenue = 0
    let trips = 0

    for (const dateStr of Object.keys(bookingsByDate)) {
      const dayBookings = bookingsByDate[dateStr]
      trips += dayBookings.length
      for (const booking of dayBookings) {
        travelers += booking.adults + (booking.children || 0)
        revenue += booking.total_amount
      }
    }

    return { travelers, revenue, trips }
  }, [bookingsByDate])

  const handlePrevWeek = () => setWeekOffset(weekOffset - 1)
  const handleNextWeek = () => setWeekOffset(weekOffset + 1)
  const handleToday = () => setWeekOffset(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Aranzmani</h1>
          <p className="text-sm text-[#64748B] mt-1">Pregled putovanja po datumu polaska</p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-[#64748B]" />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            Danas
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-[#64748B]" />
          </button>
          <span className="ml-2 text-sm font-medium text-[#1E293B]">
            {format(weekStart, 'd MMM', { locale: sr })} - {format(weekEnd, 'd MMM yyyy', { locale: sr })}
          </span>
        </div>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Putovanja ove nedelje</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">{weekTotals.trips}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Plane className="h-6 w-6 text-[#3B82F6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Putnika ove nedelje</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">{weekTotals.travelers}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3FF]">
              <Users className="h-6 w-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Vrednost ove nedelje</p>
              <p className="text-2xl font-bold text-[#10B981] mt-1">
                {weekTotals.revenue.toLocaleString()} EUR
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Euro className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading && bookings.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              return (
                <TripColumn
                  key={dateStr}
                  date={dateStr}
                  bookings={bookingsByDate[dateStr] || []}
                  onBookingClick={(id) => {
                    // TODO: Open booking details
                    console.log('Open booking', id)
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="rounded-[14px] bg-[#F8FAFC] p-5 border border-[#E2E8F0]">
        <h3 className="text-sm font-semibold text-[#1E293B] mb-3">Ukupna statistika</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#64748B]">Ukupno aranzmana</p>
            <p className="text-lg font-bold text-[#1E293B]">{stats.confirmed}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Otkazano</p>
            <p className="text-lg font-bold text-[#EF4444]">{stats.cancelled}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B]">Ukupna vrednost</p>
            <p className="text-lg font-bold text-[#10B981]">{stats.totalRevenue.toLocaleString()} EUR</p>
          </div>
        </div>
      </div>
    </div>
  )
}
