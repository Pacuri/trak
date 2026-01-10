'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { startOfWeek, startOfMonth, subDays, format, parseISO } from 'date-fns'
import { BarChart3, TrendingUp, TrendingDown, Users, Target, Euro } from 'lucide-react'
import type { Lead } from '@/types'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

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
      date: format(parseISO(date), 'd. MMM'),
      upiti: count,
    }))
  })()

  // Leads by source
  const leadsBySource = (() => {
    const sourceMap: Record<string, number> = {}
    leads.forEach((lead) => {
      const sourceName = lead.source?.name || 'Nepoznato'
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

  const StatCard = ({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    value,
    valueColor = 'text-[#1E293B]'
  }: {
    icon: any
    iconBg: string
    iconColor: string
    label: string
    value: string | number
    valueColor?: string
  }) => (
    <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-[#64748B]">{label}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Analitika</h1>
          <p className="mt-1 text-sm text-[#64748B]">Pratite performanse vaših upita i metrike</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('week')}
            className={`px-5 py-2.5 text-sm font-medium rounded-[10px] transition-all ${
              dateRange === 'week'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
            }`}
          >
            Ova nedelja
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-5 py-2.5 text-sm font-medium rounded-[10px] transition-all ${
              dateRange === 'month'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
            }`}
          >
            Ovaj mesec
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-5 py-2.5 text-sm font-medium rounded-[10px] transition-all ${
              dateRange === 'all'
                ? 'bg-[#3B82F6] text-white shadow-md'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#1E293B]'
            }`}
          >
            Sve vreme
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={BarChart3}
          iconBg="bg-[#EFF6FF]"
          iconColor="text-[#3B82F6]"
          label="Ukupno upita"
          value={totalLeads}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-[#ECFDF5]"
          iconColor="text-[#10B981]"
          label="Dobijeno"
          value={wonLeads.length}
          valueColor="text-[#10B981]"
        />
        <StatCard
          icon={TrendingDown}
          iconBg="bg-[#FEF2F2]"
          iconColor="text-[#EF4444]"
          label="Izgubljeno"
          value={lostLeads.length}
          valueColor="text-[#EF4444]"
        />
        <StatCard
          icon={Target}
          iconBg="bg-[#F5F3FF]"
          iconColor="text-[#8B5CF6]"
          label="Stopa konverzije"
          value={`${conversionRate}%`}
        />
        <StatCard
          icon={Euro}
          iconBg="bg-[#FFF7ED]"
          iconColor="text-[#F97316]"
          label="Ukupan prihod"
          value={`€${totalRevenue.toLocaleString()}`}
          valueColor="text-[#10B981]"
        />
      </div>

      {/* Charts */}
      {loading ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Leads Over Time */}
          <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Upiti kroz vreme</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="upiti"
                  name="Upiti"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Leads by Source - Pie */}
            <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
              <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Upiti po izvoru</h2>
              {leadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {leadsBySource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#64748B]">
                  Nema dostupnih podataka
                </div>
              )}
            </div>

            {/* Leads by Source - Bar */}
            <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
              <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Upiti po izvoru (stupci)</h2>
              {leadsBySource.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leadsBySource}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)'
                      }}
                    />
                    <Bar dataKey="value" name="Broj upita" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-[#64748B]">
                  Nema dostupnih podataka
                </div>
              )}
            </div>
          </div>

          {/* Agent Performance Table */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3FF]">
                <Users className="h-5 w-5 text-[#8B5CF6]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Performanse agenata</h2>
                <p className="text-sm text-[#64748B]">Pregled uspešnosti po članu tima</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E8F0]">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Upiti
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Dobijeno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Stopa konverzije
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E2E8F0]">
                  {agentPerformance.map((agent, index) => (
                    <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xs font-semibold text-white">
                            {agent.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#1E293B]">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                        {agent.leads}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-medium text-[#10B981]">
                          {agent.won}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-[#1E293B]">
                          {agent.conversion}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {agentPerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-[#64748B]">
                        Nema dostupnih podataka o performansama agenata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
