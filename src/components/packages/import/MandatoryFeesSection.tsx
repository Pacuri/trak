'use client'

import { Receipt, AlertCircle } from 'lucide-react'
import type { ParsedMandatoryFee } from '@/types/import'

interface MandatoryFeesSectionProps {
  fees: ParsedMandatoryFee[]
}

export function MandatoryFeesSection({ fees }: MandatoryFeesSectionProps) {
  if (!fees || fees.length === 0) return null

  return (
    <div className="border border-red-200 rounded-lg p-4 mb-4 bg-red-50/50">
      <h4 className="font-medium mb-3 flex items-center gap-2 text-red-700">
        <Receipt className="w-4 h-4" />
        Obavezne naknade (NISU uključene u cijenu)
        <AlertCircle className="w-4 h-4 ml-auto" />
      </h4>

      <div className="space-y-3">
        {fees.map((fee, i) => (
          <div key={i} className="bg-white rounded p-3 border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-red-800">{fee.name}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {fee.per === 'stay' ? 'Po boravku' : 'Po noćenju'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {fee.rules.map((rule, j) => (
                <div key={j} className="flex items-center justify-between bg-red-50 rounded px-2 py-1">
                  <span className="text-gray-600">
                    {rule.age_from === 0 && rule.age_to < 3 ? (
                      'Bebe'
                    ) : rule.age_from === 0 ? (
                      `0-${rule.age_to} god`
                    ) : rule.age_to >= 99 ? (
                      `${rule.age_from}+ god`
                    ) : (
                      `${rule.age_from}-${rule.age_to} god`
                    )}
                  </span>
                  <span className={`font-medium ${rule.amount === 0 ? 'text-green-600' : 'text-red-700'}`}>
                    {rule.amount === 0 ? 'GRATIS' : `${rule.amount} ${fee.currency}`}
                  </span>
                </div>
              ))}
            </div>
            {fee.source_text && (
              <p className="text-xs text-gray-400 mt-2 italic truncate" title={fee.source_text}>
                Izvor: {fee.source_text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
