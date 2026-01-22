'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Users, Euro, Plane, TrendingUp } from 'lucide-react'
import { useLeads, type LeadFilters } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { useChat } from '@/contexts/ChatContext'
import type { Lead } from '@/types'
import CustomerCard from '@/components/customers/CustomerCard'

export default function LeadsPage() {
  const router = useRouter()
  const { getLeads, loading } = useLeads()
  const { stages, sources, teamMembers } = useOrganization()
  const { openChat } = useChat()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<LeadFilters>({ only_won: true })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadLeads() {
      const leadsData = await getLeads(filters)
      setLeads(leadsData)
    }
    loadLeads()
  }, [filters, getLeads])

  // Calculate stats
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
  const totalCustomers = leads.length

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

  const handleOpenChat = (leadId: string) => {
    openChat(leadId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Klijenti</h1>
          <p className="text-sm text-[#64748B] mt-1">Klijenti koji su završili kupovinu</p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novi klijent
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ukupno klijenata</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">{totalCustomers}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Users className="h-6 w-6 text-[#3B82F6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ukupna vrednost</p>
              <p className="text-2xl font-bold text-[#10B981] mt-1">€{totalValue.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Euro className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Prosečna vrednost</p>
              <p className="text-2xl font-bold text-[#8B5CF6] mt-1">
                €{totalCustomers > 0 ? Math.round(totalValue / totalCustomers).toLocaleString() : 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3FF]">
              <TrendingUp className="h-6 w-6 text-[#8B5CF6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ovog meseca</p>
              <p className="text-2xl font-bold text-[#F97316] mt-1">
                {leads.filter(l => {
                  const d = new Date(l.created_at)
                  const now = new Date()
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Plane className="h-6 w-6 text-[#F97316]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži po imenu, emailu, telefonu..."
            className="block w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.source_id || ''}
            onChange={(e) =>
              setFilters({ ...filters, source_id: e.target.value || undefined })
            }
            className="rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none"
          >
            <option value="">Svi izvori</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>

          <select
            value={filters.assigned_to || ''}
            onChange={(e) =>
              setFilters({ ...filters, assigned_to: e.target.value || undefined })
            }
            className="rounded-[10px] border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none"
          >
            <option value="">Svi agenti</option>
            {teamMembers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers Grid */}
      {loading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Users className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#64748B] mb-2">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema klijenata sa završenom kupovinom.'}
          </p>
          <p className="text-sm text-[#94A3B8]">
            Klijenti će se ovde pojaviti kada ih pomerite u "Zatvoreno" fazu u pipeline-u.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <CustomerCard
              key={lead.id}
              customer={lead}
              onOpenChat={handleOpenChat}
            />
          ))}
        </div>
      )}

      {/* Footer count */}
      {filteredLeads.length > 0 && (
        <p className="text-sm text-[#64748B] text-center">
          Prikazano {filteredLeads.length} od {leads.length} klijenata
        </p>
      )}
    </div>
  )
}
