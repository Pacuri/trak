'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { PriceIntervalFormData, RoomTypeFormData, MealPlanCode, ChildrenPolicyFormData } from '@/types/packages'
import { Upload, Image, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface PriceImageUploadProps {
  onImport: (data: {
    intervals?: PriceIntervalFormData[]
    roomTypes?: RoomTypeFormData[]
    childrenPolicies?: ChildrenPolicyFormData[]
  }) => void
  mealPlans: MealPlanCode[]
}

interface ParsedData {
  hotelName?: string
  intervals: Array<{
    name: string
    start_date: string
    end_date: string
    prices: Array<{
      roomCode: string
      roomName: string
      maxPersons: number
      prices: Partial<Record<MealPlanCode, number>>
    }>
  }>
  childrenPolicies: Array<{
    label: string
    ageFrom: number
    ageTo: number
    discountType: 'FREE' | 'PERCENT' | 'FIXED'
    discountValue?: number
  }>
}

// Mock parsed data for demonstration
const MOCK_PARSED_DATA: ParsedData = {
  hotelName: 'Hotel Aegean Blue',
  intervals: [
    {
      name: 'Jun 2026',
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      prices: [
        { roomCode: '1/2', roomName: 'Dvokrevetna', maxPersons: 2, prices: { BB: 45, HB: 55, AI: 75 } },
        { roomCode: '1/3', roomName: 'Trokrevetna', maxPersons: 3, prices: { BB: 40, HB: 50, AI: 70 } },
        { roomCode: '1/4', roomName: 'Četvorokrevetna', maxPersons: 4, prices: { BB: 38, HB: 48, AI: 68 } },
      ],
    },
    {
      name: 'Jul - Avg 2026',
      start_date: '2026-07-01',
      end_date: '2026-08-31',
      prices: [
        { roomCode: '1/2', roomName: 'Dvokrevetna', maxPersons: 2, prices: { BB: 65, HB: 80, AI: 110 } },
        { roomCode: '1/3', roomName: 'Trokrevetna', maxPersons: 3, prices: { BB: 60, HB: 75, AI: 105 } },
        { roomCode: '1/4', roomName: 'Četvorokrevetna', maxPersons: 4, prices: { BB: 55, HB: 70, AI: 100 } },
      ],
    },
  ],
  childrenPolicies: [
    { label: 'Bebe', ageFrom: 0, ageTo: 1.99, discountType: 'FREE' },
    { label: 'Deca', ageFrom: 2, ageTo: 11.99, discountType: 'PERCENT', discountValue: 50 },
  ],
}

export function PriceImageUpload({ onImport, mealPlans }: PriceImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg|webp)$/) && file.type !== 'application/pdf') {
      setError('Podržani formati: JPG, PNG, PDF')
      return
    }

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }

    // Simulate processing
    setIsProcessing(true)
    setError(null)
    setParsedData(null)

    // Mock API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Use mock data for demo
    setParsedData(MOCK_PARSED_DATA)
    setIsProcessing(false)
  }

  const handleImport = () => {
    if (!parsedData) return

    // Convert parsed data to form data format
    const roomTypes: RoomTypeFormData[] = parsedData.intervals[0]?.prices.map((p, i) => ({
      code: p.roomCode,
      name: p.roomName,
      max_persons: p.maxPersons,
      sort_order: i,
    })) || []

    const intervals: PriceIntervalFormData[] = parsedData.intervals.map((interval, i) => ({
      name: interval.name,
      start_date: interval.start_date,
      end_date: interval.end_date,
      sort_order: i,
      hotel_prices: interval.prices.map((p, j) => ({
        room_type_id: `new-${j}`,
        price_nd: p.prices.ND,
        price_bb: p.prices.BB,
        price_hb: p.prices.HB,
        price_fb: p.prices.FB,
        price_ai: p.prices.AI,
      })),
    }))

    const childrenPolicies: ChildrenPolicyFormData[] = parsedData.childrenPolicies.map((p, i) => ({
      label: p.label,
      age_from: p.ageFrom,
      age_to: p.ageTo,
      discount_type: p.discountType,
      discount_value: p.discountValue,
      sort_order: i,
    }))

    onImport({ intervals, roomTypes, childrenPolicies })
    
    // Reset state
    setImagePreview(null)
    setParsedData(null)
  }

  const handleClear = () => {
    setImagePreview(null)
    setParsedData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Importuj cenovnik sa slike</h3>
          <p className="text-sm text-gray-500">
            Uploadujte sliku cenovnika i automatski prepoznajemo cene
          </p>
        </div>
      </div>

      {!imagePreview && !parsedData && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <Upload className={cn(
            'mx-auto h-12 w-12',
            isDragging ? 'text-teal-500' : 'text-gray-300'
          )} />
          <p className="mt-2 text-sm font-medium text-gray-700">
            Prevucite sliku ovde ili kliknite za upload
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Podržani formati: JPG, PNG, PDF
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {(imagePreview || isProcessing || parsedData) && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative aspect-video bg-gray-100">
              <img
                src={imagePreview}
                alt="Uploaded price list"
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="p-6 text-center">
              <Loader2 className="mx-auto h-8 w-8 text-teal-500 animate-spin" />
              <p className="mt-2 font-medium text-gray-700">Analiziram cenovnik...</p>
              <p className="text-sm text-gray-500">AI prepoznaje cene iz tabele</p>
            </div>
          )}

          {/* Parsed results */}
          {parsedData && !isProcessing && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Prepoznato:</span>
              </div>

              {parsedData.hotelName && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Hotel:</span> {parsedData.hotelName}
                </p>
              )}

              {/* Intervals */}
              {parsedData.intervals.map((interval, i) => (
                <div key={i} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {interval.name} ({interval.start_date} - {interval.end_date})
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left pb-1">Soba</th>
                        {mealPlans.map(mp => (
                          <th key={mp} className="text-center pb-1">{mp}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {interval.prices.map((price, j) => (
                        <tr key={j}>
                          <td className="py-1">{price.roomCode}</td>
                          {mealPlans.map(mp => (
                            <td key={mp} className="text-center py-1">
                              {price.prices[mp] ? `€${price.prices[mp]}` : '--'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Children policies */}
              {parsedData.childrenPolicies.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Deca:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {parsedData.childrenPolicies.map((policy, i) => (
                      <li key={i}>
                        • {policy.label}: {policy.ageFrom}-{policy.ageTo} godina{' '}
                        {policy.discountType === 'FREE'
                          ? 'Besplatno'
                          : policy.discountType === 'PERCENT'
                          ? `-${policy.discountValue}%`
                          : `€${policy.discountValue}/noć`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-amber-600 flex items-center gap-1 flex-1">
                  <AlertCircle className="h-3 w-3" />
                  Proverite podatke pre importa
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Ispravi ručno
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Importuj
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
