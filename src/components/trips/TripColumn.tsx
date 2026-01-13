'use client'

import { Calendar, Users } from 'lucide-react'
import type { Booking } from '@/types'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { sr } from 'date-fns/locale'
import TravelerCard from './TravelerCard'

interface TripColumnProps {
  date: string
  bookings: Booking[]
  onBookingClick?: (id: string) => void
}

export default function TripColumn({ date, bookings, onBookingClick }: TripColumnProps) {
  const dateObj = new Date(date)
  const today = isToday(dateObj)
  const tomorrow = isTomorrow(dateObj)
  const past = isPast(dateObj) && !today

  const getHeaderColor = () => {
    if (today) return 'bg-[#10B981] text-white'
    if (tomorrow) return 'bg-[#F97316] text-white'
    if (past) return 'bg-[#94A3B8] text-white'
    return 'bg-[#3B82F6] text-white'
  }

  const getHeaderLabel = () => {
    if (today) return 'Danas'
    if (tomorrow) return 'Sutra'
    return format(dateObj, 'EEEE', { locale: sr })
  }

  const totalTravelers = bookings.reduce((sum, b) => sum + b.adults + (b.children || 0), 0)

  return (
    <div className="flex-shrink-0 w-80">
      {/* Header */}
      <div className={`rounded-t-[14px] p-4 ${getHeaderColor()}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{getHeaderLabel()}</p>
            <p className="text-lg font-bold">
              {format(dateObj, 'd MMMM', { locale: sr })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm opacity-90">
              <Calendar className="h-4 w-4" />
              {bookings.length}
            </div>
            <div className="flex items-center gap-1.5 text-sm opacity-90">
              <Users className="h-4 w-4" />
              {totalTravelers}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className={`rounded-b-[14px] border border-t-0 p-3 space-y-3 min-h-[200px] ${
        past ? 'bg-[#F8FAFC] border-[#E2E8F0]' : 'bg-white border-[#E2E8F0]'
      }`}>
        {bookings.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#94A3B8]">
            Nema putovanja
          </div>
        ) : (
          bookings.map((booking) => (
            <TravelerCard
              key={booking.id}
              booking={booking}
              onClick={() => onBookingClick?.(booking.id)}
              dimmed={past}
            />
          ))
        )}
      </div>
    </div>
  )
}
