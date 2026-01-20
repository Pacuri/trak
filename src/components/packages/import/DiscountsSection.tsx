'use client'

import { Tag, Calendar, Clock } from 'lucide-react'
import type { ParsedDiscount } from '@/types/import'

interface DiscountsSectionProps {
  discounts: ParsedDiscount[]
}

export function DiscountsSection({ discounts }: DiscountsSectionProps) {
  if (!discounts || discounts.length === 0) return null

  return (
    <div className="border border-green-200 rounded-lg p-4 mb-4 bg-green-50/50">
      <h4 className="font-medium mb-3 flex items-center gap-2 text-green-700">
        <Tag className="w-4 h-4" />
        Popusti i promocije
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {discounts.map((discount, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-green-100">
            <div className="flex items-start justify-between mb-2">
              <span className="font-medium text-sm text-green-800">{discount.name}</span>
              <span className="text-lg font-bold text-green-600">
                {discount.percent ? `-${discount.percent}%` : `-${discount.fixed_amount} €`}
              </span>
            </div>
            
            {/* Conditions */}
            <div className="space-y-1 text-xs text-gray-600">
              {discount.conditions?.book_before && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Rezervacija do: {new Date(discount.conditions.book_before).toLocaleDateString('hr')}</span>
                </div>
              )}
              {discount.conditions?.min_nights && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Min. {discount.conditions.min_nights} noćenja</span>
                </div>
              )}
              {discount.valid_from && discount.valid_to && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Vrijedi: {new Date(discount.valid_from).toLocaleDateString('hr')} - {new Date(discount.valid_to).toLocaleDateString('hr')}
                  </span>
                </div>
              )}
            </div>

            {discount.source_text && (
              <p className="text-xs text-gray-400 mt-2 italic truncate" title={discount.source_text}>
                {discount.source_text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
