'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'

interface MarkAvailableDialogProps {
  onConfirm: (note?: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function MarkAvailableDialog({ onConfirm, onCancel, loading }: MarkAvailableDialogProps) {
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-[14px] bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Check className="h-5 w-5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1E293B]">Označi kao dostupno</h3>
              <p className="text-sm text-[#64748B]">Klijent će biti obavešten da je ponuda dostupna</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Napomena (opciono)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Npr. Potvrđena dostupnost, molimo rezervišite u naredna 24h..."
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            Otkaži
          </button>
          <button
            onClick={() => onConfirm(note || undefined)}
            disabled={loading}
            className="flex items-center gap-2 rounded-[10px] bg-[#10B981] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#059669] disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
            {loading ? 'Čuvanje...' : 'Potvrdi dostupnost'}
          </button>
        </div>
      </div>
    </div>
  )
}
