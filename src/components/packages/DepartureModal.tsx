'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PackageDeparture, PackageDepartureFormData } from '@/types/packages'

const STATUS_OPTIONS: { value: PackageDepartureFormData['status']; label: string }[] = [
  { value: 'scheduled', label: 'Planiran' },
  { value: 'confirmed', label: 'Potvrđen' },
  { value: 'cancelled', label: 'Otkazan' },
  { value: 'completed', label: 'Završen' },
]

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000))
}

export interface DepartureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageId: string
  packageDefaults?: {
    default_duration?: number
    departure_location?: string
  }
  initial?: PackageDeparture | null
  onSubmit: (data: PackageDepartureFormData) => Promise<void>
}

export function DepartureModal({
  open,
  onOpenChange,
  packageId,
  packageDefaults = {},
  initial,
  onSubmit,
}: DepartureModalProps) {
  const isEdit = !!initial
  const defDuration = packageDefaults.default_duration ?? 7
  const defPoint = packageDefaults.departure_location ?? ''

  const [loading, setLoading] = useState(false)
  const [openCijena, setOpenCijena] = useState(false)
  const [openInterno, setOpenInterno] = useState(false)

  const [departure_date, setDeparture_date] = useState('')
  const [return_date, setReturn_date] = useState('')
  const [duration_nights, setDuration_nights] = useState(defDuration)
  const [available_slots, setAvailable_slots] = useState(40)
  const [min_travelers, setMin_travelers] = useState<string>('')
  const [booking_deadline, setBooking_deadline] = useState('')
  const [departure_time, setDeparture_time] = useState('')
  const [departure_point, setDeparture_point] = useState(defPoint)
  const [return_time, setReturn_time] = useState('')
  const [transport_notes, setTransport_notes] = useState('')
  const [price_adjustment_percent, setPrice_adjustment_percent] = useState<string>('')
  const [price_adjustment_type, setPrice_adjustment_type] = useState<'increase' | 'decrease'>('increase')
  const [internal_notes, setInternal_notes] = useState('')
  const [supplier_confirmation, setSupplier_confirmation] = useState('')
  const [status, setStatus] = useState<PackageDepartureFormData['status']>('scheduled')

  // Sync from initial when editing
  useEffect(() => {
    if (initial) {
      setDeparture_date(initial.departure_date)
      setReturn_date(initial.return_date)
      setDuration_nights(initial.duration_nights)
      setAvailable_slots(initial.available_slots)
      setMin_travelers(initial.min_travelers != null ? String(initial.min_travelers) : '')
      setBooking_deadline(initial.booking_deadline ?? '')
      setDeparture_time(initial.departure_time ?? '')
      setDeparture_point(initial.departure_point ?? defPoint)
      setReturn_time(initial.return_time ?? '')
      setTransport_notes(initial.transport_notes ?? '')
      setPrice_adjustment_percent(initial.price_adjustment_percent != null ? String(initial.price_adjustment_percent) : '')
      setPrice_adjustment_type(initial.price_adjustment_type ?? 'increase')
      setInternal_notes(initial.internal_notes ?? '')
      setSupplier_confirmation(initial.supplier_confirmation ?? '')
      setStatus(initial.status)
    } else {
      setDeparture_date('')
      setReturn_date('')
      setDuration_nights(defDuration)
      setAvailable_slots(40)
      setMin_travelers('')
      setBooking_deadline('')
      setDeparture_time('')
      setDeparture_point(defPoint)
      setReturn_time('')
      setTransport_notes('')
      setPrice_adjustment_percent('')
      setPrice_adjustment_type('increase')
      setInternal_notes('')
      setSupplier_confirmation('')
      setStatus('scheduled')
    }
  }, [initial, defDuration, defPoint])

  // Auto-calc: when both dates set manually -> duration
  const handleReturnDateChange = (v: string) => {
    setReturn_date(v)
    if (departure_date && v) {
      const d = daysBetween(departure_date, v)
      if (d >= 0) setDuration_nights(d)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!departure_date || !return_date || available_slots <= 0) return

    const ret = addDays(departure_date, duration_nights)
    const finalReturn = ret !== return_date ? ret : return_date

    setLoading(true)
    try {
      await onSubmit({
        departure_date,
        return_date: finalReturn,
        duration_nights,
        status,
        available_slots,
        min_travelers: min_travelers ? parseInt(min_travelers, 10) : null,
        booking_deadline: booking_deadline || null,
        departure_time: departure_time || null,
        departure_point: departure_point || null,
        return_time: return_time || null,
        transport_notes: transport_notes || null,
        price_adjustment_percent: price_adjustment_percent ? parseFloat(price_adjustment_percent) : null,
        price_adjustment_type: price_adjustment_percent ? price_adjustment_type : null,
        internal_notes: internal_notes || null,
        supplier_confirmation: supplier_confirmation || null,
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Izmeni polazak' : 'Dodaj polazak'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* DATUM I TRAJANJE */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Datum i trajanje</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum polaska *</label>
                  <input
                    type="date"
                    required
                    value={departure_date}
                    onChange={e => {
                      const v = e.target.value
                      setDeparture_date(v)
                      if (v && duration_nights >= 0) setReturn_date(addDays(v, duration_nights))
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum povratka *</label>
                  <input
                    type="date"
                    required
                    value={return_date}
                    onChange={e => handleReturnDateChange(e.target.value)}
                    min={departure_date}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Broj noćenja</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={duration_nights}
                    onChange={e => {
                      const d = parseInt(e.target.value, 10) || 1
                      setDuration_nights(d)
                      if (departure_date) setReturn_date(addDays(departure_date, d))
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </section>

            {/* KAPACITET */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Kapacitet</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Broj mesta *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={available_slots}
                    onChange={e => setAvailable_slots(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum putnika</label>
                  <input
                    type="number"
                    min={0}
                    value={min_travelers}
                    onChange={e => setMin_travelers(e.target.value)}
                    placeholder="Opciono"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rok prijave</label>
                  <input
                    type="date"
                    value={booking_deadline}
                    onChange={e => setBooking_deadline(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </section>

            {/* POLAZAK */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Polazak</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vreme polaska</label>
                  <input
                    type="time"
                    value={departure_time}
                    onChange={e => setDeparture_time(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vreme povratka</label>
                  <input
                    type="time"
                    value={return_time}
                    onChange={e => setReturn_time(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mesto polaska</label>
                  <input
                    type="text"
                    value={departure_point}
                    onChange={e => setDeparture_point(e.target.value)}
                    placeholder="npr. BAS Beograd"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Napomena o prevozu</label>
                  <textarea
                    value={transport_notes}
                    onChange={e => setTransport_notes(e.target.value)}
                    rows={2}
                    placeholder="Opciono"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </section>

            {/* CIJENA - collapsible */}
            <section className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCijena(!openCijena)}
                className="w-full flex items-center justify-between p-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Cena (opciono)
                {openCijena ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openCijena && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prilagodba cene (%)</label>
                    <input
                      type="number"
                      step={0.01}
                      value={price_adjustment_percent}
                      onChange={e => setPrice_adjustment_percent(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                    <select
                      value={price_adjustment_type}
                      onChange={e => setPrice_adjustment_type(e.target.value as 'increase' | 'decrease')}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="increase">Povećanje</option>
                      <option value="decrease">Smanjenje</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* INTERNO - collapsible */}
            <section className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenInterno(!openInterno)}
                className="w-full flex items-center justify-between p-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                Interno (opciono)
                {openInterno ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {openInterno && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interne napomene</label>
                    <textarea
                      value={internal_notes}
                      onChange={e => setInternal_notes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Broj potvrde dobavljača</label>
                    <input
                      type="text"
                      value={supplier_confirmation}
                      onChange={e => setSupplier_confirmation(e.target.value)}
                      placeholder="Opciono"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* STATUS */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Status</h3>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as PackageDepartureFormData['status'])}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </section>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading || !departure_date || !return_date || available_slots <= 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg',
                'bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Spremi' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
