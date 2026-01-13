'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import OfferForm from '@/components/offers/OfferForm'
import { useOffers } from '@/hooks/use-offers'
import type { Offer } from '@/types'

export default function EditOfferPage() {
  const params = useParams()
  const router = useRouter()
  const { getOffer, updateOffer, loading } = useOffers()
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loadingOffer, setLoadingOffer] = useState(true)

  useEffect(() => {
    loadOffer()
  }, [params.id])

  const loadOffer = async () => {
    setLoadingOffer(true)
    const data = await getOffer(params.id as string)
    setOffer(data)
    setLoadingOffer(false)
  }

  const handleUpdate = async (data: any) => {
    return await updateOffer(params.id as string, data)
  }

  if (loadingOffer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-[#64748B] mb-4">Ponuda nije pronađena</p>
        <Link
          href="/dashboard/offers"
          className="text-[#3B82F6] hover:underline"
        >
          Nazad na listu ponuda
        </Link>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold text-[#1E293B]">Izmena ponude</h1>
          <p className="text-sm text-[#64748B] mt-1">{offer.name}</p>
        </div>
      </div>

      {/* Form */}
      <OfferForm offer={offer} onSubmit={handleUpdate} loading={loading} />
    </div>
  )
}
