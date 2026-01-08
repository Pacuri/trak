'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Users, DollarSign, Percent, AlertCircle, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { useLeads } from '@/hooks/use-leads'
import { useOrganization } from '@/hooks/use-organization'
import { getStageBadgeColor } from '@/lib/utils'
import type { Lead } from '@/types'
import Link from 'next/link'

interface StatCardProps {
  title: string
  value: string
  icon: React.ReactNode
  iconBg: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({ title, value, icon, iconBg, trend }: StatCardProps) {
  return (
    <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center h-11 w-11 rounded-full" style={{ backgroundColor: iconBg }}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend.isPositive ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-red-50 text-red-600'
          }`}>
            {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1E293B] mb-1">{value}</p>
        <p className="text-sm text-[#64748B]">{title}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const { getLeads } = useLeads()
  const { stages } = useOrganization()
  const [todaysLeads, setTodaysLeads] = useState(0)
  const [thisWeekLeads, setThisWeekLeads] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [pipelineValue, setPipelineValue] = useState(0)
  const [needsAttention, setNeedsAttention] = useState<Lead[]>([])
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStats() {
      if (!user?.organization_id) return

      setLoading(true)

      try {
        // Get all leads for the organization
        const allLeads = await getLeads()

        // Calculate today's date boundaries
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)

        // Calculate this week's date boundaries
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        weekStart.setHours(0, 0, 0, 0)

        // Filter leads
        const todayLeads = allLeads.filter((lead) => {
          const created = new Date(lead.created_at)
          return created >= today && created <= todayEnd
        })

        const weekLeads = allLeads.filter((lead) => {
          const created = new Date(lead.created_at)
          return created >= weekStart
        })

        // Calculate conversion rate (won / total with stages)
        const wonStages = stages.filter((s) => s.is_won).map((s) => s.id)
        const totalWithStages = allLeads.filter((lead) => lead.stage_id)
        const wonLeads = totalWithStages.filter((lead) =>
          wonStages.includes(lead.stage_id || '')
        )
        const conversion =
          totalWithStages.length > 0 ? (wonLeads.length / totalWithStages.length) * 100 : 0

        // Calculate pipeline value (sum of all lead values)
        const totalValue = allLeads.reduce((sum, lead) => sum + (lead.value || 0), 0)

        // Find leads needing attention (no activity for 3+ days)
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const attentionLeads = allLeads.filter((lead) => {
          if (!lead.last_contact_at) {
            const created = new Date(lead.created_at)
            return created < threeDaysAgo
          }
          const lastContact = new Date(lead.last_contact_at)
          return lastContact < threeDaysAgo
        })

        // Get recent leads (last 5, ordered by created_at)
        const recent = allLeads.slice(0, 5)

        setTodaysLeads(todayLeads.length)
        setThisWeekLeads(weekLeads.length)
        setConversionRate(conversion)
        setPipelineValue(totalValue)
        setNeedsAttention(attentionLeads.slice(0, 5))
        setRecentLeads(recent)
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [user, getLeads, stages])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">
          Welcome back{user?.full_name ? `, ${user.full_name}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Here's what's happening with your leads today.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Leads"
            value={todaysLeads.toString()}
            icon={<Users className="h-5 w-5" />}
            iconBg="#3B82F6"
          />
          <StatCard
            title="This Week"
            value={thisWeekLeads.toString()}
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg="#8B5CF6"
          />
          <StatCard
            title="Conversion Rate"
            value={`${conversionRate.toFixed(1)}%`}
            icon={<Percent className="h-5 w-5" />}
            iconBg="#10B981"
          />
          <StatCard
            title="Pipeline Value"
            value={`$${pipelineValue.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
            iconBg="#F97316"
          />
        </div>
      )}

      {/* Needs Attention Section */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1E293B]">Needs Attention</h2>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        ) : needsAttention.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-[#94A3B8]" />
            <p className="mt-4 text-sm text-[#64748B]">No items need attention right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {needsAttention.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-[10px] border border-[#E2E8F0] hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
                  <div>
                    <p className="text-sm font-medium text-[#1E293B]">{lead.name}</p>
                    <p className="text-xs text-[#64748B]">
                      Last contact: {lead.last_contact_at ? formatDate(lead.last_contact_at) : formatDate(lead.created_at)}
                    </p>
                  </div>
                </div>
                {lead.stage && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStageBadgeColor(lead.stage.name)}`}>
                    {lead.stage.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Leads Section */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1E293B]">Recent Leads</h2>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
        ) : recentLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-[#94A3B8]" />
            <p className="mt-4 text-sm text-[#64748B]">No recent leads to display.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-[10px] border border-[#E2E8F0] hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">{lead.name}</p>
                  <p className="text-xs text-[#64748B]">{formatDate(lead.created_at)}</p>
                </div>
                {lead.stage && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStageBadgeColor(lead.stage.name)}`}>
                    {lead.stage.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
