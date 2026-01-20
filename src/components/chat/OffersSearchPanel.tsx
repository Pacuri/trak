'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, X, Package, MapPin, Calendar, Users, Loader2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface TravelPackage {
  id: string
  name: string
  destination: string
  country: string
  price_from: number | null
  duration_days: number | null
  departure_dates: string[]
  available_spots: number | null
  image_url: string | null
}

interface OffersSearchPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectOffer: (offer: TravelPackage, formatted: string) => void
  initialDestination?: string
  initialDates?: string
}

export function OffersSearchPanel({
  isOpen,
  onClose,
  onSelectOffer,
  initialDestination,
  initialDates,
}: OffersSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState(initialDestination || '')
  const [packages, setPackages] = useState<TravelPackage[]>([])
  const [loading, setLoading] = useState(false)
  const { organizationId } = useUser()
  const supabase = useMemo(() => createClient(), [])

  // Search packages
  const searchPackages = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      let query = supabase
        .from('travel_packages')
        .select(`
          id,
          name,
          destination,
          country,
          price_from,
          duration_days,
          departure_dates,
          available_spots,
          image_url
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(10)

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,destination.ilike.%${searchQuery}%,country.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setPackages(data || [])
    } catch (err) {
      console.error('Error searching packages:', err)
      setPackages([])
    } finally {
      setLoading(false)
    }
  }, [supabase, organizationId, searchQuery])

  // Initial load and search on query change
  useEffect(() => {
    if (isOpen) {
      const debounce = setTimeout(searchPackages, 300)
      return () => clearTimeout(debounce)
    }
  }, [isOpen, searchQuery, searchPackages])

  // Format offer for message insertion
  const formatOfferForMessage = (pkg: TravelPackage): string => {
    let message = `**${pkg.name}**\n`
    message += `📍 ${pkg.destination}, ${pkg.country}\n`

    if (pkg.duration_days) {
      message += `📅 ${pkg.duration_days} dana\n`
    }

    if (pkg.price_from) {
      message += `💰 od €${pkg.price_from.toLocaleString()}\n`
    }

    if (pkg.departure_dates && pkg.departure_dates.length > 0) {
      const upcomingDates = pkg.departure_dates
        .filter(d => new Date(d) >= new Date())
        .slice(0, 3)
        .map(d => format(new Date(d), 'd. MMM', { locale: sr }))
        .join(', ')

      if (upcomingDates) {
        message += `🗓️ Polasci: ${upcomingDates}\n`
      }
    }

    if (pkg.available_spots !== null && pkg.available_spots > 0) {
      message += `👥 Slobodnih mesta: ${pkg.available_spots}\n`
    }

    return message.trim()
  }

  const handleSelectOffer = (pkg: TravelPackage) => {
    onSelectOffer(pkg, formatOfferForMessage(pkg))
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Pronađi ponudu
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pretraži destinacije, pakete..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nema pronađenih ponuda</p>
              {searchQuery && (
                <p className="text-sm mt-1">Pokušajte sa drugim pojmom</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleSelectOffer(pkg)}
                  className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Image or placeholder */}
                    <div className="w-16 h-16 rounded-lg bg-slate-200 flex-shrink-0 overflow-hidden">
                      {pkg.image_url ? (
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {pkg.name}
                      </h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {pkg.destination}, {pkg.country}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        {pkg.duration_days && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {pkg.duration_days}d
                          </span>
                        )}
                        {pkg.price_from && (
                          <span className="font-medium text-slate-700">
                            od €{pkg.price_from.toLocaleString()}
                          </span>
                        )}
                        {pkg.available_spots !== null && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {pkg.available_spots} mesta
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Kliknite na ponudu da je dodate u poruku
          </p>
        </div>
      </div>
    </>
  )
}
