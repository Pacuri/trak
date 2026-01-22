'use client'

import { Calendar, Users, Plane, Hotel, Check, Clock, Pencil } from 'lucide-react'
import type { Booking, Reservation, QualificationData } from '@/types'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface Traveler {
  id?: string
  name: string
  type: 'adult' | 'child'
  age?: number
  has_passport: boolean
  passport_expiry?: string | null
}

interface TripDetailsCardProps {
  destination?: string | null
  departureDate?: string | null
  returnDate?: string | null
  durationNights?: number | null
  hotelName?: string | null
  roomType?: string | null
  boardType?: string | null
  flightInfo?: string | null
  travelers?: Traveler[]
  qualification?: QualificationData | null
  booking?: Booking | null
  reservation?: Reservation | null
  onEdit?: () => void
}

const boardTypeLabels: Record<string, string> = {
  all_inclusive: 'All Inclusive',
  half_board: 'Polupansion',
  breakfast: 'Doručak',
  room_only: 'Samo soba',
  any: 'Bilo koji'
}

export default function TripDetailsCard({
  destination,
  departureDate,
  returnDate,
  durationNights,
  hotelName,
  roomType,
  boardType,
  flightInfo,
  travelers = [],
  qualification,
  booking,
  reservation,
  onEdit
}: TripDetailsCardProps) {
  // Calculate duration if not provided
  const nights = durationNights || (
    departureDate && returnDate
      ? Math.ceil((new Date(returnDate).getTime() - new Date(departureDate).getTime()) / (1000 * 60 * 60 * 24))
      : qualification?.dates?.duration || null
  )

  // Get travelers from various sources
  const getTravelers = (): Traveler[] => {
    if (travelers.length > 0) return travelers

    // Build from qualification data
    if (qualification?.guests) {
      const result: Traveler[] = []
      for (let i = 0; i < qualification.guests.adults; i++) {
        result.push({
          name: i === 0 ? 'Glavni putnik' : `Odrasla osoba ${i + 1}`,
          type: 'adult',
          has_passport: false
        })
      }
      qualification.guests.childAges?.forEach((age, idx) => {
        result.push({
          name: `Dete ${idx + 1}`,
          type: 'child',
          age,
          has_passport: false
        })
      })
      return result
    }

    // Build from booking/reservation
    const source = booking || reservation
    if (source) {
      const result: Traveler[] = []
      for (let i = 0; i < source.adults; i++) {
        result.push({
          name: i === 0 ? source.customer_name : `Odrasla osoba ${i + 1}`,
          type: 'adult',
          has_passport: false
        })
      }
      source.child_ages?.forEach((age, idx) => {
        result.push({
          name: `Dete ${idx + 1}`,
          type: 'child',
          age,
          has_passport: false
        })
      })
      return result
    }

    return []
  }

  const allTravelers = getTravelers()
  const hasTrip = destination || hotelName || departureDate

  if (!hasTrip && !qualification) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-gray-400" />
            Detalji putovanja
          </h2>
        </div>
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Plane className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">Putovanje još nije definisano</p>
          <button className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium">
            + Dodaj detalje putovanja
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Plane className="w-5 h-5 text-gray-400" />
          Detalji putovanja
        </h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Izmeni
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Destination Header */}
        {(destination || hotelName) && (
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="text-3xl">🏝️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {hotelName || destination}
              </h3>
              {hotelName && destination && (
                <p className="text-sm text-gray-500">{destination}</p>
              )}
              {boardType && (
                <p className="text-sm text-gray-500">{boardTypeLabels[boardType] || boardType}</p>
              )}
            </div>
          </div>
        )}

        {/* Trip Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Datum polaska</p>
            {departureDate ? (
              <>
                <p className="font-semibold text-gray-900">
                  {format(new Date(departureDate), 'd. MMM yyyy', { locale: sr })}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(departureDate), 'EEEE', { locale: sr })}
                </p>
              </>
            ) : qualification?.dates?.exactStart ? (
              <>
                <p className="font-semibold text-gray-900">
                  {format(new Date(qualification.dates.exactStart), 'd. MMM yyyy', { locale: sr })}
                </p>
              </>
            ) : qualification?.dates?.month ? (
              <p className="font-semibold text-gray-900">{qualification.dates.month}</p>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Datum povratka</p>
            {returnDate ? (
              <>
                <p className="font-semibold text-gray-900">
                  {format(new Date(returnDate), 'd. MMM yyyy', { locale: sr })}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(returnDate), 'EEEE', { locale: sr })}
                </p>
              </>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Trajanje</p>
            {nights ? (
              <>
                <p className="font-semibold text-gray-900">{nights} noći</p>
                <p className="text-xs text-gray-500">{nights + 1} dana</p>
              </>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>
        </div>

        {/* Travelers */}
        {allTravelers.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Putnici ({allTravelers.length})
            </p>
            <div className="space-y-2">
              {allTravelers.map((traveler, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      traveler.type === 'adult'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-pink-100 text-pink-600'
                    }`}>
                      {traveler.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{traveler.name}</p>
                      <p className="text-xs text-gray-500">
                        {traveler.type === 'adult'
                          ? idx === 0 ? 'Glavni putnik • Odrasla osoba' : 'Odrasla osoba'
                          : `Dete${traveler.age ? ` • ${traveler.age} god.` : ''}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {traveler.has_passport ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Pasoš
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-600 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Čeka pasoš
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room / Flight Info */}
        <div className="grid grid-cols-2 gap-4">
          {roomType && (
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Hotel className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Smeštaj</span>
              </div>
              <p className="text-sm text-gray-900">{roomType}</p>
              {boardType && (
                <p className="text-xs text-gray-500">{boardTypeLabels[boardType] || boardType}</p>
              )}
            </div>
          )}

          {flightInfo && (
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Let</span>
              </div>
              <p className="text-sm text-gray-900">{flightInfo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
