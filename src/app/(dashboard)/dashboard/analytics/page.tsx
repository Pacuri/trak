'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Euro,
  Clock,
  Mail,
  MessageSquare,
  Globe,
  Inbox,
  MapPin,
  Package,
  Zap,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface SourceAnalytics {
  source: string
  label: string
  total: number
  won: number
  lost: number
  active: number
  revenue: number
  conversionRate: number
  color: string
}

interface PipelineStage {
  id: string
  name: string
  color: string
  count: number
  value: number
}

interface AgentPerformance {
  id: string
  name: string
  email: string
  leads: number
  won: number
  lost: number
  active: number
  revenue: number
  conversionRate: number
  avgResponseMinutes: number | null
}

interface PackagePerf {
  name: string
  inquiries: number
  converted: number
  conversionRate: number
}

interface Destination {
  name: string
  leads: number
  won: number
  revenue: number
  conversionRate: number
}

interface AnalyticsData {
  overview: {
    totalLeads: number
    wonLeads: number
    lostLeads: number
    activeLeads: number
    conversionRate: number
    totalRevenue: number
    bookingsRevenue: number
    avgDealValue: number
    awaitingResponse: number
    responseTime: {
      avgMinutes: number
      under1h: number
      under4h: number
      under24h: number
      total: number
    }
    comparison: {
      leads: number | null
      won: number | null
      revenue: number | null
      conversionRate: number | null
    }
    velocity: {
      avgDays: number | null
      fastestDays: number | null
      slowestDays: number | null
      sampleSize: number
    }
  }
  sourceAnalytics: SourceAnalytics[]
  pipelineFunnel: PipelineStage[]
  leadsOverTime: { date: string; upiti: number; dobijeno: number; izgubljeno: number }[]
  revenueOverTime: { date: string; prihod: number }[]
  packagePerformance: PackagePerf[]
  topDestinations: Destination[]
  agentPerformance: AgentPerformance[]
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  facebook: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  instagram: <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  trak: <Globe className="h-4 w-4" />,
  other: <Globe className="h-4 w-4" />
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?range=${dateRange}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`
    if (minutes < 1440) return `${Math.round(minutes / 60)} h`
    return `${Math.round(minutes / 1440)} dana`
  }

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE')}`
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Analitika</h1>
            <p className="mt-1 text-sm text-[#64748B]">Sveobuhvatan pregled vaših performansi</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#64748B]">Greška pri učitavanju podataka</p>
        <button onClick={fetchData} className="mt-4 text-[#3B82F6] hover:underline">
          Pokušaj ponovo
        </button>
      </div>
    )
  }

  const { overview, sourceAnalytics, pipelineFunnel, leadsOverTime, revenueOverTime, packagePerformance, topDestinations, agentPerformance } = data

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Analitika</h1>
          <p className="mt-1 text-sm text-[#64748B]">Sveobuhvatan pregled vaših performansi</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-[10px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
            title="Osveži"
          >
            <RefreshCw className={`h-4 w-4 text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-white border border-[#E2E8F0] rounded-[10px] p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  dateRange === range
                    ? 'bg-[#3B82F6] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                }`}
              >
                {range === 'week' ? '7 dana' :
                 range === 'month' ? '30 dana' :
                 range === 'quarter' ? '90 dana' : 'Godina'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Ukupno upita"
          value={overview.totalLeads}
          change={overview.comparison?.leads}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Dobijeno"
          value={overview.wonLeads}
          valueColor="text-emerald-600"
          change={overview.comparison?.won}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          label="Izgubljeno"
          value={overview.lostLeads}
          valueColor="text-red-500"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Konverzija"
          value={`${overview.conversionRate.toFixed(1)}%`}
          change={overview.comparison?.conversionRate}
        />
        <StatCard
          icon={<Euro className="h-5 w-5" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Prihod"
          value={formatCurrency(overview.totalRevenue)}
          valueColor="text-emerald-600"
          change={overview.comparison?.revenue}
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Brzina zatvaranja"
          value={overview.velocity?.avgDays !== null ? `${Math.round(overview.velocity.avgDays)} dana` : '-'}
        />
      </div>

      {/* Response Time Bar + Awaiting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Response Time Distribution */}
        <div className="lg:col-span-2 rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1E293B]">Brzina odgovora</h3>
            <span className="text-xs text-[#64748B]">{overview.responseTime.total} odgovora mereno</span>
          </div>
          <div className="space-y-3">
            <ResponseBar
              label="< 1 sat"
              count={overview.responseTime.under1h}
              total={overview.responseTime.total}
              color="bg-emerald-500"
            />
            <ResponseBar
              label="1-4 sata"
              count={overview.responseTime.under4h - overview.responseTime.under1h}
              total={overview.responseTime.total}
              color="bg-blue-500"
            />
            <ResponseBar
              label="4-24 sata"
              count={overview.responseTime.under24h - overview.responseTime.under4h}
              total={overview.responseTime.total}
              color="bg-amber-500"
            />
            <ResponseBar
              label="> 24 sata"
              count={overview.responseTime.total - overview.responseTime.under24h}
              total={overview.responseTime.total}
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-[14px] p-5 shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-white/80">Čeka odgovor</p>
              <p className="text-3xl font-bold">{overview.awaitingResponse}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/80">Aktivni upiti</span>
              <span className="font-semibold">{overview.activeLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/80">Prosečna vrednost</span>
              <span className="font-semibold">{formatCurrency(overview.avgDealValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/80">Avg. odgovor</span>
              <span className="font-semibold">{formatResponseTime(overview.responseTime.avgMinutes)}</span>
            </div>
            {overview.velocity?.avgDays !== null && (
              <>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80">Najbrže zatvoreno</span>
                  <span className="font-semibold">{overview.velocity.fastestDays} dana</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/80">Najsporije</span>
                  <span className="font-semibold">{overview.velocity.slowestDays} dana</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Source Channel Performance */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
        <h3 className="font-semibold text-[#1E293B] mb-4">Performanse po kanalu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {sourceAnalytics.map((source) => (
            <SourceCard key={source.source} source={source} />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <h3 className="font-semibold text-[#1E293B] mb-4">Upiti kroz vreme</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={leadsOverTime}>
              <defs>
                <linearGradient id="colorUpiti" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="upiti"
                name="Novi upiti"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorUpiti)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="dobijeno"
                name="Dobijeno"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Over Time */}
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <h3 className="font-semibold text-[#1E293B] mb-4">Prihod kroz vreme</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number), 'Prihod']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="prihod" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
        <h3 className="font-semibold text-[#1E293B] mb-4">Pipeline faze</h3>
        <div className="flex items-center justify-between">
          {pipelineFunnel.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1">
              <div
                className="flex flex-col items-center justify-center flex-1 p-4 rounded-xl"
                style={{ backgroundColor: `${stage.color}15` }}
              >
                <div
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium text-[#1E293B] text-center">{stage.name}</span>
                <span className="text-2xl font-bold text-[#1E293B]">{stage.count}</span>
                <span className="text-xs text-[#64748B]">{formatCurrency(stage.value)}</span>
              </div>
              {index < pipelineFunnel.length - 1 && (
                <ChevronRight className="h-5 w-5 text-[#CBD5E1] mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
          {/* Won/Lost */}
          <ChevronRight className="h-5 w-5 text-[#CBD5E1] mx-2 flex-shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700">Dobijeno</p>
                <p className="text-lg font-bold text-emerald-700">{overview.wonLeads}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Izgubljeno</p>
                <p className="text-lg font-bold text-red-700">{overview.lostLeads}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Destinations + Packages + Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Destinations */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-[#1E293B]">Top destinacije</h3>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {topDestinations.length > 0 ? (
              topDestinations.slice(0, 5).map((dest, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[#94A3B8] w-4">{i + 1}.</span>
                    <span className="text-sm font-medium text-[#1E293B]">{dest.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#64748B]">{dest.leads} upita</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(dest.revenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-[#64748B]">Nema podataka</div>
            )}
          </div>
        </div>

        {/* Package Performance */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg">
              <Package className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-[#1E293B]">Paketi</h3>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {packagePerformance.length > 0 ? (
              packagePerformance.slice(0, 5).map((pkg, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1E293B] truncate">{pkg.name}</p>
                    <p className="text-xs text-[#64748B]">{pkg.inquiries} upita</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      pkg.conversionRate >= 30 ? 'bg-emerald-50 text-emerald-700' :
                      pkg.conversionRate >= 15 ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {pkg.conversionRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-[#64748B]">Nema paketa</div>
            )}
          </div>
        </div>

        {/* Source Distribution Pie */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-5">
          <h3 className="font-semibold text-[#1E293B] mb-4">Distribucija izvora</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sourceAnalytics.filter(s => s.total > 0) as unknown as Array<{[key: string]: unknown}>}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
                nameKey="label"
              >
                {sourceAnalytics.filter(s => s.total > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value as number, name as string]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {sourceAnalytics.filter(s => s.total > 0).map(s => (
              <div key={s.source} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[#64748B]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 rounded-xl">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1E293B]">Performanse agenata</h3>
            <p className="text-sm text-[#64748B]">Pregled uspešnosti po članu tima</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Agent
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Upiti
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Dobijeno
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Izgubljeno
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Konverzija
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Prihod
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Avg. odgovor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {agentPerformance.length > 0 ? (
                agentPerformance.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xs font-semibold text-white">
                          {agent.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1E293B]">{agent.name}</p>
                          <p className="text-xs text-[#94A3B8]">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-[#1E293B]">{agent.leads}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {agent.won}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        {agent.lost}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-sm font-semibold ${
                        agent.conversionRate >= 30 ? 'text-emerald-600' :
                        agent.conversionRate >= 15 ? 'text-amber-600' :
                        'text-[#64748B]'
                      }`}>
                        {agent.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(agent.revenue)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {agent.avgResponseMinutes !== null ? (
                        <span className={`text-sm font-medium ${
                          agent.avgResponseMinutes <= 60 ? 'text-emerald-600' :
                          agent.avgResponseMinutes <= 240 ? 'text-amber-600' :
                          'text-red-500'
                        }`}>
                          {formatResponseTime(agent.avgResponseMinutes)}
                        </span>
                      ) : (
                        <span className="text-sm text-[#94A3B8]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#64748B]">
                    Nema agenata u timu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// COMPONENTS

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = 'text-[#1E293B]',
  change = null
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  valueColor?: string
  change?: number | null
}) {
  return (
    <div className="rounded-[14px] bg-white p-4 border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#64748B] truncate">{label}</p>
          <div className="flex items-center gap-2">
            <p className={`text-xl font-bold ${valueColor} truncate`}>{value}</p>
            {change !== null && change !== undefined && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                change > 0 ? 'bg-emerald-50 text-emerald-600' :
                change < 0 ? 'bg-red-50 text-red-500' :
                'bg-slate-50 text-slate-500'
              }`}>
                {change > 0 ? '+' : ''}{change.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResponseBar({
  label,
  count,
  total,
  color
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#64748B] w-20">{label}</span>
      <div className="flex-1 h-6 bg-[#F1F5F9] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-[#1E293B] w-16 text-right">
        {count} ({percentage.toFixed(0)}%)
      </span>
    </div>
  )
}

function SourceCard({ source }: { source: SourceAnalytics }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${source.color}15`, color: source.color }}
        >
          {SOURCE_ICONS[source.source]}
        </div>
        <span className="font-semibold text-[#1E293B]">{source.label}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#64748B]">Upiti</span>
          <span className="text-sm font-semibold text-[#1E293B]">{source.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#64748B]">Konverzija</span>
          <span className={`text-sm font-semibold ${
            source.conversionRate >= 30 ? 'text-emerald-600' :
            source.conversionRate >= 15 ? 'text-amber-600' :
            'text-[#64748B]'
          }`}>
            {source.conversionRate.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#64748B]">Prihod</span>
          <span className="text-sm font-semibold text-emerald-600">€{source.revenue.toLocaleString()}</span>
        </div>
        {/* Mini progress for won/lost/active */}
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-[#F1F5F9] mt-2">
          {source.won > 0 && (
            <div
              className="bg-emerald-500"
              style={{ width: `${(source.won / source.total) * 100}%` }}
              title={`Dobijeno: ${source.won}`}
            />
          )}
          {source.active > 0 && (
            <div
              className="bg-blue-400"
              style={{ width: `${(source.active / source.total) * 100}%` }}
              title={`Aktivno: ${source.active}`}
            />
          )}
          {source.lost > 0 && (
            <div
              className="bg-red-400"
              style={{ width: `${(source.lost / source.total) * 100}%` }}
              title={`Izgubljeno: ${source.lost}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
