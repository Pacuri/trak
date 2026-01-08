'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { startOfWeek, startOfMonth, subDays, format, parseISO } from 'date-fns'
import type { Lead } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AnalyticsPage() {
  const { organizationId } = useUser()
  const { getLeads } = useLeads()
  const { stages, teamMembers } = useOrganization()
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadLeads() {
      if (!organizationId) return

      setLoading(true)
      const allLeads = await getLeads()

      // Filter by date range
      let filteredLeads = allLeads
      const now = new Date()

      if (dateRange === 'week') {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        filteredLeads = allLeads.filter(
          (lead) => parseISO(lead.created_at) >= weekStart
        )
      } else if (dateRange === 'month') {
        const monthStart = startOfMonth(now)
        filteredLeads = allLeads.filter(
          (lead) => parseISO(lead.created_at) >= monthStart
        )
      }

      setLeads(filteredLeads)
      setLoading(false)
    }

    loadLeads()
  }, [organizationId, getLeads, dateRange])

  // Calculate stats
  const wonStages = stages.filter((s) => s.is_won).map((s) => s.id)
  const lostStages = stages.filter((s) => s.is_lost).map((s) => s.id)
  const wonLeads = leads.filter((lead) => wonStages.includes(lead.stage_id || ''))
  const lostLeads = leads.filter((lead) => lostStages.includes(lead.stage_id || ''))
  const totalLeads = leads.length
  const conversionRate =
    totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : '0.0'
  const totalRevenue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)

  // Leads over time data
  const leadsOverTime = (() => {
    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90
    const data: Record<string, number> = {}

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      data[date] = 0
    }

    leads.forEach((lead) => {
      const date = format(parseISO(lead.created_at), 'yyyy-MM-dd')
      if (data[date] !== undefined) {
        data[date]++
      }
    })

    return Object.entries(data).map(([date, count]) => ({
      date: format(parseISO(date), 'MMM d'),
      leads: count,
    }))
  })()

  // Leads by source
  const leadsBySource = (() => {
    const sourceMap: Record<string, number> = {}
    leads.forEach((lead) => {
      const sourceName = lead.source?.name || 'Unknown'
      sourceMap[sourceName] = (sourceMap[sourceName] || 0) + 1
    })
    return Object.entries(sourceMap).map(([name, value]) => ({ name, value }))
  })()

  // Agent performance
  const agentPerformance = teamMembers.map((agent) => {
    const agentLeads = leads.filter((lead) => lead.assigned_to === agent.id)
    const agentWon = agentLeads.filter((lead) => wonStages.includes(lead.stage_id || ''))
    const conversion =
      agentLeads.length > 0 ? ((agentWon.length / agentLeads.length) * 100).toFixed(1) : '0.0'

    return {
      name: agent.full_name || agent.email,
      leads: agentLeads.length,
      won: agentWon.length,
      conversion: `${conversion}%`,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Analytics</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Track your lead performance and metrics.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('week')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              dateRange === 'week'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-[#374151] border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              dateRange === 'month'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-[#374151] border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              dateRange === 'all'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-[#374151] border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Total Leads</p>
          <p className="mt-2 text-2xl font-bold text-[#111827]">{totalLeads}</p>
        </div>
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Won</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{wonLeads.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Lost</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{lostLeads.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Conversion Rate</p>
          <p className="mt-2 text-2xl font-bold text-[#111827]">{conversionRate}%</p>
        </div>
        <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-[#111827]">${totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="rounded-lg bg-white p-12 text-center border border-gray-200 shadow-sm">
          <p className="text-[#6B7280]">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Leads Over Time */}
          <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827] mb-4">Leads Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Leads by Source */}
            <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827] mb-4">Leads by Source</h2>
              {leadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#6B7280]">
                  No data available
                </div>
              )}
            </div>

            {/* Leads by Source Bar Chart */}
            <div className="rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827] mb-4">Leads by Source (Bar)</h2>
              {leadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadsBySource}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563EB" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#6B7280]">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Agent Performance Table */}
          <div className="rounded-lg bg-white border border-gray-200 shadow-sm">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-[#111827] mb-4">Agent Performance</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                        Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                        Won
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6B7280]">
                        Conversion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agentPerformance.map((agent, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#111827]">
                          {agent.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#374151]">
                          {agent.leads}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#374151]">
                          {agent.won}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#374151]">
                          {agent.conversion}
                        </td>
                      </tr>
                    ))}
                    {agentPerformance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-[#6B7280]">
                          No agent performance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
