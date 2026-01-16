'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Package as PackageIcon } from 'lucide-react'
import { usePackages } from '@/hooks/use-packages'
import { PackageFormWizard } from '@/components/packages'
import type { Package, PackageFormData } from '@/types/packages'

export default function EditPackagePage() {
  const params = useParams()
  const packageId = params.id as string
  
  const { getPackage, updatePackage, loading, error } = usePackages()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPackage() {
      setIsLoading(true)
      const data = await getPackage(packageId)
      setPkg(data)
      setIsLoading(false)
    }
    loadPackage()
  }, [getPackage, packageId])

  const handleSubmit = async (data: PackageFormData) => {
    return await updatePackage(packageId, data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="text-center py-12">
        <PackageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Paket nije pronađen</h2>
        <Link href="/dashboard/packages" className="text-teal-600 hover:underline mt-2 inline-block">
          Nazad na listu
        </Link>
      </div>
    )
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
        mode="edit"
        initialData={pkg}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </>
  )
}
