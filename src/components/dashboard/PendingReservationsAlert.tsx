'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'

interface PendingReservation {
  id: string
  code: string
  customer_name: string
  total_price: number
  deposit_amount: number
  currency: string
  expires_at: string
  created_at: string
  qualification_data?: {
    package_name?: string
  }
}

function formatTimeRemaining(expiresAt: string): { text: string; urgent: boolean } {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { text: 'Isteklo', urgent: true }
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours < 24) {
    return { text: `${hours}h ${minutes}m`, urgent: true }
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return { text: `${days}d ${remainingHours}h`, urgent: days < 2 }
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency
  return `${amount.toFixed(0)} ${symbol}`
}

function ReservationItem({ reservation }: { reservation: PendingReservation }) {
  const timeRemaining = formatTimeRemaining(reservation.expires_at)
  const packageName = reservation.qualification_data?.package_name || 'Paket'

  return (
    <Link
      href={`/dashboard/reservations`}
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">
            {reservation.customer_name}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {reservation.code}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {packageName} · {formatCurrency(reservation.deposit_amount, reservation.currency)} depozit
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <span className={`text-xs font-semibold whitespace-nowrap ${
          timeRemaining.urgent ? 'text-amber-600' : 'text-slate-500'
        }`}>
          {timeRemaining.urgent && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {timeRemaining.text}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse py-2.5 px-3">
          <div className="flex items-center gap-2">
            <div className="w-32 h-4 bg-slate-200 rounded" />
            <div className="w-20 h-3 bg-slate-100 rounded" />
          </div>
          <div className="w-48 h-3 bg-slate-100 rounded mt-1.5" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">Nema rezervacija na cekanju</p>
      <p className="text-xs text-slate-500 mt-1">Sve rezervacije su obradene</p>
    </div>
  )
}

export function PendingReservationsAlert() {
  const [reservations, setReservations] = useState<PendingReservation[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useUser()
  const supabase = createClient()

  useEffect(() => {
    async function fetchPendingReservations() {
      if (!user?.organization_id) return

      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('id, code, customer_name, total_price, deposit_amount, currency, expires_at, created_at, qualification_data')
          .eq('organization_id', user.organization_id)
          .eq('status', 'pending')
          .order('expires_at', { ascending: true })
          .limit(5)

        if (error) {
          console.error('Error fetching pending reservations:', error)
          return
        }

        setReservations(data || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingReservations()

    // Refresh every minute to update countdown timers
    const interval = setInterval(fetchPendingReservations, 60000)
    return () => clearInterval(interval)
  }, [user?.organization_id, supabase])

  // Don't render if no pending reservations and not loading
  if (!loading && reservations.length === 0) {
    return null
  }

  const urgentCount = reservations.filter(r => {
    const { urgent } = formatTimeRemaining(r.expires_at)
    return urgent
  }).length

  return (
    <div className="bg-white rounded-[14px] border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Rezervacije cekaju uplatu</h3>
            <p className="text-xs text-slate-500">
              {reservations.length} rezervacija · {urgentCount > 0 && (
                <span className="text-amber-600 font-medium">{urgentCount} hitno</span>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/reservations?status=pending"
          className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          Vidi sve
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-2 py-2">
        {loading ? (
          <LoadingSkeleton />
        ) : reservations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-slate-100">
            {reservations.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PendingReservationsAlert
