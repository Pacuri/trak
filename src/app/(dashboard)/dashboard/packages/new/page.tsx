'use client'

import { usePackages } from '@/hooks/use-packages'
import { PackageFormWizard } from '@/components/packages'
import type { PackageFormData } from '@/types/packages'

export default function NewPackagePage() {
  const { createPackage, loading, error } = usePackages()

  const handleSubmit = async (data: PackageFormData) => {
    return await createPackage(data)
  }

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
      />
    </>
  )
}
