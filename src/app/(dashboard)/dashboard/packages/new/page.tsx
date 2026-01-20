'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePackages } from '@/hooks/use-packages'
import { useUser } from '@/hooks/use-user'
import { PackageFormWizard, DocumentImportFlow } from '@/components/packages'
import type { PackageFormData } from '@/types/packages'
import { 
  FileText, 
  Upload, 
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type EntryMethod = null | 'manual' | 'import'

export default function NewPackagePage() {
  const router = useRouter()
  const { createPackage, loading, error } = usePackages()
  const { user } = useUser()
  const [entryMethod, setEntryMethod] = useState<EntryMethod>(null)

  const handleSubmit = async (data: PackageFormData) => {
    return await createPackage(data)
  }

  const handleImportComplete = (packageIds: string[]) => {
    // Navigate to packages list after successful import
    router.push('/dashboard/packages')
  }

  // Method Selector - shows FIRST
  if (entryMethod === null) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard/packages')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Nazad</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Kako želite kreirati paket?
          </h1>
          <p className="text-gray-500 mt-2">
            Možete uneti podatke ručno ili importovati iz dokumenta dobavljača
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Manual Entry */}
          <button
            type="button"
            onClick={() => setEntryMethod('manual')}
            className={cn(
              'flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all',
              'border-gray-200 hover:border-teal-500 hover:bg-teal-50/50',
              'cursor-pointer group'
            )}
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
              <FileText className="h-8 w-8 text-gray-500 group-hover:text-teal-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Unesi ručno</p>
              <p className="text-sm text-gray-500 mt-1">Korak po korak kroz wizard</p>
            </div>
          </button>

          {/* Import from Document */}
          <button
            type="button"
            onClick={() => setEntryMethod('import')}
            className={cn(
              'flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed transition-all',
              'border-gray-300 hover:border-teal-500 hover:bg-teal-50/50',
              'cursor-pointer group'
            )}
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
              <Upload className="h-8 w-8 text-gray-500 group-hover:text-teal-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Importuj iz dokumenta</p>
              <p className="text-sm text-gray-500 mt-1">PDF, slika ili Excel cenovnika</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Import Flow
  if (entryMethod === 'import') {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <DocumentImportFlow
          organizationId={user?.organization_id || ''}
          onCancel={() => setEntryMethod(null)}
          onComplete={handleImportComplete}
        />
      </div>
    )
  }

  // Manual Entry - Wizard
  return (
    <>
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}
      
      <PackageFormWizard
        mode="create"
        onSubmit={handleSubmit}
        loading={loading}
        onBack={() => setEntryMethod(null)}
      />
    </>
  )
}
