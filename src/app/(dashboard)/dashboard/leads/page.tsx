'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Filter, Search, Facebook, Instagram, Globe, Mail, Phone, Users, Archive } from 'lucide-react'
import { useLeads, type LeadFilters } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import type { Lead } from '@/types'

// Source Icon Component
function SourceIcon({ source }: { source?: string }) {
  switch (source?.toLowerCase()) {
    case 'facebook':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2]">
          <Facebook className="h-3.5 w-3.5 text-white" />
        </div>
      )
    case 'instagram':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
          <Instagram className="h-3.5 w-3.5 text-white" />
        </div>
      )
    case 'website':
    case 'web':
    case 'sa sajta':
    case 'trak':
      return (
        <img src="/trak-logo-circle.png" alt="trak" className="h-7 w-7" />
      )
    case 'email':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316]">
          <Mail className="h-3.5 w-3.5 text-white" />
        </div>
      )
    case 'phone':
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8B5CF6]">
          <Phone className="h-3.5 w-3.5 text-white" />
        </div>
      )
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#94A3B8]">
          <Users className="h-3.5 w-3.5 text-white" />
        </div>
      )
  }
}

// Status Badge Component
function StatusBadge({ stageName }: { stageName?: string }) {
  const getStatusStyle = (name?: string) => {
    switch (name?.toLowerCase()) {
      case 'novi':
      case 'new':
        return 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]/20'
      case 'kontaktiran':
      case 'contacted':
        return 'bg-[#F5F3FF] text-[#8B5CF6] border-[#8B5CF6]/20'
      case 'ponuda':
      case 'proposal':
        return 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]/20'
      case 'pregovaranje':
      case 'negotiation':
        return 'bg-[#FDF2F8] text-[#EC4899] border-[#EC4899]/20'
      case 'zatvoreno':
      case 'won':
      case 'closed':
        return 'bg-[#ECFDF5] text-[#10B981] border-[#10B981]/20'
      case 'izgubljeno':
      case 'lost':
        return 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20'
      default:
        return 'bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20'
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${getStatusStyle(stageName)}`}>
      {stageName || 'Nepoznato'}
    </span>
  )
}

export default function LeadsPage() {
  const router = useRouter()
  const { getLeads, loading } = useLeads()
  const { stages, sources, teamMembers } = useOrganization()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<LeadFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadLeads() {
      const leadsData = await getLeads(filters)
      setLeads(leadsData)
    }
    loadLeads()
  }, [filters, getLeads])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-Latn', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Filter leads by search query
  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Klijenti</h1>
          <p className="text-sm text-[#64748B] mt-1">Upravljajte svim vašim klijentima i kontaktima</p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novi klijent
        </Link>
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
                placeholder="Pretraži po imenu, emailu, telefonu..."
                className="block w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          {/* Filter Icon + Filters */}
          <div className="flex items-center gap-2 text-[#64748B] lg:hidden">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filteri</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:w-auto lg:flex lg:gap-3">
            <div className="lg:w-40">
              <label htmlFor="stage-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Status
              </label>
              <select
                id="stage-filter"
                value={filters.stage_id || ''}
                onChange={(e) =>
                  setFilters({ ...filters, stage_id: e.target.value || undefined })
                }
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Svi statusi</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:w-40">
              <label htmlFor="source-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Izvor
              </label>
              <select
                id="source-filter"
                value={filters.source_id || ''}
                onChange={(e) =>
                  setFilters({ ...filters, source_id: e.target.value || undefined })
                }
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Svi izvori</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:w-40">
              <label htmlFor="agent-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Agent
              </label>
              <select
                id="agent-filter"
                value={filters.assigned_to || ''}
                onChange={(e) =>
                  setFilters({ ...filters, assigned_to: e.target.value || undefined })
                }
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              >
                <option value="">Svi agenti</option>
                {teamMembers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Archived Toggle */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ ...filters, show_archived: !filters.show_archived })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all border ${
                  filters.show_archived
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30'
                    : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Arhivirani</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {loading && leads.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Users className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#64748B] mb-4">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema klijenata za prikaz.'}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/leads/new"
              className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj prvog klijenta
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
                    Kontakt
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B] sm:table-cell">
                    Izvor
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Status
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B] md:table-cell">
                    Vrednost
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B] lg:table-cell">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className={`cursor-pointer hover:bg-[#F8FAFC] transition-colors ${lead.is_archived ? 'opacity-60' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${
                          lead.is_archived
                            ? 'bg-[#94A3B8]'
                            : 'bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]'
                        }`}>
                          {lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#1E293B]">{lead.name}</p>
                            {lead.is_archived && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] text-[10px] font-medium">
                                <Archive className="h-3 w-3" />
                                Arhiviran
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748B]">{lead.email || lead.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <div className="flex items-center gap-2">
                        <SourceIcon source={lead.source?.name || lead.source_type || undefined} />
                        <span className="text-sm text-[#64748B]">
                          {(lead.source?.name?.toLowerCase() === 'website' || lead.source_type === 'website') ? 'trak' : (lead.source?.name || lead.source_type || '-')}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge stageName={lead.stage?.name} />
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      {lead.value ? (
                        <span className="text-sm font-semibold text-[#10B981]">
                          €{lead.value.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-[#94A3B8]">-</span>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 lg:table-cell">
                      <span className="text-sm text-[#64748B]">{formatDate(lead.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
            <p className="text-sm text-[#64748B]">
              Prikazano {filteredLeads.length} od {leads.length} klijenata
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
