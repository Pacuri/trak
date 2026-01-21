'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Image as ImageIcon,
  FileSpreadsheet,
  Euro,
} from 'lucide-react'
import type { Currency } from '@/types/import'

interface ImportMethodSelectorProps {
  onManualEntry: () => void
  onImportComplete: (result: any) => void
  disabled?: boolean
}

type ImportState = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

const CURRENCY_OPTIONS: { value: Currency; label: string; description: string }[] = [
  { value: 'EUR', label: 'EUR', description: 'Euro' },
  { value: 'KM', label: 'KM', description: 'Konvertibilna marka (BAM)' },
  { value: 'RSD', label: 'RSD', description: 'Srpski dinar' },
]

export function ImportMethodSelector({
  onManualEntry,
  onImportComplete,
  disabled
}: ImportMethodSelectorProps) {
  const [importState, setImportState] = useState<ImportState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marginPercent, setMarginPercent] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('EUR')
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
    if (file) validateAndSetFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Podržani formati: PDF, JPG, PNG, Excel (XLSX)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Maksimalna veličina fajla je 50MB')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setImportState('uploading')
    setError(null)

    // Show processing state for PDFs (they take longer)
    const isPdf = selectedFile.type === 'application/pdf'
    if (isPdf) {
      // Switch to processing state after a short delay
      setTimeout(() => {
        setImportState('processing')
      }, 500)
    }

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('currency', currency)
      if (marginPercent) {
        formData.append('margin_percent', marginPercent)
      }

      const response = await fetch('/api/packages/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import document')
      }

      // All files now return results immediately
      setImportState('success')
      
      // Pass result to parent after a short delay for UI feedback
      setTimeout(() => {
        onImportComplete({ ...data, currency })
      }, 1000)

    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Greška pri importu')
      setImportState('error')
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setError(null)
    setImportState('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-8 w-8" />
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-8 w-8" />
    return <FileText className="h-8 w-8" />
  }

  if (importState === 'idle' && !selectedFile) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Izaberite dokument za import
          </h3>
          <p className="text-sm text-gray-500">
            Podržani formati: PDF, slike (JPG, PNG) i Excel fajlovi
          </p>
        </div>

        {/* Import from Document */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center gap-4 p-10 rounded-xl border-2 border-dashed transition-all cursor-pointer',
            isDragging
              ? 'border-teal-500 bg-teal-50'
              : 'border-gray-200 hover:border-teal-500 hover:bg-teal-50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            isDragging ? 'bg-teal-100' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'h-8 w-8',
              isDragging ? 'text-teal-600' : 'text-gray-500'
            )} />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900">
              {isDragging ? 'Pustite fajl ovde' : 'Prevucite fajl ili kliknite za izbor'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              PDF, JPG, PNG ili Excel (max 50MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }

  // File selected - show preview and upload button
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Import dokumenta</h3>
        <button
          type="button"
          onClick={handleClear}
          disabled={importState === 'uploading' || importState === 'processing'}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* File preview */}
      <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
          {selectedFile && getFileIcon(selectedFile.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{selectedFile?.name}</p>
          <p className="text-sm text-gray-500">
            {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        {importState === 'success' && (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        )}
      </div>

      {/* Currency selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Euro className="h-4 w-4 inline mr-1.5" />
          Valuta dokumenta *
        </label>
        <div className="flex gap-2">
          {CURRENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCurrency(option.value)}
              disabled={importState !== 'idle' && importState !== 'error'}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg border-2 transition-all text-center',
                currency === option.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 hover:border-gray-300',
                (importState !== 'idle' && importState !== 'error') && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{option.description}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Izaberite valutu u kojoj su cene u dokumentu
        </p>
      </div>

      {/* Margin input (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Marža (%) - opciono
        </label>
        <input
          type="number"
          value={marginPercent}
          onChange={(e) => setMarginPercent(e.target.value)}
          placeholder="npr. 11"
          min="0"
          max="100"
          step="0.5"
          disabled={importState !== 'idle' && importState !== 'error'}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ako su cene neto, unesite maržu za izračun prodajne cene
        </p>
      </div>

      {/* Status messages */}
      {importState === 'uploading' && (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploadujem dokument...</span>
        </div>
      )}

      {importState === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-teal-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analiziram dokument...</span>
          </div>
          <p className="text-xs text-gray-500">
            {selectedFile?.type === 'application/pdf' 
              ? 'PDF dokumenti mogu potrajati do 2-3 minute za obradu.'
              : 'Obrada u toku...'}
          </p>
        </div>
      )}

      {importState === 'success' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Dokument uspešno analiziran!</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={importState === 'uploading' || importState === 'processing'}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Otkaži
        </button>
        <button
          type="button"
          onClick={handleUpload}
          disabled={importState === 'uploading' || importState === 'processing' || importState === 'success'}
          className={cn(
            'flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg',
            'bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          {(importState === 'uploading' || importState === 'processing') && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {importState === 'idle' || importState === 'error' ? 'Analiziraj dokument' : 
           importState === 'success' ? 'Gotovo!' : 'Analiziram...'}
        </button>
      </div>
    </div>
  )
}
