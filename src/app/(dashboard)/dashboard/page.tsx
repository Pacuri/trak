'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useUser } from '@/hooks/use-user'
import { useChat } from '@/contexts/ChatContext'
import { InquiriesWaiting } from '@/components/dashboard/InquiriesWaiting'
import { NewEmails } from '@/components/dashboard/NewEmails'
import { AttentionRequired } from '@/components/dashboard/AttentionRequired'
import { TodaysDepartures } from '@/components/dashboard/TodaysDepartures'
import { CapacityOverview } from '@/components/dashboard/CapacityOverview'
import { InquirySlideOver } from '@/components/dashboard/InquirySlideOver'
import { InboxWidget } from '@/components/dashboard/InboxWidget'
import type { PendingInquiry } from '@/types/dashboard'

// Format current date in Serbian
function formatDate(date: Date): string {
  const days = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota']
  const months = [
    'januar', 'februar', 'mart', 'april', 'maj', 'jun',
    'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'
  ]
  
  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  
  return `${dayName}, ${day}. ${month} ${year}.`
}

export default function DashboardPage() {
  const { user } = useUser()
  const dashboardData = useDashboardData()
  const { openChat } = useChat()
  const [selectedInquiry, setSelectedInquiry] = useState<PendingInquiry | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await dashboardData.refresh()
    setIsRefreshing(false)
  }

  const handleInquiryClick = (inquiry: PendingInquiry) => {
    setSelectedInquiry(inquiry)
  }

  const handleInquiryClose = () => {
    setSelectedInquiry(null)
  }

  const handleInquiryResponded = () => {
    setSelectedInquiry(null)
    dashboardData.refresh()
  }

  // Handler for when email is accepted - opens the chat with the new lead
  const handleEmailAccepted = async (leadId?: string) => {
    dashboardData.refresh()
    // If leadId is provided, open the chat immediately via global context
    if (leadId) {
      openChat(leadId)
    }
  }

  // Get first name for greeting
  const firstName = user?.full_name?.split(' ')[0] || 'Korisnik'
  const currentDate = formatDate(new Date())

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dobrodošli, {firstName}! 👋
            </h1>
            <p className="text-slate-500 mt-1">
              Evo šta vas čeka danas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">
              📅 {currentDate}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Osveži</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid - 4 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:min-h-[520px]">
          {/* Column 1: Čeka odgovor (Inbox) */}
          <InboxWidget onOpenChat={openChat} />

          {/* Column 2: Upiti čekaju */}
          <InquiriesWaiting
            inquiries={dashboardData.pending_inquiries}
            loading={dashboardData.loading}
            onInquiryClick={handleInquiryClick}
          />

          {/* Column 3: Zahteva pažnju */}
          <AttentionRequired
            sections={dashboardData.attention}
            loading={dashboardData.loading}
            onInquiryClick={(id) => {
              const inquiry = dashboardData.pending_inquiries.find(i => i.id === id)
              if (inquiry) handleInquiryClick(inquiry)
            }}
          />

          {/* Column 4: Novi emailovi */}
          <NewEmails onEmailAccepted={handleEmailAccepted} />
        </div>

        {/* Bottom Section - 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Today's Departures */}
          <TodaysDepartures
            departures={dashboardData.departures_today}
            returns={dashboardData.returns_today}
            loading={dashboardData.loading}
          />

          {/* Capacity Overview */}
          <CapacityOverview
            packages={dashboardData.package_capacity}
            loading={dashboardData.loading}
          />
        </div>

        {/* Last updated */}
        {dashboardData.last_updated && (
          <div className="text-center text-xs text-slate-400 mt-8">
            Poslednje ažuriranje: {dashboardData.last_updated.toLocaleTimeString('sr-RS')}
          </div>
        )}
      </div>

      {/* Inquiry Slide Over */}
      <InquirySlideOver
        inquiry={selectedInquiry}
        isOpen={!!selectedInquiry}
        onClose={handleInquiryClose}
        onResponded={handleInquiryResponded}
      />
    </div>
  )
}
