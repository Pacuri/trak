'use client'

import Link from 'next/link'
import { Phone, FileText, Plane, Euro, AlertTriangle } from 'lucide-react'
import type { DashboardStats } from '@/types/dashboard'

interface StatCardsProps {
  stats: DashboardStats
  loading?: boolean
}

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  sublabel?: string
  sublabelLink?: string
  trend?: number
  trendLabel?: string
  color: 'blue' | 'purple' | 'teal' | 'green' | 'orange'
  loading?: boolean
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
  },
}

function StatCard({ icon, value, label, sublabel, sublabelLink, trend, trendLabel, color, loading }: StatCardProps) {
  const colors = colorClasses[color]

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl ${colors.bg}`} />
        </div>
        <div className="mt-4">
          <div className="w-16 h-8 bg-slate-100 rounded" />
          <div className="w-20 h-4 bg-slate-100 rounded mt-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <div className={colors.icon}>{icon}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
        {sublabel && sublabelLink ? (
          <Link href={sublabelLink} className="text-xs text-emerald-600 hover:text-emerald-700 mt-0.5 inline-flex items-center gap-1">
            {sublabel} →
          </Link>
        ) : sublabel ? (
          <div className={`text-xs mt-0.5 ${trend && trend > 0 ? 'text-emerald-600' : trend && trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {trend && trend > 0 && '↑'}{trend && trend < 0 && '↓'}{sublabel}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function StatCards({ stats, loading }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Za poziv */}
      <StatCard
        icon={<Phone className="w-6 h-6" />}
        value={stats.leads_to_call}
        label="Za poziv"
        sublabel="čekaju >24h"
        color="blue"
        loading={loading}
      />

      {/* Upiti */}
      <StatCard
        icon={<FileText className="w-6 h-6" />}
        value={stats.pending_inquiries}
        label="Upiti čekaju"
        sublabel="čekaju odgovor"
        color="purple"
        loading={loading}
      />

      {/* Polazaka */}
      <StatCard
        icon={<Plane className="w-6 h-6" />}
        value={stats.departures_today}
        label="Polazaka"
        sublabel={stats.departures_passengers > 0 ? `${stats.departures_passengers} putnika` : 'danas'}
        color="teal"
        loading={loading}
      />

      {/* Ovog meseca */}
      <StatCard
        icon={<Euro className="w-6 h-6" />}
        value={`€${stats.revenue_this_month.toLocaleString()}`}
        label="Ovog meseca"
        sublabel={stats.revenue_trend !== 0 ? `${Math.abs(stats.revenue_trend)}%` : undefined}
        trend={stats.revenue_trend}
        color="green"
        loading={loading}
      />

      {/* Hitno */}
      <StatCard
        icon={<AlertTriangle className="w-6 h-6" />}
        value={stats.urgent_count}
        label="Hitno"
        sublabel={stats.urgent_count > 0 ? "Vidi sve" : "zahteva pažnju"}
        sublabelLink={stats.urgent_count > 0 ? "#attention" : undefined}
        color="orange"
        loading={loading}
      />
    </div>
  )
}

export default StatCards
