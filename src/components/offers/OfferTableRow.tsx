'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Users, Edit2, Archive, MoreHorizontal, Eye, Star } from 'lucide-react'
import type { Offer } from '@/types'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface OfferTableRowProps {
  offer: Offer
  onArchive?: (id: string) => void
  onCapacityUpdate?: (id: string, spots: number) => void
}

export default function OfferTableRow({ offer, onArchive, onCapacityUpdate }: OfferTableRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityValue, setCapacityValue] = useState(offer.available_spots)

  const getStatusBadge = () => {
    switch (offer.status) {
      case 'active':
        return (
          <span className="inline-flex items-center rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#10B981] border border-[#10B981]/20">
            Aktivna
          </span>
        )
      case 'sold_out':
        return (
          <span className="inline-flex items-center rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-medium text-[#EF4444] border border-[#EF4444]/20">
            Rasprodato
          </span>
        )
      case 'archived':
        return (
          <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-medium text-[#64748B] border border-[#64748B]/20">
            Arhivirana
          </span>
        )
    }
  }

  const getInventoryBadge = () => {
    if (offer.inventory_type === 'owned') {
      return (
        <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-medium text-[#3B82F6]">
          VLASTITA
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-medium text-[#F97316]">
        NA UPIT
      </span>
    )
  }

  const handleCapacitySave = () => {
    if (onCapacityUpdate) {
      onCapacityUpdate(offer.id, capacityValue)
    }
    setEditingCapacity(false)
  }

  const primaryImage = offer.images?.find(img => img.is_primary)?.url || offer.images?.[0]?.url

  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors">
      {/* Offer */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={offer.name}
              className="h-12 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-16 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/offers/${offer.id}`}
                className="text-sm font-medium text-[#1E293B] hover:text-[#3B82F6]"
              >
                {offer.name}
              </Link>
              {offer.is_recommended && (
                <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#64748B]">{offer.country}{offer.city ? `, ${offer.city}` : ''}</span>
              {getInventoryBadge()}
            </div>
          </div>
        </div>
      </td>

      {/* Dates */}
      <td className="hidden px-5 py-4 lg:table-cell">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-sm text-[#64748B]">
            {format(new Date(offer.departure_date), 'd MMM', { locale: sr })} - {format(new Date(offer.return_date), 'd MMM', { locale: sr })}
          </span>
        </div>
      </td>

      {/* Price */}
      <td className="px-5 py-4">
        <div>
          <span className="text-sm font-semibold text-[#1E293B]">
            {offer.price_per_person.toLocaleString()} {offer.currency}
          </span>
          {offer.original_price && offer.original_price > offer.price_per_person && (
            <span className="ml-2 text-xs text-[#94A3B8] line-through">
              {offer.original_price.toLocaleString()}
            </span>
          )}
          <p className="text-xs text-[#64748B]">po osobi</p>
        </div>
      </td>

      {/* Capacity */}
      <td className="px-5 py-4">
        {editingCapacity ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={capacityValue}
              onChange={(e) => setCapacityValue(parseInt(e.target.value) || 0)}
              className="w-16 rounded-lg border border-[#E2E8F0] px-2 py-1 text-sm text-center"
              min={0}
              max={offer.total_spots}
            />
            <button
              onClick={handleCapacitySave}
              className="text-xs text-[#3B82F6] hover:underline"
            >
              Sačuvaj
            </button>
            <button
              onClick={() => {
                setCapacityValue(offer.available_spots)
                setEditingCapacity(false)
              }}
              className="text-xs text-[#64748B] hover:underline"
            >
              Otkaži
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingCapacity(true)}
            className="flex items-center gap-1.5 group"
          >
            <Users className="h-3.5 w-3.5 text-[#94A3B8]" />
            <span className={`text-sm font-medium ${
              offer.available_spots <= 3 
                ? 'text-[#EF4444]' 
                : offer.available_spots <= 5 
                  ? 'text-[#F59E0B]' 
                  : 'text-[#1E293B]'
            }`}>
              {offer.available_spots}/{offer.total_spots}
            </span>
            <Edit2 className="h-3 w-3 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </td>

      {/* Views */}
      <td className="hidden px-5 py-4 md:table-cell">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-[#94A3B8]" />
          <span className="text-sm text-[#64748B]">{offer.views_total}</span>
          {offer.views_last_24h > 0 && (
            <span className="text-xs text-[#10B981]">+{offer.views_last_24h}</span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        {getStatusBadge()}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <MoreHorizontal className="h-4 w-4 text-[#64748B]" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 z-20">
                <Link
                  href={`/dashboard/offers/${offer.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9]"
                  onClick={() => setShowMenu(false)}
                >
                  <Edit2 className="h-4 w-4" />
                  Izmeni
                </Link>
                {offer.status !== 'archived' && (
                  <button
                    onClick={() => {
                      if (onArchive) onArchive(offer.id)
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    <Archive className="h-4 w-4" />
                    Arhiviraj
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
