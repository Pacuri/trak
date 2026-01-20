'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Save,
} from 'lucide-react'
import { ImportMethodSelector } from './ImportMethodSelector'
import { ImportReviewScreen } from './ImportReviewScreen'
import { ImportedPackageForm } from './ImportedPackageForm'
import type { 
  DocumentParseResult, 
  ImportFormData, 
  ImportPackageFormData,
} from '@/types/import'

type FlowStep = 'upload' | 'review' | 'edit' | 'saving' | 'complete'

interface DocumentImportFlowProps {
  organizationId: string
  onCancel: () => void
  onComplete: (packageIds: string[]) => void
}

export function DocumentImportFlow({
  organizationId,
  onCancel,
  onComplete,
}: DocumentImportFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<FlowStep>('upload')
  const [parseResult, setParseResult] = useState<DocumentParseResult | null>(null)
  const [importId, setImportId] = useState<string>('')
  const [formData, setFormData] = useState<ImportFormData | null>(null)
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 })
  const [savedPackageIds, setSavedPackageIds] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [transportListId, setTransportListId] = useState<string | undefined>()

  // Handle import complete from ImportMethodSelector
  const handleImportComplete = (result: { import_id: string; result: DocumentParseResult }) => {
    setImportId(result.import_id)
    setParseResult(result.result)
    setStep('review')
  }

  // Handle continue from review screen
  const handleReviewContinue = (data: ImportFormData) => {
    setFormData(data)
    setCurrentPackageIndex(0)
    setStep('edit')
  }

  // Update a package in form data
  const updatePackage = (index: number, updates: Partial<ImportPackageFormData>) => {
    if (!formData) return
    const newPackages = [...formData.packages]
    newPackages[index] = { ...newPackages[index], ...updates }
    setFormData({ ...formData, packages: newPackages })
  }

  // Get selected packages
  const selectedPackages = formData?.packages.filter(p => p.selected) || []

  // Navigate between packages
  const goToNextPackage = () => {
    if (currentPackageIndex < selectedPackages.length - 1) {
      setCurrentPackageIndex(currentPackageIndex + 1)
    }
  }

  const goToPrevPackage = () => {
    if (currentPackageIndex > 0) {
      setCurrentPackageIndex(currentPackageIndex - 1)
    }
  }

  // Save all packages
  const handleSaveAll = async () => {
    if (!formData) return

    setSaving(true)
    setStep('saving')
    setSaveProgress({ current: 0, total: selectedPackages.length })
    setErrors([])

    try {
      const response = await fetch('/api/packages/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          import_id: importId,
          packages: formData.packages,
          transport: formData.transport,
          business_model: formData.business_model,
          margin_percent: formData.margin_percent,
          currency: formData.currency,
          // Enhanced fields
          supplements: formData.supplements,
          mandatory_fees: formData.mandatory_fees,
          discounts: formData.discounts,
          policies: formData.policies,
          included_services: formData.included_services,
          important_notes: formData.important_notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save packages')
      }

      setSavedPackageIds(data.created_packages || [])
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors)
      }
      
      setStep('complete')

    } catch (error) {
      console.error('Error saving packages:', error)
      setErrors([error instanceof Error ? error.message : 'Unknown error'])
      setStep('edit')
    } finally {
      setSaving(false)
    }
  }

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <ImportMethodSelector
            onManualEntry={onCancel}
            onImportComplete={handleImportComplete}
          />
        )

      case 'review':
        if (!parseResult) return null
        return (
          <ImportReviewScreen
            parseResult={parseResult}
            importId={importId}
            onContinue={handleReviewContinue}
            onCancel={onCancel}
          />
        )

      case 'edit':
        if (!formData || selectedPackages.length === 0) return null
        const currentPackage = selectedPackages[currentPackageIndex]
        const globalIndex = formData.packages.findIndex(p => p === currentPackage)

        return (
          <div className="space-y-6">
            {/* Progress header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Uređivanje paketa
                </h2>
                <p className="text-sm text-gray-500">
                  Paket {currentPackageIndex + 1} od {selectedPackages.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedPackages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPackageIndex(i)}
                    className={cn(
                      'w-8 h-8 rounded-full text-sm font-medium transition-colors',
                      i === currentPackageIndex
                        ? 'bg-teal-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Package form */}
            <ImportedPackageForm
              package={currentPackage}
              index={currentPackageIndex}
              currency={formData.currency}
              businessModel={formData.business_model}
              marginPercent={formData.margin_percent}
              transport={formData.transport}
              organizationId={organizationId}
              onChange={(updates) => updatePackage(globalIndex, updates)}
              onTransportListCreated={setTransportListId}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPrevPackage}
                disabled={currentPackageIndex === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prethodni
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Nazad na pregled
                </button>

                {currentPackageIndex < selectedPackages.length - 1 ? (
                  <button
                    type="button"
                    onClick={goToNextPackage}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                  >
                    Sledeći →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Sačuvaj sve ({selectedPackages.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )

      case 'saving':
        return (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-teal-500 animate-spin mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              Čuvam pakete...
            </h2>
            <p className="text-gray-500 mt-2">
              {saveProgress.current} od {saveProgress.total} sačuvano
            </p>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center py-12">
            <div className={cn(
              'w-16 h-16 rounded-full mx-auto flex items-center justify-center',
              errors.length > 0 ? 'bg-amber-100' : 'bg-green-100'
            )}>
              {errors.length > 0 ? (
                <AlertCircle className="h-8 w-8 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              {errors.length > 0 
                ? 'Import delimično završen'
                : 'Import uspešno završen!'}
            </h2>
            
            <p className="text-gray-500 mt-2">
              Kreirano {savedPackageIds.length} paket{savedPackageIds.length === 1 ? '' : 'a'}
            </p>

            {errors.length > 0 && (
              <div className="mt-4 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-amber-700 mb-2">Greške:</p>
                <ul className="text-sm text-amber-600 space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/packages')}
                className="px-6 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                Vidi sve pakete
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('upload')
                  setParseResult(null)
                  setFormData(null)
                  setSavedPackageIds([])
                  setErrors([])
                }}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Importuj još
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button (except on complete) */}
      {step !== 'complete' && step !== 'saving' && (
        <button
          type="button"
          onClick={() => {
            if (step === 'upload') {
              onCancel()
            } else if (step === 'review') {
              setStep('upload')
            } else if (step === 'edit') {
              setStep('review')
            }
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Nazad</span>
        </button>
      )}

      {renderStep()}
    </div>
  )
}
