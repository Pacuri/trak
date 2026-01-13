'use client'

import ChipSelector from './ChipSelector'
import type { QualificationData, AccommodationType, BoardType, TransportType } from '@/types'

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'apartment', label: '🏠 Apartman' },
  { value: 'villa', label: '🏡 Vila' },
  { value: 'any', label: '🤷 Svejedno' },
]

const BOARD_TYPES = [
  { value: 'all_inclusive', label: '🍽️ All Inclusive' },
  { value: 'half_board', label: '🥘 Polupansion' },
  { value: 'breakfast', label: '🥐 Doručak' },
  { value: 'room_only', label: '🛏️ Samo noćenje' },
  { value: 'any', label: '🤷 Svejedno' },
]

const TRANSPORT_TYPES = [
  { value: 'flight', label: '✈️ Avionom' },
  { value: 'bus', label: '🚌 Autobusom' },
  { value: 'own', label: '🚗 Sopstveni prevoz' },
]

interface AccommodationStepProps {
  value: QualificationData['accommodation']
  onChange: (accommodation: Partial<QualificationData['accommodation']>) => void
}

export default function AccommodationStep({ value, onChange }: AccommodationStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kakav smeštaj tražite?</h2>
        <p className="text-gray-500">Odaberite tip smeštaja i usluge</p>
      </div>

      {/* Accommodation type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tip smeštaja
        </label>
        <ChipSelector
          options={ACCOMMODATION_TYPES}
          selected={value.type}
          onChange={(v) => onChange({ type: v as AccommodationType })}
          columns={2}
        />
      </div>

      {/* Board type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Ishrana
        </label>
        <ChipSelector
          options={BOARD_TYPES}
          selected={value.board}
          onChange={(v) => onChange({ board: v as BoardType })}
          columns={2}
        />
      </div>

      {/* Transport type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Prevoz
        </label>
        <ChipSelector
          options={TRANSPORT_TYPES}
          selected={value.transport}
          onChange={(v) => onChange({ transport: v as TransportType })}
          columns={3}
        />
      </div>
    </div>
  )
}
