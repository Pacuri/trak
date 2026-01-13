'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'

interface CSVImportModalProps {
  onClose: () => void
  onImport: (file: File) => Promise<{ success: number; errors: string[] }>
}

export default function CSVImportModal({ onClose, onImport }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    try {
      const importResult = await onImport(file)
      setResult(importResult)
    } catch (error) {
      setResult({ success: 0, errors: ['Greška pri importu'] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-[14px] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1E293B]">Import ponuda iz CSV</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="h-5 w-5 text-[#64748B]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-[#3B82F6] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] hover:border-[#3B82F6] hover:bg-[#F8FAFC]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="h-12 w-12 text-[#3B82F6] mb-3" />
                    <p className="text-sm font-medium text-[#1E293B]">{file.name}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-[#94A3B8] mb-3" />
                    <p className="text-sm font-medium text-[#1E293B]">
                      Prevucite CSV fajl ovde
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      ili kliknite za izbor fajla
                    </p>
                  </div>
                )}
              </div>

              {/* Format info */}
              <div className="mt-4 rounded-[10px] bg-[#F8FAFC] p-4">
                <h4 className="text-sm font-medium text-[#1E293B] mb-2">
                  Format CSV fajla
                </h4>
                <p className="text-xs text-[#64748B] mb-2">
                  Obavezne kolone: naziv, drzava, datum_polaska, datum_povratka, cena, mesta
                </p>
                <p className="text-xs text-[#64748B]">
                  Opcione kolone: grad, opis, stara_cena, smestaj, ishrana, prevoz
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              {result.success > 0 ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-12 w-12 text-[#10B981] mb-3" />
                  <p className="text-lg font-medium text-[#1E293B]">
                    Uspešno importovano {result.success} ponuda
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-12 w-12 text-[#EF4444] mb-3" />
                  <p className="text-lg font-medium text-[#1E293B]">
                    Import nije uspeo
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="mt-4 rounded-[10px] bg-[#FEF2F2] p-4 text-left">
                  <h4 className="text-sm font-medium text-[#EF4444] mb-2">
                    Greške ({result.errors.length}):
                  </h4>
                  <ul className="text-xs text-[#EF4444] space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            {result ? 'Zatvori' : 'Otkaži'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importovanje...' : 'Importuj'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
