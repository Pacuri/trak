'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import OfferForm from '@/components/offers/OfferForm'
import { useOffers } from '@/hooks/use-offers'

export default function NewOfferPage() {
  const { createOffer, loading } = useOffers()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/offers"
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#64748B]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Nova ponuda</h1>
          <p className="text-sm text-[#64748B] mt-1">Kreirajte novu ponudu za vaše klijente</p>
        </div>
      </div>

      {/* Form */}
      <OfferForm onSubmit={createOffer} loading={loading} />
    </div>
  )
}
