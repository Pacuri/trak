'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, MessageSquare, Clock, CheckCircle, Filter, ChevronDown, Package, Globe, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { OfferInquiry, CustomInquiry } from '@/types'
import InquiryCard from '@/components/inquiries/InquiryCard'
import CustomInquiryCard from '@/components/inquiries/CustomInquiryCard'
import MarkAvailableDialog from '@/components/inquiries/MarkAvailableDialog'
import MarkUnavailableDialog from '@/components/inquiries/MarkUnavailableDialog'
import RespondToInquiryDialog from '@/components/inquiries/RespondToInquiryDialog'

// Unified inquiry type for display
interface UnifiedInquiry {
  id: string
  type: 'offer' | 'custom'
  customer_name: string
  customer_phone: string
  customer_email: string | null
  created_at: string
  status: string
  is_archived?: boolean
  // For offer inquiries
  offer?: {
    id: string
    name: string
    country: string
    city: string | null
  }
  // For custom inquiries
  qualification_data?: any
  customer_note?: string | null
  source?: string | null
  // Original data
  originalOffer?: OfferInquiry
  originalCustom?: CustomInquiry
}

type TabType = 'pending' | 'responded' | 'all' | 'archived'
type SourceFilter = 'all' | 'offer' | 'custom'

export default function InquiriesPage() {
  const [offerInquiries, setOfferInquiries] = useState<OfferInquiry[]>([])
  const [customInquiries, setCustomInquiries] = useState<CustomInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)

  const [showAvailableDialog, setShowAvailableDialog] = useState<string | null>(null)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState<string | null>(null)
  const [showRespondDialog, setShowRespondDialog] = useState<CustomInquiry | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const { user, organizationId } = useUser()

  // Fetch all inquiries
  const fetchInquiries = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      const [offerResult, customResult] = await Promise.all([
        // Offer inquiries
        supabase
          .from('offer_inquiries')
          .select(`
            *,
            offer:offers(id, name, country, city)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),

        // Custom inquiries
        supabase
          .from('custom_inquiries')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
      ])

      setOfferInquiries(offerResult.data || [])
      setCustomInquiries(customResult.data || [])
    } catch (err) {
      console.error('Error fetching inquiries:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, organizationId])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  // Combine and unify inquiries
  const unifiedInquiries: UnifiedInquiry[] = useMemo(() => {
    const unified: UnifiedInquiry[] = []

    // Add offer inquiries
    offerInquiries.forEach((inq) => {
      unified.push({
        id: inq.id,
        type: 'offer',
        customer_name: inq.customer_name,
        customer_phone: inq.customer_phone,
        customer_email: inq.customer_email,
        created_at: inq.created_at,
        status: inq.status,
        is_archived: inq.is_archived,
        offer: inq.offer as any,
        originalOffer: inq,
      })
    })

    // Add custom inquiries
    customInquiries.forEach((inq) => {
      unified.push({
        id: inq.id,
        type: 'custom',
        customer_name: inq.customer_name,
        customer_phone: inq.customer_phone,
        customer_email: inq.customer_email,
        created_at: inq.created_at,
        status: inq.status,
        is_archived: inq.is_archived,
        qualification_data: inq.qualification_data,
        customer_note: inq.customer_note,
        source: inq.source as string | null,
        originalCustom: inq,
      })
    })

    // Sort by created_at descending
    return unified.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [offerInquiries, customInquiries])

  // Calculate stats (excluding archived)
  const stats = useMemo(() => {
    const activeOffer = offerInquiries.filter(i => !i.is_archived)
    const activeCustom = customInquiries.filter(i => !i.is_archived)

    const offerPending = activeOffer.filter(i => i.status === 'pending' || i.status === 'checking').length
    const offerResponded = activeOffer.filter(i => ['available', 'unavailable', 'alternative'].includes(i.status)).length

    const customPending = activeCustom.filter(i => i.status === 'new').length
    const customResponded = activeCustom.filter(i => ['contacted', 'converted', 'closed'].includes(i.status)).length

    const archivedCount = offerInquiries.filter(i => i.is_archived).length +
                          customInquiries.filter(i => i.is_archived).length

    return {
      pending: offerPending + customPending,
      responded: offerResponded + customResponded,
      total: activeOffer.length + activeCustom.length,
      offerCount: activeOffer.length,
      customCount: activeCustom.length,
      archived: archivedCount,
    }
  }, [offerInquiries, customInquiries])

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return unifiedInquiries.filter((inq) => {
      // Source filter
      if (sourceFilter === 'offer' && inq.type !== 'offer') return false
      if (sourceFilter === 'custom' && inq.type !== 'custom') return false

      // Tab filter - handle archived separately
      if (activeTab === 'archived') {
        // Show only archived items
        if (!inq.is_archived) return false
      } else {
        // For non-archived tabs, hide archived items
        if (inq.is_archived) return false

        if (activeTab === 'pending') {
          if (inq.type === 'offer' && inq.status !== 'pending' && inq.status !== 'checking') return false
          if (inq.type === 'custom' && inq.status !== 'new') return false
        }
        if (activeTab === 'responded') {
          if (inq.type === 'offer' && !['available', 'unavailable', 'alternative'].includes(inq.status)) return false
          if (inq.type === 'custom' && !['contacted', 'converted', 'closed'].includes(inq.status)) return false
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = inq.customer_name.toLowerCase().includes(query)
        const matchesPhone = inq.customer_phone.toLowerCase().includes(query)
        const matchesOffer = inq.offer?.name?.toLowerCase().includes(query)
        const matchesDestination = inq.qualification_data?.destination?.country?.toLowerCase().includes(query) ||
                                   inq.qualification_data?.destination?.city?.toLowerCase().includes(query)

        if (!matchesName && !matchesPhone && !matchesOffer && !matchesDestination) return false
      }

      return true
    })
  }, [unifiedInquiries, activeTab, sourceFilter, searchQuery])

  // Handle offer inquiry actions
  const handleMarkAvailable = async (note?: string) => {
    if (!showAvailableDialog || !user?.id) return
    setActionLoading(true)

    const { error } = await supabase
      .from('offer_inquiries')
      .update({
        status: 'available',
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        response_note: note || null,
      })
      .eq('id', showAvailableDialog)

    setActionLoading(false)
    if (!error) {
      setShowAvailableDialog(null)
      fetchInquiries()
    }
  }

  const handleMarkUnavailable = async (note?: string) => {
    if (!showUnavailableDialog || !user?.id) return
    setActionLoading(true)

    const { error } = await supabase
      .from('offer_inquiries')
      .update({
        status: 'unavailable',
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        response_note: note || null,
      })
      .eq('id', showUnavailableDialog)

    setActionLoading(false)
    if (!error) {
      setShowUnavailableDialog(null)
      fetchInquiries()
    }
  }

  // Handle custom inquiry response
  const handleRespondToInquiry = async (note: string, status: 'contacted' | 'converted' | 'closed') => {
    if (!showRespondDialog || !user?.id) return
    setActionLoading(true)

    const { error } = await supabase
      .from('custom_inquiries')
      .update({
        status: status,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        response_message: note || null,
      })
      .eq('id', showRespondDialog.id)

    setActionLoading(false)
    if (!error) {
      setShowRespondDialog(null)
      fetchInquiries()
    }
  }

  // Handle archive/unarchive for offer inquiries
  const handleArchiveOffer = async (id: string) => {
    const { error } = await supabase
      .from('offer_inquiries')
      .update({ is_archived: true })
      .eq('id', id)

    if (!error) fetchInquiries()
  }

  const handleUnarchiveOffer = async (id: string) => {
    const { error } = await supabase
      .from('offer_inquiries')
      .update({ is_archived: false })
      .eq('id', id)

    if (!error) fetchInquiries()
  }

  // Handle archive/unarchive for custom inquiries
  const handleArchiveCustom = async (id: string) => {
    const { error } = await supabase
      .from('custom_inquiries')
      .update({ is_archived: true })
      .eq('id', id)

    if (!error) fetchInquiries()
  }

  const handleUnarchiveCustom = async (id: string) => {
    const { error } = await supabase
      .from('custom_inquiries')
      .update({ is_archived: false })
      .eq('id', id)

    if (!error) fetchInquiries()
  }

  // Get counts for tabs based on source filter
  const getTabCounts = () => {
    let pending = 0
    let responded = 0
    let total = 0
    let archived = 0

    if (sourceFilter === 'all' || sourceFilter === 'offer') {
      const activeOffer = offerInquiries.filter(i => !i.is_archived)
      pending += activeOffer.filter(i => i.status === 'pending' || i.status === 'checking').length
      responded += activeOffer.filter(i => ['available', 'unavailable', 'alternative'].includes(i.status)).length
      total += activeOffer.length
      archived += offerInquiries.filter(i => i.is_archived).length
    }

    if (sourceFilter === 'all' || sourceFilter === 'custom') {
      const activeCustom = customInquiries.filter(i => !i.is_archived)
      pending += activeCustom.filter(i => i.status === 'new').length
      responded += activeCustom.filter(i => ['contacted', 'converted', 'closed'].includes(i.status)).length
      total += activeCustom.length
      archived += customInquiries.filter(i => i.is_archived).length
    }

    return { pending, responded, total, archived }
  }

  const tabCounts = getTabCounts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upiti</h1>
        <p className="text-sm text-slate-500 mt-1">Upravljajte upitima klijenata sa sajta i za ponude</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl p-5 border shadow-sm ${
          stats.pending > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Čekaju odgovor</p>
              <p className={`text-2xl font-bold mt-1 ${stats.pending > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {stats.pending}
              </p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              stats.pending > 0 ? 'bg-orange-100' : 'bg-slate-100'
            }`}>
              <Clock className={`h-6 w-6 ${stats.pending > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Odgovoreno</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.responded}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Upiti za ponude</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.offerCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Upiti sa sajta</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.customCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 w-full sm:w-auto overflow-x-auto">
          {[
            { key: 'pending' as const, label: 'Čekaju odgovor', count: tabCounts.pending },
            { key: 'responded' as const, label: 'Odgovoreno', count: tabCounts.responded },
            { key: 'all' as const, label: 'Sve', count: tabCounts.total },
            { key: 'archived' as const, label: 'Arhivirano', count: tabCounts.archived },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? tab.key === 'archived' ? 'text-slate-600 border-slate-600' : 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.key === 'archived' && <Archive className="w-3.5 h-3.5 inline mr-1.5" />}
              {tab.label}
              <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
                activeTab === tab.key
                  ? tab.key === 'archived' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Source Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSourceDropdown(!showSourceDropdown)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            {sourceFilter === 'all' && 'Svi izvori'}
            {sourceFilter === 'offer' && 'Upiti za ponude'}
            {sourceFilter === 'custom' && 'Upiti sa sajta'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showSourceDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSourceDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                {[
                  { key: 'all' as const, label: 'Svi izvori', icon: MessageSquare },
                  { key: 'offer' as const, label: 'Upiti za ponude', icon: Package },
                  { key: 'custom' as const, label: 'Upiti sa sajta', icon: Globe },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSourceFilter(option.key)
                      setShowSourceDropdown(false)
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                      sourceFilter === option.key ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pretraži po imenu, telefonu, destinaciji..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Inquiries Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center border border-slate-200 shadow-sm">
          <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {searchQuery ? 'Nema rezultata pretrage.' : 'Nema upita za prikaz.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            inquiry.type === 'offer' && inquiry.originalOffer ? (
              <InquiryCard
                key={`offer-${inquiry.id}`}
                inquiry={inquiry.originalOffer}
                onMarkAvailable={() => setShowAvailableDialog(inquiry.id)}
                onMarkUnavailable={() => setShowUnavailableDialog(inquiry.id)}
                onOfferAlternative={() => alert('Funkcionalnost u izradi')}
                onArchive={() => handleArchiveOffer(inquiry.id)}
                onUnarchive={() => handleUnarchiveOffer(inquiry.id)}
              />
            ) : inquiry.type === 'custom' && inquiry.originalCustom ? (
              <CustomInquiryCard
                key={`custom-${inquiry.id}`}
                inquiry={inquiry.originalCustom}
                onRespond={() => setShowRespondDialog(inquiry.originalCustom!)}
                onArchive={() => handleArchiveCustom(inquiry.id)}
                onUnarchive={() => handleUnarchiveCustom(inquiry.id)}
              />
            ) : null
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

      {showRespondDialog && (
        <RespondToInquiryDialog
          inquiry={showRespondDialog}
          onConfirm={handleRespondToInquiry}
          onCancel={() => setShowRespondDialog(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
