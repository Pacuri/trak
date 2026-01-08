'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Filter } from 'lucide-react'
import { useLeads, type LeadFilters } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { getStageBadgeColor } from '@/lib/utils'
import type { Lead } from '@/types'

export default function LeadsPage() {
  const router = useRouter()
  const { getLeads, loading } = useLeads()
  const { stages, sources, teamMembers } = useOrganization()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filters, setFilters] = useState<LeadFilters>({})

  useEffect(() => {
    async function loadLeads() {
      const leadsData = await getLeads()
      setLeads(leadsData)
    }
    loadLeads()
  }, [getLeads])

  useEffect(() => {
    async function loadLeads() {
      const leadsData = await getLeads(filters)
      setLeads(leadsData)
    }
    loadLeads()
  }, [filters, getLeads])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#1E293B]">Leads</h1>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-[#64748B]" />
          <h2 className="text-sm font-medium text-[#1E293B]">Filters</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="stage-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Stage
            </label>
            <select
              id="stage-filter"
              value={filters.stage_id || ''}
              onChange={(e) =>
                setFilters({ ...filters, stage_id: e.target.value || undefined })
              }
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
            >
              <option value="">All Stages</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Source
            </label>
            <select
              id="source-filter"
              value={filters.source_id || ''}
              onChange={(e) =>
                setFilters({ ...filters, source_id: e.target.value || undefined })
              }
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
            >
              <option value="">All Sources</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="agent-filter" className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Assigned Agent
            </label>
            <select
              id="agent-filter"
              value={filters.assigned_to || ''}
              onChange={(e) =>
                setFilters({ ...filters, assigned_to: e.target.value || undefined })
              }
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-0"
            >
              <option value="">All Agents</option>
              {teamMembers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {loading && leads.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <p className="text-[#64748B]">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <p className="text-[#64748B] mb-4">No leads found.</p>
          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Lead
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Phone
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B] sm:table-cell">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Stage
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B] md:table-cell">
                    Assigned To
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B] lg:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E2E8F0]">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[#1E293B]">
                      {lead.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#64748B]">
                      {lead.phone || '-'}
                    </td>
                    <td className="hidden px-4 py-4 whitespace-nowrap text-sm text-[#64748B] sm:table-cell">
                      {lead.source?.name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#64748B]">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStageBadgeColor(lead.stage?.name || 'Unassigned')}`}>
                        {lead.stage?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 whitespace-nowrap text-sm text-[#64748B] md:table-cell">
                      {lead.assigned_user?.email || '-'}
                    </td>
                    <td className="hidden px-4 py-4 whitespace-nowrap text-sm text-[#64748B] lg:table-cell">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
