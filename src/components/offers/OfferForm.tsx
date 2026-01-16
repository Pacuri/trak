'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Users, Euro, Star, Image as ImageIcon, Plus, X } from 'lucide-react'
import type { Offer, AccommodationType, BoardType, TransportType, InventoryType, OfferStatus } from '@/types'
import type { CreateOfferData } from '@/hooks/use-offers'

interface OfferFormProps {
  offer?: Offer
  onSubmit: (data: CreateOfferData, images?: { url: string; is_primary?: boolean }[]) => Promise<Offer | null>
  loading?: boolean
}

export default function OfferForm({ offer, onSubmit, loading }: OfferFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    description: offer?.description || '',
    star_rating: offer?.star_rating || undefined,
    country: offer?.country || '',
    city: offer?.city || '',
    departure_date: offer?.departure_date || '',
    return_date: offer?.return_date || '',
    price_per_person: offer?.price_per_person || 0,
    original_price: offer?.original_price || undefined,
    total_spots: offer?.total_spots || 10,
    available_spots: offer?.available_spots || undefined,
    accommodation_type: offer?.accommodation_type || 'hotel',
    board_type: offer?.board_type || 'half_board',
    transport_type: offer?.transport_type || 'bus',
    inventory_type: offer?.inventory_type || 'owned',
    is_recommended: offer?.is_recommended || false,
  })
  
  const [images, setImages] = useState<{ url: string; is_primary: boolean }[]>(
    offer?.images?.map(img => ({ url: img.url, is_primary: img.is_primary })) || []
  )
  const [newImageUrl, setNewImageUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await onSubmit(formData as CreateOfferData, images)
    if (result) {
      router.push('/dashboard/offers')
    }
  }

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, { url: newImageUrl.trim(), is_primary: images.length === 0 }])
      setNewImageUrl('')
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    // If we removed the primary, make the first one primary
    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true
    }
    setImages(newImages)
  }

  const setPrimaryImage = (index: number) => {
    setImages(images.map((img, i) => ({ ...img, is_primary: i === index })))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Osnovni podaci</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Naziv ponude *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="npr. Lux hotel Sunce - Turska all inclusive"
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Opišite ponudu..."
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Država *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                placeholder="npr. Turska"
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Grad
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="npr. Antalija"
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Broj zvezdica
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, star_rating: star })}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${
                      formData.star_rating && star <= formData.star_rating
                        ? 'text-[#F59E0B] fill-[#F59E0B]'
                        : 'text-[#E2E8F0]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Tip ponude
            </label>
            <select
              value={formData.inventory_type}
              onChange={(e) => setFormData({ ...formData, inventory_type: e.target.value as InventoryType })}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="owned">Fiksna (garantovana mesta)</option>
              <option value="inquiry">Na upit (provera raspoloživosti)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dates & Capacity */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Datumi i kapacitet</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Datum polaska *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                required
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Datum povratka *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Broj mesta *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="number"
                value={formData.total_spots}
                onChange={(e) => setFormData({ ...formData, total_spots: parseInt(e.target.value) || 0 })}
                required
                min={1}
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Cena</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Cena po osobi (EUR) *
            </label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="number"
                value={formData.price_per_person}
                onChange={(e) => setFormData({ ...formData, price_per_person: parseInt(e.target.value) || 0 })}
                required
                min={0}
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Stara cena (za prikaz popusta)
            </label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="number"
                value={formData.original_price || ''}
                onChange={(e) => setFormData({ ...formData, original_price: parseInt(e.target.value) || undefined })}
                min={0}
                placeholder="Opciono"
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Detalji</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Tip smeštaja
            </label>
            <select
              value={formData.accommodation_type}
              onChange={(e) => setFormData({ ...formData, accommodation_type: e.target.value as AccommodationType })}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="hotel">Hotel</option>
              <option value="apartment">Apartman</option>
              <option value="villa">Vila</option>
              <option value="any">Bilo koji</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Ishrana
            </label>
            <select
              value={formData.board_type}
              onChange={(e) => setFormData({ ...formData, board_type: e.target.value as BoardType })}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="all_inclusive">All inclusive</option>
              <option value="half_board">Polupansion</option>
              <option value="breakfast">Doručak</option>
              <option value="room_only">Samo smeštaj</option>
              <option value="any">Bilo koja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Prevoz
            </label>
            <select
              value={formData.transport_type}
              onChange={(e) => setFormData({ ...formData, transport_type: e.target.value as TransportType })}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="flight">Avion</option>
              <option value="bus">Autobus</option>
              <option value="own">Sopstveni prevoz</option>
              <option value="none">Bez prevoza</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_recommended}
              onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
              className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
            />
            <span className="text-sm text-[#1E293B]">Preporučena ponuda (prikazuje se na vrhu)</span>
          </label>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-[14px] bg-white p-6 border border-[#E2E8F0] shadow-sm">
        <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Slike</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Unesite URL slike..."
                className="block w-full rounded-[10px] border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
            <button
              type="button"
              onClick={addImage}
              className="rounded-[10px] bg-[#F1F5F9] px-4 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-[#E2E8F0] transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.url}
                    alt={`Slika ${index + 1}`}
                    className={`h-24 w-full rounded-lg object-cover ${
                      img.is_primary ? 'ring-2 ring-[#3B82F6]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.is_primary && (
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(index)}
                        className="p-1.5 bg-white rounded-full text-[#3B82F6] text-xs"
                        title="Postavi kao glavnu"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="p-1.5 bg-white rounded-full text-[#EF4444]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 bg-[#3B82F6] text-white text-[10px] px-1.5 py-0.5 rounded">
                      Glavna
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-[10px] border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
        >
          Otkaži
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors disabled:opacity-50"
        >
          {loading ? 'Čuvanje...' : offer ? 'Sačuvaj izmene' : 'Kreiraj ponudu'}
        </button>
      </div>
    </form>
  )
}
