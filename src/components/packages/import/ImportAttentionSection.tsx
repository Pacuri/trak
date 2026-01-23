'use client'

import { AlertTriangle, Info, Sparkles } from 'lucide-react'
import type {
  ParsedSupplement,
  ParsedMandatoryFee,
  ParsedPolicies,
  ParsedRoomDetail,
  ParsedImportantNote,
  PriceType
} from '@/types/import'

interface ImportAttentionSectionProps {
  priceType?: PriceType
  supplements?: ParsedSupplement[]
  mandatoryFees?: ParsedMandatoryFee[]
  policies?: ParsedPolicies | null
  includedServices?: string[]
  importantNotes?: ParsedImportantNote[]
  roomDetails?: ParsedRoomDetail[]
}

export function ImportAttentionSection({
  priceType,
  supplements = [],
  mandatoryFees = [],
  policies,
  includedServices = [],
  importantNotes = [],
  roomDetails = [],
}: ImportAttentionSectionProps) {
  // Collect all attention-worthy items (using Set to avoid duplicates)
  const itemsMap = new Map<string, { text: string; type: 'warning' | 'info' | 'highlight' }>()

  // Price type warning
  if (priceType === 'per_person_per_night') {
    const text = 'Cijene su po osobi po NOĆENJU (ne po boravku)'
    itemsMap.set(text, { text, type: 'highlight' })
  }

  // Included services
  includedServices.forEach(s => {
    if (!itemsMap.has(s)) {
      itemsMap.set(s, { text: s, type: 'info' })
    }
  })

  // Supplements
  supplements.forEach(s => {
    let text = ''
    if (s.percent) {
      text = `${s.percent}% ${s.name.toLowerCase()}`
    } else if (s.amount) {
      const perText = s.per === 'person_night' ? 'po osobi po danu' :
                      s.per === 'night' ? 'po danu' :
                      s.per === 'stay' ? 'po boravku' : ''
      text = `${s.amount} ${s.currency || 'EUR'} ${perText} - ${s.name.toLowerCase()}`
    }
    if (text && !itemsMap.has(text)) {
      itemsMap.set(text, { text, type: 'info' })
    }
  })

  // Room warnings (critical!) - deduplicated
  roomDetails.forEach(r => {
    r.warnings?.forEach(w => {
      if (!itemsMap.has(w)) {
        itemsMap.set(w, { text: w, type: 'warning' })
      }
    })
  })

  // Important notes
  importantNotes.forEach(n => {
    if (!itemsMap.has(n.text)) {
      itemsMap.set(n.text, {
        text: n.text,
        type: n.type === 'warning' ? 'warning' : 'info'
      })
    }
  })

  // Restrictions
  if (policies?.restrictions?.min_stay) {
    const text = `Minimalno ${policies.restrictions.min_stay} noćenja`
    if (!itemsMap.has(text)) {
      itemsMap.set(text, { text, type: 'info' })
    }
  }
  if (policies?.restrictions?.documents_required?.length) {
    const text = `Potrebni dokumenti: ${policies.restrictions.documents_required.join(', ')}`
    if (!itemsMap.has(text)) {
      itemsMap.set(text, { text, type: 'info' })
    }
  }
  if (policies?.restrictions?.check_in_days?.length) {
    const text = `Check-in samo: ${policies.restrictions.check_in_days.join(', ')}`
    if (!itemsMap.has(text)) {
      itemsMap.set(text, { text, type: 'info' })
    }
  }

  // Convert to array
  const items = Array.from(itemsMap.values())

  // Don't render if no items
  if (items.length === 0) return null

  // Group items by type
  const warnings = items.filter(i => i.type === 'warning')
  const highlights = items.filter(i => i.type === 'highlight')
  const infos = items.filter(i => i.type === 'info')

  return (
    <div className="space-y-3 mb-6">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800 mb-2">Upozorenja</h4>
              <ul className="space-y-1">
                {warnings.map((item, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span>•</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Highlights (important info) */}
      {highlights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 mb-2">Važno</h4>
              <ul className="space-y-1">
                {highlights.map((item, i) => (
                  <li key={i} className="text-sm text-amber-700 font-medium flex items-start gap-2">
                    <span>•</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Info items */}
      {infos.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-800 mb-2">Uključeno / Napomene</h4>
              <ul className="space-y-1">
                {infos.map((item, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                    <span>•</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
