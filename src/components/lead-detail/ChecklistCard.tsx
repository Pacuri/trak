'use client'

import { ClipboardList, Check, Circle } from 'lucide-react'

export interface ChecklistItem {
  id: string
  label: string
  isCompleted: boolean
  isActive?: boolean
  completedAt?: string
}

interface ChecklistCardProps {
  items: ChecklistItem[]
  onToggleItem?: (itemId: string, completed: boolean) => void
}

// Default checklist for travel agency pipeline
export const defaultChecklistItems: ChecklistItem[] = [
  { id: 'offer_sent', label: 'Ponuda poslata', isCompleted: false },
  { id: 'offer_accepted', label: 'Ponuda prihvaćena', isCompleted: false },
  { id: 'deposit_paid', label: 'Akontacija uplaćena', isCompleted: false },
  { id: 'passports_collected', label: 'Svi pasoši dostavljeni', isCompleted: false },
  { id: 'contract_signed', label: 'Ugovor potpisan', isCompleted: false },
  { id: 'full_payment', label: 'Potpuna uplata', isCompleted: false },
  { id: 'voucher_sent', label: 'Voucher poslat', isCompleted: false },
  { id: 'feedback_received', label: 'Feedback nakon putovanja', isCompleted: false }
]

export default function ChecklistCard({
  items,
  onToggleItem
}: ChecklistCardProps) {
  // Find first uncompleted item
  const firstUncompletedIndex = items.findIndex(item => !item.isCompleted)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-400" />
          Checklist
        </h3>
      </div>

      {/* Items */}
      <div className="p-4">
        <div className="space-y-1">
          {items.map((item, index) => {
            const isActive = index === firstUncompletedIndex
            const isPast = item.isCompleted
            const isFuture = !item.isCompleted && index > firstUncompletedIndex

            return (
              <div
                key={item.id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer
                  ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}
                `}
                onClick={() => onToggleItem?.(item.id, !item.isCompleted)}
              >
                {/* Checkbox */}
                {isPast ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 rounded-full border-2 border-orange-400 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0" />
                )}

                {/* Label */}
                <span
                  className={`
                    text-sm
                    ${isPast ? 'text-gray-500 line-through' : ''}
                    ${isActive ? 'text-gray-900 font-medium' : ''}
                    ${isFuture ? 'text-gray-600' : ''}
                  `}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Napredak</span>
            <span className="font-medium text-gray-900">
              {items.filter(i => i.isCompleted).length} / {items.length}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{
                width: `${(items.filter(i => i.isCompleted).length / items.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
