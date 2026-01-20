'use client'

import { useState, useMemo } from 'react'
import { X, Calendar, Loader2 } from 'lucide-react'
import type { GenerateDeparturesDialogProps } from '@/types/packages'
import { formatDate, PACKAGE_UI_TEXT } from '@/lib/package-labels'

const DAY_LABELS: { dow: number; label: string }[] = [
  { dow: 0, label: 'Ned' },
  { dow: 1, label: 'Pon' },
  { dow: 2, label: 'Uto' },
  { dow: 3, label: 'Sri' },
  { dow: 4, label: 'Čet' },
  { dow: 5, label: 'Pet' },
  { dow: 6, label: 'Sub' },
]

export function GenerateDeparturesDialog({
  open,
  onOpenChange,
  packageId,
  packageType,
  onGenerated,
}: GenerateDeparturesDialogProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [durationNights, setDurationNights] = useState<number>(7)
  const [totalSpots, setTotalSpots] = useState<number>(40)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const showCapacity = packageType === 'fiksni'

  const previewCount = useMemo(() => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end < start) return 0
    const dowSet = daysOfWeek.length ? new Set(daysOfWeek) : null
    let n = 0
    const cur = new Date(start)
    while (cur <= end) {
      if (!dowSet || dowSet.has(cur.getDay())) n++
      cur.setDate(cur.getDate() + 1)
    }
    return n
  }, [startDate, endDate, daysOfWeek])

  const toggleDay = (dow: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    )
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) return

    setIsGenerating(true)
    try {
      const res = await fetch(`/api/packages/${packageId}/departures?action=generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          days_of_week: daysOfWeek.length ? daysOfWeek : undefined,
          capacity: showCapacity ? totalSpots : 40,
          duration_nights: durationNights,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Greška pri generisanju polazaka')

      const count = data.count ?? 0
      onGenerated?.(count)
      onOpenChange(false)
      setStartDate('')
      setEndDate('')
      setDurationNights(7)
      setTotalSpots(40)
      setDaysOfWeek([])
    } finally {
      setIsGenerating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{PACKAGE_UI_TEXT.generate_title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{PACKAGE_UI_TEXT.generate_description}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {PACKAGE_UI_TEXT.start_date_label} *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {PACKAGE_UI_TEXT.end_date_label} *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dan u tjednu</label>
            <p className="text-xs text-gray-500 mb-2">Prazno = svi dani u rasponu</p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map(({ dow, label }) => (
                <label
                  key={dow}
                  className={`
                    inline-flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer text-sm font-medium
                    ${daysOfWeek.includes(dow) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={daysOfWeek.includes(dow)}
                    onChange={() => toggleDay(dow)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {PACKAGE_UI_TEXT.duration_label} *
              </label>
              <input
                type="number"
                value={durationNights}
                onChange={(e) => setDurationNights(parseInt(e.target.value) || 7)}
                min={1}
                max={30}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            {showCapacity && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {PACKAGE_UI_TEXT.spots_label} *
                </label>
                <input
                  type="number"
                  value={totalSpots}
                  onChange={(e) => setTotalSpots(parseInt(e.target.value) || 40)}
                  min={1}
                  max={500}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            )}
          </div>

          {previewCount > 0 && (
            <div className="p-3 bg-teal-50 rounded-lg">
              <div className="flex items-center gap-2 text-teal-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {PACKAGE_UI_TEXT.will_generate} {previewCount} {PACKAGE_UI_TEXT.departures_count}
                </span>
              </div>
              <p className="text-sm text-teal-600 mt-1">
                {startDate && formatDate(startDate)} – {endDate && formatDate(endDate)}
                {daysOfWeek.length > 0 && ` • ${daysOfWeek.map((d) => DAY_LABELS.find((x) => x.dow === d)?.label).filter(Boolean).join(', ')}`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {PACKAGE_UI_TEXT.cancel_button}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!startDate || !endDate || previewCount === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {PACKAGE_UI_TEXT.generate_button} {previewCount > 0 && `(${previewCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
