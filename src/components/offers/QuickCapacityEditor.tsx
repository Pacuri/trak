'use client'

import { useState } from 'react'
import { Minus, Plus, Check, X } from 'lucide-react'

interface QuickCapacityEditorProps {
  offerId: string
  currentSpots: number
  totalSpots: number
  onSave: (id: string, spots: number) => Promise<boolean>
  onCancel: () => void
}

export default function QuickCapacityEditor({
  offerId,
  currentSpots,
  totalSpots,
  onSave,
  onCancel,
}: QuickCapacityEditorProps) {
  const [value, setValue] = useState(currentSpots)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const success = await onSave(offerId, value)
    setSaving(false)
    if (success) {
      onCancel()
    }
  }

  const increment = () => {
    if (value < totalSpots) {
      setValue(value + 1)
    }
  }

  const decrement = () => {
    if (value > 0) {
      setValue(value - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xs rounded-[14px] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1E293B] mb-4 text-center">
          Izmena kapaciteta
        </h3>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={decrement}
            disabled={value <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="text-center">
            <span className="text-3xl font-bold text-[#1E293B]">{value}</span>
            <p className="text-xs text-[#64748B]">od {totalSpots} mesta</p>
          </div>

          <button
            onClick={increment}
            disabled={value >= totalSpots}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, Math.floor(totalSpots / 2), totalSpots].map((spots) => (
            <button
              key={spots}
              onClick={() => setValue(spots)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                value === spots
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              {spots === 0 ? 'Rasprodato' : spots === totalSpots ? 'Puno' : `${spots}`}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="h-4 w-4" />
            Otkaži
          </button>
          <button
            onClick={handleSave}
            disabled={saving || value === currentSpots}
            className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Čuvanje...' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
