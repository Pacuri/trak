'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Package as PackageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Package, PackageType } from '@/types/packages'
import { PACKAGE_TYPE_SHORT_LABELS, PACKAGE_UI_TEXT } from '@/lib/package-labels'
import { PackageCard } from './PackageCard'

interface PackagesListProps {
  packages: Package[]
  loading?: boolean
  onArchive?: (id: string) => Promise<void>
  onToggleFeatured?: (id: string, isFeatured: boolean) => Promise<boolean>
  organizationSlug?: string | null
}

type FilterType = 'all' | PackageType

export function PackagesList({ packages, loading, onArchive, onToggleFeatured, organizationSlug }: PackagesListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  
  const filteredPackages = packages.filter(p => {
    if (filter !== 'all' && p.package_type !== filter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(searchLower) ||
        p.destination_country?.toLowerCase().includes(searchLower) ||
        p.destination_city?.toLowerCase().includes(searchLower) ||
        p.hotel_name?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: PACKAGE_UI_TEXT.filter_all },
    { value: 'fiksni', label: PACKAGE_TYPE_SHORT_LABELS.fiksni },
    { value: 'na_upit', label: PACKAGE_TYPE_SHORT_LABELS.na_upit },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={PACKAGE_UI_TEXT.search_placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  filter === opt.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Create button */}
        <Link href="/dashboard/packages/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors">
            <Plus className="h-4 w-4" />
            {PACKAGE_UI_TEXT.create_button}
          </button>
        </Link>
      </div>
      
      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <PackageIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {PACKAGE_UI_TEXT.no_packages}
          </h3>
          <p className="text-gray-500 mt-1">
            {search ? 'Nema rezultata pretrage' : PACKAGE_UI_TEXT.no_packages_description}
          </p>
          {!search && (
            <Link href="/dashboard/packages/new" className="inline-block mt-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors">
                <Plus className="h-4 w-4" />
                {PACKAGE_UI_TEXT.create_button}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPackages.map(pkg => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onArchive={onArchive}
              onToggleFeatured={onToggleFeatured}
              organizationSlug={organizationSlug}
            />
          ))}
        </div>
      )}
    </div>
  )
}
