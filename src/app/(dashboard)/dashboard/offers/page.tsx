'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Upload, Package } from 'lucide-react'
import { useOffers, type OfferFilters } from '@/hooks/use-offers'
import type { Offer } from '@/types'
import OfferTableRow from '@/components/offers/OfferTableRow'
import CSVImportModal from '@/components/offers/CSVImportModal'

export default function OffersPage() {
  const { getOffers, updateCapacity, archiveOffer, loading } = useOffers()
  const [offers, setOffers] = useState<Offer[]>([])
  const [filters, setFilters] = useState<OfferFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'sold_out' | 'archived' | 'all'>('active')

  useEffect(() => {
    loadOffers()
  }, [filters])

  const loadOffers = async () => {
    const data = await getOffers(filters)
    setOffers(data)
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'all') {
      setFilters({ ...filters, status: undefined })
    } else {
      setFilters({ ...filters, status: tab })
    }
  }

  const handleCapacityUpdate = async (id: string, spots: number) => {
    const success = await updateCapacity(id, spots)
    if (success) {
      loadOffers()
    }
  }

  const handleArchive = async (id: string) => {
    if (confirm('Da li ste sigurni da želite da arhivirate ovu ponudu?')) {
      const success = await archiveOffer(id)
      if (success) {
        loadOffers()
      }
    }
  }

  const handleImport = async (file: File): Promise<{ success: number; errors: string[] }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/offers/import', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (result.success) {
        loadOffers()
      }
      return { success: result.imported || 0, errors: result.errors || [] }
    } catch {
      return { success: 0, errors: ['Greška pri importu'] }
    }
  }

  // Filter by search
  const filteredOffers = offers.filter((offer) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      offer.name.toLowerCase().includes(query) ||
      offer.country.toLowerCase().includes(query) ||
      offer.city?.toLowerCase().includes(query)
    )
  })

  const stats = {
    active: offers.filter(o => o.status === 'active').length,
    sold_out: offers.filter(o => o.status === 'sold_out').length,
    archived: offers.filter(o => o.status === 'archived').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Ponude</h1>
          <p className="text-sm text-[#64748B] mt-1">Upravljajte vašim ponudama i kapacitetom</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-all"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </button>
          <Link
            href="/dashboard/offers/new"
            className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova ponuda
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        {[
          { key: 'active', label: 'Aktivne', count: stats.active },
          { key: 'sold_out', label: 'Rasprodato', count: stats.sold_out },
          { key: 'archived', label: 'Arhivirane', count: stats.archived },
          { key: 'all', label: 'Sve', count: offers.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as typeof activeTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-[#3B82F6] border-[#3B82F6]'
                : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs rounded-full bg-[#F1F5F9] px-2 py-0.5">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Pretraga
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pretraži po nazivu, destinaciji..."
                className="block w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#64748B] lg:hidden">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filteri</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto lg:flex lg:gap-3">
            <div className="lg:w-40">
              <label htmlFor="type-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Tip
              </label>
              <select
                id="type-filter"
                value={filters.inventory_type || ''}
                onChange={(e) =>
                  setFilters({ ...filters, inventory_type: (e.target.value as 'owned' | 'inquiry') || undefined })
                }
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Svi tipovi</option>
                <option value="owned">Vlastite</option>
                <option value="inquiry">Na upit</option>
              </select>
            </div>

            <div className="lg:w-40">
              <label htmlFor="country-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Država
              </label>
              <select
                id="country-filter"
                value={filters.country || ''}
                onChange={(e) =>
                  setFilters({ ...filters, country: e.target.value || undefined })
                }
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Sve države</option>
                {[...new Set(offers.map(o => o.country))].map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && offers.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Package className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#64748B] mb-4">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema ponuda za prikaz.'}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/offers/new"
              className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj prvu ponudu
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Ponuda
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B] lg:table-cell">
                    Datumi
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Cena
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Kapacitet
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B] md:table-cell">
                    Pregledi
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    <span className="sr-only">Akcije</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredOffers.map((offer) => (
                  <OfferTableRow
                    key={offer.id}
                    offer={offer}
                    onArchive={handleArchive}
                    onCapacityUpdate={handleCapacityUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
            <p className="text-sm text-[#64748B]">
              Prikazano {filteredOffers.length} od {offers.length} ponuda
            </p>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <CSVImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}
