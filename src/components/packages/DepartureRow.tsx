'use client'

import { Trash2 } from 'lucide-react'
import type { DepartureRowProps } from '@/types/packages'

export function DepartureRow({
  departure,
  index,
  packageType,
  onUpdate,
  onRemove
}: DepartureRowProps) {
  const showCapacity = packageType === 'fiksni'

  return (
    <div className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      {/* Departure Date */}
      <div className="col-span-3">
        <input
          type="date"
          value={departure.departure_date}
          onChange={(e) => onUpdate(index, { departure_date: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Return Date */}
      <div className="col-span-3">
        <input
          type="date"
          value={departure.return_date}
          onChange={(e) => onUpdate(index, { return_date: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Capacity (only for fiksni) */}
      {showCapacity && (
        <div className="col-span-2">
          <input
            type="number"
            value={departure.total_spots || ''}
            onChange={(e) => onUpdate(index, { total_spots: parseInt(e.target.value) || undefined })}
            placeholder="Mesta"
            min={1}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      )}

      {/* Price */}
      <div className={showCapacity ? "col-span-2" : "col-span-4"}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none z-10">€</span>
          <input
            type="number"
            value={departure.price_override || ''}
            onChange={(e) => onUpdate(index, { price_override: parseFloat(e.target.value) || undefined })}
            placeholder="Cena"
            min={0}
            className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Remove button */}
      <div className="col-span-2 flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Ukloni polazak"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
