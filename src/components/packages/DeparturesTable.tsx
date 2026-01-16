'use client'

import { useState } from 'react'
import { Calendar, MoreHorizontal, Pencil, Users, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Departure, DeparturesTableProps } from '@/types/packages'
import { 
  DEPARTURE_STATUS_LABELS, 
  DEPARTURE_STATUS_COLORS,
  URGENCY_LABELS,
  formatDate,
  formatPrice,
} from '@/lib/package-labels'
import { CapacityBar } from './CapacityBar'

export function DeparturesTable({ 
  departures, 
  packageType,
  onEditDeparture,
  onUpdateCapacity,
}: DeparturesTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const showCapacity = packageType === 'fiksni'
  
  const sortedDepartures = [...departures].sort(
    (a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
  )

  if (departures.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Nema polazaka</p>
        <p className="text-sm mt-1">Dodajte pojedinačno ili generišite nedeljne polaske</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
            <th className="pb-3 font-medium">Polazak</th>
            <th className="pb-3 font-medium">Povratak</th>
            <th className="pb-3 font-medium">Noći</th>
            {showCapacity && <th className="pb-3 font-medium">Popunjenost</th>}
            <th className="pb-3 font-medium">Cena</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right">Akcije</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedDepartures.map(departure => {
            const isPast = new Date(departure.departure_date) < new Date()
            const durationNights = departure.duration_nights || 
              Math.ceil((new Date(departure.return_date).getTime() - new Date(departure.departure_date).getTime()) / (1000 * 60 * 60 * 24))
            
            return (
              <tr 
                key={departure.id} 
                className={cn('hover:bg-gray-50', isPast && 'opacity-50')}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(departure.departure_date)}</span>
                    {departure.urgency_label && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        URGENCY_LABELS[departure.urgency_label].className
                      )}>
                        {URGENCY_LABELS[departure.urgency_label].icon}
                      </span>
                    )}
                  </div>
                  {departure.departure_time && (
                    <span className="text-xs text-gray-500">{departure.departure_time}</span>
                  )}
                </td>
                <td className="py-3 text-gray-600">
                  {formatDate(departure.return_date)}
                </td>
                <td className="py-3 text-gray-600">
                  {durationNights}
                </td>
                {showCapacity && (
                  <td className="py-3">
                    <div className="w-32">
                      <CapacityBar 
                        total={departure.total_spots} 
                        available={departure.available_spots}
                        size="sm"
                      />
                    </div>
                  </td>
                )}
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {formatPrice(departure.effective_price || departure.price_override || 0)}
                    </span>
                    {departure.original_price && departure.original_price > (departure.effective_price || 0) && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(departure.original_price)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <span className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded border',
                    DEPARTURE_STATUS_COLORS[departure.status]
                  )}>
                    {DEPARTURE_STATUS_LABELS[departure.status]}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenMenu(openMenu === departure.id ? null : departure.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    
                    {openMenu === departure.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          {onEditDeparture && (
                            <button
                              onClick={() => {
                                onEditDeparture(departure)
                                setOpenMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-4 w-4" />
                              Izmeni
                            </button>
                          )}
                          {showCapacity && onUpdateCapacity && (
                            <button
                              onClick={() => {
                                const newCapacity = prompt('Unesi broj dostupnih mesta:', String(departure.available_spots))
                                if (newCapacity !== null) {
                                  onUpdateCapacity(departure.id, parseInt(newCapacity) || 0)
                                }
                                setOpenMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Users className="h-4 w-4" />
                              Ažuriraj mesta
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Obriši
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
