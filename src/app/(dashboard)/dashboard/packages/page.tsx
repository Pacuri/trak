'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePackages } from '@/hooks/use-packages'
import { useUser } from '@/hooks/use-user'
import { useOrganization } from '@/hooks/use-organization'
import { PackagesList } from '@/components/packages'
import type { Package } from '@/types/packages'
import { PACKAGE_UI_TEXT } from '@/lib/package-labels'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function PackagesPage() {
  const { getPackages, archivePackage, toggleFeatured, loading, error } = usePackages()
  const { loading: userLoading } = useUser()
  const { organization } = useOrganization()
  const [packages, setPackages] = useState<Package[]>([])

  const loadPackages = useCallback(async () => {
    const data = await getPackages()
    setPackages(data)
  }, [getPackages])

  useEffect(() => {
    // Only load packages after user data is ready
    if (userLoading) return
    loadPackages()
  }, [loadPackages, userLoading])

  const handleArchive = useCallback(async (id: string) => {
    if (!confirm('Da li ste sigurni da želite arhivirati ovaj paket?')) return
    const success = await archivePackage(id)
    if (success) {
      // Refresh the list after archiving
      loadPackages()
    }
  }, [archivePackage, loadPackages])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{PACKAGE_UI_TEXT.list_title}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upravljajte paketima i polascima
          </p>
        </div>
        {organization?.slug && (
          <Link
            href={`/a/${organization.slug}/ponude`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Pogledaj javnu stranicu
          </Link>
        )}
      </div>

      {/* Error state - only show if user is loaded and there's an actual error */}
      {error && !userLoading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Packages list */}
      <PackagesList
        packages={packages}
        loading={loading}
        onArchive={handleArchive}
        onToggleFeatured={toggleFeatured}
        organizationSlug={organization?.slug || null}
      />
    </div>
  )
}
