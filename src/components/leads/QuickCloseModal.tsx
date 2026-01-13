'use client'

import { useState, useEffect } from 'react'
import { X, Search, MapPin, Calendar, Check, Euro, Users, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'
import type { Lead, Offer } from '@/types'
import { useOffers } from '@/hooks/use-offers'
import { useBookings, type CreateBookingData } from '@/hooks/use-bookings'

interface QuickCloseModalProps {
  lead: Lead
  onClose: () => void
  onSuccess: () => void
}

export default function QuickCloseModal({ lead, onClose, onSuccess }: QuickCloseModalProps) {
  const { getOffers, loading: loadingOffers } = useOffers()
  const { createBooking, loading: savingBooking } = useBookings()
  
  const [step, setStep] = useState<'select' | 'details' | 'external'>('select')
  const [offers, setOffers] = useState<Offer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  
  const [bookingData, setBookingData] = useState<Partial<CreateBookingData>>({
    customer_name: lead.name,
    customer_phone: lead.phone || '',
    customer_email: lead.email || '',
    adults: lead.guests || 2,
    children: 0,
    total_amount: 0,
    amount_paid: 0,
  })

  const [externalData, setExternalData] = useState({
    destination: lead.destination || '',
    accommodation: '',
    dates: lead.travel_date || '',
    value: lead.value || 0,
  })

  useEffect(() => {
    loadOffers()
  }, [])

  const loadOffers = async () => {
    const data = await getOffers({ status: 'active' })
    setOffers(data)
  }

  const filteredOffers = offers.filter((offer) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      offer.name.toLowerCase().includes(query) ||
      offer.country.toLowerCase().includes(query) ||
      offer.city?.toLowerCase().includes(query)
    )
  })

  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer)
    const totalGuests = (bookingData.adults || 2) + (bookingData.children || 0)
    setBookingData({
      ...bookingData,
      total_amount: offer.price_per_person * totalGuests,
    })
    setStep('details')
  }

  const handleGuestChange = (adults: number, children: number) => {
    setBookingData(prev => {
      const total = adults + children
      return {
        ...prev,
        adults,
        children,
        total_amount: selectedOffer ? selectedOffer.price_per_person * total : prev.total_amount,
      }
    })
  }

  const handleSave = async () => {
    let data: CreateBookingData

    if (step === 'external') {
      data = {
        ...bookingData as CreateBookingData,
        lead_id: lead.id,
        is_external: true,
        external_destination: externalData.destination,
        external_accommodation: externalData.accommodation,
        external_dates: externalData.dates,
        external_value: externalData.value,
        total_amount: externalData.value,
      }
    } else {
      data = {
        ...bookingData as CreateBookingData,
        lead_id: lead.id,
        offer_id: selectedOffer?.id,
        travel_date: selectedOffer?.departure_date,
        return_date: selectedOffer?.return_date,
      }
    }

    const result = await createBooking(data)
    if (result) {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[14px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1E293B]">Zatvori upit</h2>
            <p className="text-sm text-[#64748B]">{lead.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="h-5 w-5 text-[#64748B]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pretraži ponude..."
                  className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                />
              </div>

              {/* External booking option */}
              <button
                onClick={() => setStep('external')}
                className="w-full flex items-center gap-3 p-4 rounded-[10px] border-2 border-dashed border-[#E2E8F0] hover:border-[#3B82F6] hover:bg-[#F8FAFC] transition-colors mb-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]">
                  <Plus className="h-5 w-5 text-[#64748B]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1E293B]">Eksterno zatvaranje</p>
                  <p className="text-xs text-[#64748B]">Ponuda izvan sistema (ručni unos)</p>
                </div>
              </button>

              {/* Offers list */}
              {loadingOffers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#64748B]">
                  Nema dostupnih ponuda
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOffers.map((offer) => (
                    <button
                      key={offer.id}
                      onClick={() => handleSelectOffer(offer)}
                      className="w-full flex items-center gap-4 p-4 rounded-[10px] border border-[#E2E8F0] hover:border-[#3B82F6] hover:bg-[#F8FAFC] transition-colors text-left"
                    >
                      <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1E293B] truncate">{offer.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {offer.country}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(offer.departure_date), 'd MMM', { locale: sr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {offer.available_spots} mesta
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1E293B]">
                          {offer.price_per_person} {offer.currency}
                        </p>
                        <p className="text-xs text-[#64748B]">po osobi</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'details' && selectedOffer && (
            <div className="space-y-6">
              {/* Selected offer summary */}
              <div className="rounded-[10px] bg-[#F8FAFC] p-4">
                <p className="text-sm font-medium text-[#1E293B]">{selectedOffer.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                  <span>{selectedOffer.country}</span>
                  <span>{format(new Date(selectedOffer.departure_date), 'd MMM', { locale: sr })} - {format(new Date(selectedOffer.return_date), 'd MMM', { locale: sr })}</span>
                </div>
              </div>

              {/* Guest count */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Broj putnika</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#64748B]">Odrasli</label>
                    <input
                      type="number"
                      value={bookingData.adults}
                      onChange={(e) => handleGuestChange(parseInt(e.target.value) || 1, bookingData.children || 0)}
                      min={1}
                      className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Deca</label>
                    <input
                      type="number"
                      value={bookingData.children}
                      onChange={(e) => handleGuestChange(bookingData.adults || 1, parseInt(e.target.value) || 0)}
                      min={0}
                      className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Plaćanje</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#64748B]">Ukupno</label>
                    <div className="relative mt-1">
                      <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="number"
                        value={bookingData.total_amount}
                        onChange={(e) => setBookingData({ ...bookingData, total_amount: parseInt(e.target.value) || 0 })}
                        className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748B]">Uplaćeno</label>
                    <div className="relative mt-1">
                      <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <input
                        type="number"
                        value={bookingData.amount_paid}
                        onChange={(e) => setBookingData({ ...bookingData, amount_paid: parseInt(e.target.value) || 0 })}
                        min={0}
                        className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">Način plaćanja</label>
                <select
                  value={bookingData.payment_method || ''}
                  onChange={(e) => setBookingData({ ...bookingData, payment_method: e.target.value as any })}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm bg-white"
                >
                  <option value="">Izaberi...</option>
                  <option value="cash">Gotovina</option>
                  <option value="card">Kartica</option>
                  <option value="bank">Banka</option>
                  <option value="mixed">Kombinovano</option>
                </select>
              </div>
            </div>
          )}

          {step === 'external' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Destinacija *
                </label>
                <input
                  type="text"
                  value={externalData.destination}
                  onChange={(e) => setExternalData({ ...externalData, destination: e.target.value })}
                  placeholder="npr. Turska, Antalija"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Smeštaj
                </label>
                <input
                  type="text"
                  value={externalData.accommodation}
                  onChange={(e) => setExternalData({ ...externalData, accommodation: e.target.value })}
                  placeholder="npr. Hotel Sunce 4*"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Datumi
                </label>
                <input
                  type="text"
                  value={externalData.dates}
                  onChange={(e) => setExternalData({ ...externalData, dates: e.target.value })}
                  placeholder="npr. 15-22. jul 2024"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Vrednost (EUR) *
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="number"
                    value={externalData.value}
                    onChange={(e) => setExternalData({ ...externalData, value: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4">
          {step !== 'select' ? (
            <button
              onClick={() => setStep('select')}
              className="text-sm text-[#64748B] hover:text-[#1E293B]"
            >
              Nazad
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            >
              Otkaži
            </button>
            {(step === 'details' || step === 'external') && (
              <button
                onClick={handleSave}
                disabled={savingBooking}
                className="flex items-center gap-2 rounded-[10px] bg-[#10B981] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#059669] disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                {savingBooking ? 'Čuvanje...' : 'Zatvori upit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
