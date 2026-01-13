'use client'

import { useEffect, useState } from 'react'
import { Search, MessageSquare, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { useInquiries, type InquiryFilters } from '@/hooks/use-inquiries'
import type { OfferInquiry, InquiryStatus } from '@/types'
import InquiryCard from '@/components/inquiries/InquiryCard'
import MarkAvailableDialog from '@/components/inquiries/MarkAvailableDialog'
import MarkUnavailableDialog from '@/components/inquiries/MarkUnavailableDialog'

export default function InquiriesPage() {
  const { getInquiries, markAsAvailable, markAsUnavailable, getStats, loading } = useInquiries()
  const [inquiries, setInquiries] = useState<OfferInquiry[]>([])
  const [filters, setFilters] = useState<InquiryFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'responded' | 'all'>('pending')
  const [stats, setStats] = useState({ pending: 0, checking: 0, responded: 0, total: 0 })
  
  const [showAvailableDialog, setShowAvailableDialog] = useState<string | null>(null)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    const [inquiriesData, statsData] = await Promise.all([
      getInquiries(filters),
      getStats(),
    ])
    setInquiries(inquiriesData)
    setStats(statsData)
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === 'pending') {
      setFilters({ ...filters, status: 'pending' })
    } else if (tab === 'responded') {
      setFilters({ ...filters, status: undefined })
    } else {
      setFilters({ ...filters, status: undefined })
    }
  }

  const handleMarkAvailable = async (note?: string) => {
    if (!showAvailableDialog) return
    setActionLoading(true)
    const success = await markAsAvailable(showAvailableDialog, note)
    setActionLoading(false)
    if (success) {
      setShowAvailableDialog(null)
      loadData()
    }
  }

  const handleMarkUnavailable = async (note?: string) => {
    if (!showUnavailableDialog) return
    setActionLoading(true)
    const success = await markAsUnavailable(showUnavailableDialog, note)
    setActionLoading(false)
    if (success) {
      setShowUnavailableDialog(null)
      loadData()
    }
  }

  // Filter inquiries based on tab and search
  const filteredInquiries = inquiries.filter((inq) => {
    // Tab filter
    if (activeTab === 'pending' && inq.status !== 'pending' && inq.status !== 'checking') {
      return false
    }
    if (activeTab === 'responded' && !['available', 'unavailable', 'alternative'].includes(inq.status)) {
      return false
    }

    // Search filter
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      inq.customer_name.toLowerCase().includes(query) ||
      inq.customer_phone.toLowerCase().includes(query) ||
      inq.offer?.name.toLowerCase().includes(query)
    )
  })

  const urgentCount = inquiries.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Upiti za ponude</h1>
        <p className="text-sm text-[#64748B] mt-1">Odgovorite na upite klijenata za ponude na upit</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-[14px] p-5 border shadow-sm ${
          urgentCount > 0 ? 'bg-[#FEF2F2] border-[#EF4444]/20' : 'bg-white border-[#E2E8F0]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Cekaju odgovor</p>
              <p className={`text-2xl font-bold mt-1 ${urgentCount > 0 ? 'text-[#EF4444]' : 'text-[#1E293B]'}`}>
                {stats.pending}
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              urgentCount > 0 ? 'bg-[#EF4444]/10' : 'bg-[#FFF7ED]'
            }`}>
              <Clock className={`h-6 w-6 ${urgentCount > 0 ? 'text-[#EF4444]' : 'text-[#F97316]'}`} />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Proverava se</p>
              <p className="text-2xl font-bold text-[#3B82F6] mt-1">{stats.checking}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
              <MessageSquare className="h-6 w-6 text-[#3B82F6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Odgovoreno</p>
              <p className="text-2xl font-bold text-[#10B981] mt-1">{stats.responded}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <CheckCircle className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ukupno</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
              <MessageSquare className="h-6 w-6 text-[#64748B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        {[
          { key: 'pending' as const, label: 'Cekaju odgovor', count: stats.pending + stats.checking },
          { key: 'responded' as const, label: 'Odgovoreno', count: stats.responded },
          { key: 'all' as const, label: 'Sve', count: stats.total },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pretrazi po imenu, telefonu, ponudi..."
          className="block w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        />
      </div>

      {/* Inquiries Grid */}
      {loading && inquiries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <MessageSquare className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#64748B]">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema upita za prikaz.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onMarkAvailable={() => setShowAvailableDialog(inquiry.id)}
              onMarkUnavailable={() => setShowUnavailableDialog(inquiry.id)}
              onOfferAlternative={() => {
                // TODO: Implement alternative offer flow
                alert('Funkcionalnost u izradi')
              }}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showAvailableDialog && (
        <MarkAvailableDialog
          onConfirm={handleMarkAvailable}
          onCancel={() => setShowAvailableDialog(null)}
          loading={actionLoading}
        />
      )}

      {showUnavailableDialog && (
        <MarkUnavailableDialog
          onConfirm={handleMarkUnavailable}
          onCancel={() => setShowUnavailableDialog(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
