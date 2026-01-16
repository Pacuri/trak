'use client'

import { useEffect, useState } from 'react'
import { usePackages } from '@/hooks/use-packages'
import { useUser } from '@/hooks/use-user'
import { PackagesList } from '@/components/packages'
import type { Package } from '@/types/packages'
import { PACKAGE_UI_TEXT } from '@/lib/package-labels'

export default function PackagesPage() {
  const { getPackages, loading, error } = usePackages()
  const { loading: userLoading } = useUser()
  const [packages, setPackages] = useState<Package[]>([])

  useEffect(() => {
    // Only load packages after user data is ready
    if (userLoading) return
    
    async function loadPackages() {
      const data = await getPackages()
      setPackages(data)
    }
    loadPackages()
  }, [getPackages, userLoading])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{PACKAGE_UI_TEXT.list_title}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upravljajte paketima i polascima
        </p>
      </div>

      {/* Error state - only show if user is loaded and there's an actual error */}
      {error && !userLoading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Packages list */}
      <PackagesList packages={packages} loading={loading} />
    </div>
  )
}
