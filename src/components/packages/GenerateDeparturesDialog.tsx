'use client'

import { useState, useMemo } from 'react'
import { X, Calendar, Loader2 } from 'lucide-react'
import type { GenerateDeparturesDialogProps, DepartureFormData } from '@/types/packages'
import { formatDate, PACKAGE_UI_TEXT } from '@/lib/package-labels'

export function GenerateDeparturesDialog({
  open,
  onOpenChange,
  packageType,
  onGenerate
}: GenerateDeparturesDialogProps) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [durationNights, setDurationNights] = useState<number>(7)
  const [price, setPrice] = useState<number>(0)
  const [totalSpots, setTotalSpots] = useState<number>(40)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const showCapacity = packageType === 'fiksni'
  
  const previewCount = useMemo(() => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) return 0
    const weeks = Math.floor((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    return Math.max(0, weeks)
  }, [startDate, endDate])

  const handleGenerate = async () => {
    if (!startDate || !endDate || previewCount === 0) return
    
    setIsGenerating(true)
    
    // Generate departures locally
    const departures: DepartureFormData[] = []
    let currentDate = new Date(startDate)
    const end = new Date(endDate)
    
    while (currentDate <= end) {
      const returnDate = new Date(currentDate)
      returnDate.setDate(returnDate.getDate() + durationNights)
      
      departures.push({
        departure_date: currentDate.toISOString().split('T')[0],
        return_date: returnDate.toISOString().split('T')[0],
        price_override: price > 0 ? price : undefined,
        total_spots: showCapacity ? totalSpots : undefined,
      })
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7)
    }
    
    onGenerate(departures)
    setIsGenerating(false)
    onOpenChange(false)
    
    // Reset form
    setStartDate('')
    setEndDate('')
    setDurationNights(7)
    setPrice(0)
    setTotalSpots(40)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {PACKAGE_UI_TEXT.generate_title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {PACKAGE_UI_TEXT.generate_description}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cena po osobi (€)
              </label>
              <input
                type="number"
                value={price || ''}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                min={0}
                placeholder="Opciono"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          )}
          
          {/* Preview */}
          {previewCount > 0 && (
            <div className="p-3 bg-teal-50 rounded-lg">
              <div className="flex items-center gap-2 text-teal-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {PACKAGE_UI_TEXT.will_generate} {previewCount} {PACKAGE_UI_TEXT.departures_count}
                </span>
              </div>
              <p className="text-sm text-teal-600 mt-1">
                Svake nedelje od {startDate && formatDate(startDate)} do {endDate && formatDate(endDate)}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {PACKAGE_UI_TEXT.cancel_button}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!startDate || !endDate || previewCount === 0 || isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {PACKAGE_UI_TEXT.generate_button} {previewCount > 0 && `(${previewCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
