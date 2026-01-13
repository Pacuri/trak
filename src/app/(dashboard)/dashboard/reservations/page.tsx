'use client'

import { useEffect, useState } from 'react'
import { Search, Calendar, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useReservations, type ReservationFilters } from '@/hooks/use-reservations'
import type { Reservation, ReservationStatus } from '@/types'
import ReservationCard from '@/components/reservations/ReservationCard'

export default function ReservationsPage() {
  const { getReservations, updateReservationStatus, recordPayment, getStats, loading } = useReservations()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filters, setFilters] = useState<ReservationFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ReservationStatus | 'all'>('all')
  const [stats, setStats] = useState({ pending: 0, paid: 0, expired: 0, total: 0 })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    const [reservationsData, statsData] = await Promise.all([
      getReservations(filters),
      getStats(),
    ])
    setReservations(reservationsData)
    setStats(statsData)
  }

  const handleTabChange = (tab: ReservationStatus | 'all') => {
    setActiveTab(tab)
    if (tab === 'all') {
      setFilters({ ...filters, status: undefined })
    } else {
      setFilters({ ...filters, status: tab })
    }
  }

  const handleMarkPaid = async (id: string) => {
    const success = await updateReservationStatus(id, 'paid')
    if (success) {
      loadData()
    }
  }

  const handleCancel = async (id: string) => {
    if (confirm('Da li ste sigurni da želite da otkažete ovu rezervaciju?')) {
      const success = await updateReservationStatus(id, 'cancelled')
      if (success) {
        loadData()
      }
    }
  }

  const handleRecordPayment = async (id: string, amount: number) => {
    const success = await recordPayment(id, amount)
    if (success) {
      loadData()
    }
  }

  // Filter by search
  const filteredReservations = reservations.filter((res) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      res.customer_name.toLowerCase().includes(query) ||
      res.customer_phone.toLowerCase().includes(query) ||
      res.customer_email?.toLowerCase().includes(query) ||
      res.code.toLowerCase().includes(query)
    )
  })

  const tabs = [
    { key: 'all' as const, label: 'Sve', count: stats.total, icon: Calendar },
    { key: 'pending' as const, label: 'Ceka uplatu', count: stats.pending, icon: Clock },
    { key: 'paid' as const, label: 'Placeno', count: stats.paid, icon: CheckCircle },
    { key: 'expired' as const, label: 'Isteklo', count: stats.expired, icon: XCircle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Rezervacije</h1>
        <p className="text-sm text-[#64748B] mt-1">Pregledajte i upravljajte rezervacijama</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ukupno</p>
              <p className="text-2xl font-bold text-[#1E293B] mt-1">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Calendar className="h-6 w-6 text-[#3B82F6]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Ceka uplatu</p>
              <p className="text-2xl font-bold text-[#F97316] mt-1">{stats.pending}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Clock className="h-6 w-6 text-[#F97316]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Placeno</p>
              <p className="text-2xl font-bold text-[#10B981] mt-1">{stats.paid}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5]">
              <CreditCard className="h-6 w-6 text-[#10B981]" />
            </div>
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748B]">Isteklo</p>
              <p className="text-2xl font-bold text-[#64748B] mt-1">{stats.expired}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
              <XCircle className="h-6 w-6 text-[#64748B]" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        {tabs.map((tab) => (
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
          placeholder="Pretrazi po imenu, telefonu, kodu..."
          className="block w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
        />
      </div>

      {/* Reservations Grid */}
      {loading && reservations.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <Calendar className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#64748B]">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema rezervacija za prikaz.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onMarkPaid={handleMarkPaid}
              onCancel={handleCancel}
              onRecordPayment={handleRecordPayment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
