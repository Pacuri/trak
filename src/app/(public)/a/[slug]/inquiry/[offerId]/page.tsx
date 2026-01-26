'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Clock, MessageSquare, Calendar, Utensils, Users, BedDouble } from 'lucide-react'
import type { Offer, QualificationData } from '@/types'
import { useAgencySettings } from '@/hooks/use-agency-settings'
import { formatDateRange, getBoardLabel, getTransportLabel, formatStarRating, formatResponseTime } from '@/lib/formatting'

interface PackageData {
  id: string
  name: string
  hotel_name?: string
  hotel_stars?: number
  destination_city?: string
  destination_country: string
  default_duration?: number
  meal_plans?: string[]
  images: { id: string; url: string }[]
  room_types?: { id: string; name: string; max_persons?: number }[]
}

interface PriceData {
  price_per_person: number
  interval_name?: string
  price_type?: string
}

const MEAL_LABELS: Record<string, string> = {
  ND: 'Samo smeštaj',
  BB: 'Doručak',
  HB: 'Polupansion',
  FB: 'Pun pansion',
  AI: 'All Inclusive',
}

export default function InquiryPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const offerId = params.offerId as string

  // Check if this is a package inquiry (has date parameter from package page)
  const isPackageInquiry = searchParams.has('date')
  const selectedDate = searchParams.get('date') || ''
  const selectedRoomTypeId = searchParams.get('room_type_id') || ''
  const selectedMealPlan = searchParams.get('meal_plan') || 'AI'
  const urlAdults = searchParams.get('adults')
  const urlChildren = searchParams.get('children')
  const urlChildAges = searchParams.get('childAges')
  // Tracking ID from sent offer link
  const trackingId = searchParams.get('tid') || ''
  // Contact info from URL params (passed from promo flow via package page)
  const urlName = searchParams.get('name') || ''
  const urlEmail = searchParams.get('email') || ''
  const urlPhone = searchParams.get('phone') || ''

  const [offer, setOffer] = useState<Offer | null>(null)
  const [pkg, setPkg] = useState<PackageData | null>(null)
  const [pkgPrice, setPkgPrice] = useState<PriceData | null>(null)
  const [qualification, setQualification] = useState<QualificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { currentResponseTime, isWithinWorkingHours } = useAgencySettings(slug)

  // Form state - pre-fill from URL params if available (from promo flow)
  const [formData, setFormData] = useState({
    customerName: urlName,
    customerEmail: urlEmail,
    customerPhone: urlPhone,
    adults: urlAdults ? parseInt(urlAdults) : 2,
    children: urlChildren ? parseInt(urlChildren) : 0,
    childAges: urlChildAges ? urlChildAges.split(',').map(a => parseInt(a)) : [] as number[],
    message: '',
    selectedDate: selectedDate,
    selectedRoomTypeId: selectedRoomTypeId,
    selectedMealPlan: selectedMealPlan,
  })

  useEffect(() => {
    // Get qualification from session storage
    const storedQualification = sessionStorage.getItem('qualification')
    if (storedQualification) {
      const qual = JSON.parse(storedQualification) as QualificationData
      setQualification(qual)
      // Only override if not set from URL params
      if (!urlAdults) {
        setFormData(prev => ({
          ...prev,
          adults: qual.guests.adults,
          children: qual.guests.children,
          childAges: qual.guests.childAges || [],
        }))
      }
    }

    // Get contact info from promo flow (pre-fill to avoid duplicate entry)
    // Only use sessionStorage if not already set from URL params
    if (!urlName && !urlEmail && !urlPhone) {
      const storedContact = sessionStorage.getItem('promo_contact')
      if (storedContact) {
        try {
          const contact = JSON.parse(storedContact) as { name?: string; email?: string; phone?: string }
          setFormData(prev => ({
            ...prev,
            customerName: contact.name || prev.customerName,
            customerEmail: contact.email || prev.customerEmail,
            customerPhone: contact.phone || prev.customerPhone,
          }))
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Fetch offer or package details
    const fetchData = async () => {
      try {
        setLoading(true)

        if (isPackageInquiry) {
          // Fetch package details
          const response = await fetch(`/api/public/agencies/${slug}/packages/${offerId}`)
          if (!response.ok) throw new Error('Package not found')
          const data = await response.json()
          setPkg(data)

          // Also fetch price for the selected date/room/meal
          if (selectedDate && selectedRoomTypeId) {
            try {
              const priceResponse = await fetch(
                `/api/public/agencies/${slug}/packages/${offerId}/price-for-date?date=${selectedDate}&room_type_id=${selectedRoomTypeId}&meal_plan=${selectedMealPlan}`
              )
              if (priceResponse.ok) {
                const priceData = await priceResponse.json()
                setPkgPrice(priceData)
              }
            } catch (priceErr) {
              console.log('Could not fetch price:', priceErr)
            }
          }
        } else {
          // Fetch offer details
          const response = await fetch(`/api/public/agencies/${slug}/offers?id=${offerId}`)
          if (!response.ok) throw new Error('Offer not found')

          const data = await response.json()
          if (data.offers && data.offers.length > 0) {
            setOffer(data.offers[0])
          } else {
            throw new Error('Offer not found')
          }
        }
      } catch (err) {
        setError('Ponuda nije pronađena')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, offerId, isPackageInquiry, urlAdults, selectedDate, selectedRoomTypeId, selectedMealPlan])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offer && !pkg) return

    // Basic validation
    if (!formData.customerName.trim() || !formData.customerEmail.trim() || !formData.customerPhone.trim()) {
      alert('Molimo popunite sva obavezna polja')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          offer_id: offer?.id || null,
          package_id: pkg?.id || null,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          adults: formData.adults,
          children: formData.children,
          child_ages: formData.childAges,
          message: formData.message,
          qualification_data: qualification || undefined,
          // Package-specific fields
          selected_date: formData.selectedDate || null,
          selected_room_type_id: formData.selectedRoomTypeId || null,
          selected_meal_plan: formData.selectedMealPlan || null,
          // Tracking ID from sent offer link (for conversion tracking)
          tracking_id: trackingId || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to create inquiry')

      // Navigate to confirmation
      router.push(`/a/${slug}/inquiry/sent`)
    } catch (err) {
      console.error('Inquiry error:', err)
      alert('Greška pri slanju upita. Pokušajte ponovo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error || (!offer && !pkg)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Ponuda nije pronađena'}</p>
          <Link href={`/a/${slug}/ponude`} className="text-blue-600 underline">
            Nazad na ponude
          </Link>
        </div>
      </div>
    )
  }

  // Handle both offer and package display
  const primaryImage = pkg?.images?.[0]?.url || offer?.images?.[0]?.url
  const displayName = pkg?.hotel_name || pkg?.name || offer?.name || ''
  const displayCity = pkg?.destination_city || offer?.city || ''
  const displayCountry = pkg?.destination_country || offer?.country || ''
  const displayStars = pkg?.hotel_stars || offer?.star_rating
  const displayDuration = pkg?.default_duration

  // Get selected room type name
  const selectedRoomType = pkg?.room_types?.find(rt => rt.id === formData.selectedRoomTypeId)

  // For packages, we don't have a fixed price - just show "Na upit"
  const totalPrice = offer ? offer.price_per_person * (formData.adults + formData.children) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={pkg ? `/a/${slug}/paket/${pkg.id}` : `/a/${slug}/ponude`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{pkg ? 'Nazad na paket' : 'Nazad na ponude'}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Offer/Package summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-24">
              {/* Image */}
              <div className="aspect-video bg-gray-200 relative">
                {primaryImage ? (
                  <Image
                    src={primaryImage}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="text-4xl">🏨</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-600">
                  Raspoloživost na upit
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h2 className="font-bold text-lg">
                    {displayName} {displayStars && formatStarRating(displayStars)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {displayCity}{displayCity && displayCountry && ', '}{displayCountry}
                  </p>
                </div>

                {/* Package-specific details */}
                {pkg && (
                  <div className="text-sm text-gray-600 space-y-2">
                    {formData.selectedDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>Dolazak: {new Date(formData.selectedDate).toLocaleDateString('sr-Latn')}</span>
                      </div>
                    )}
                    {displayDuration && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <span>{displayDuration} noći</span>
                      </div>
                    )}
                    {selectedRoomType && (
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-teal-600" />
                        <span>{selectedRoomType.name}</span>
                      </div>
                    )}
                    {formData.selectedMealPlan && (
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-teal-600" />
                        <span>{MEAL_LABELS[formData.selectedMealPlan] || formData.selectedMealPlan}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" />
                      <span>{formData.adults} odraslih{formData.children > 0 && `, ${formData.children} dece`}</span>
                    </div>
                  </div>
                )}

                {/* Offer-specific details */}
                {offer && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📅 {formatDateRange(offer.departure_date, offer.return_date)}</p>
                    <p>🍽️ {getBoardLabel(offer.board_type)}</p>
                    <p>✈️ {getTransportLabel(offer.transport_type)}</p>
                  </div>
                )}

                <div className="border-t pt-3">
                  {offer ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Okvirna cena</span>
                      <span className="font-bold">€{offer.price_per_person}/os</span>
                    </div>
                  ) : pkgPrice ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cena po osobi/noć</span>
                        <span className="font-bold">€{pkgPrice.price_per_person}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-teal-600">
                        <span>Ukupno</span>
                        <span>€{pkgPrice.price_per_person * (formData.adults + formData.children) * (displayDuration || 1)}</span>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {formData.adults + formData.children} os. × {displayDuration || 1} noći
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-teal-600 font-semibold">
                      Raspoloživost na upit
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Response time info */}
            <div className="mt-4 bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Vreme odgovora</span>
              </div>
              <p className="text-sm text-blue-700">
                {isWithinWorkingHours ? (
                  <>
                    Odgovaramo u roku od{' '}
                    <span className="font-bold">{formatResponseTime(currentResponseTime)}</span>
                  </>
                ) : (
                  'Očekujte odgovor ubrzo!'
                )}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pošaljite upit
            </h1>
            <p className="text-gray-600 mb-6">
              Proverićemo dostupnost i javiti vam se u najkraćem roku.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact details */}
              <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-900">Vaši podaci</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ime i prezime *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Marko Marković"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="marko@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="+381 64 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Guest count - read-only for package inquiries, editable for offers */}
              {isPackageInquiry ? (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    Broj putnika
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
                      <span className="block text-xs text-gray-500 mb-1">Odrasli</span>
                      <span className="text-lg font-semibold text-gray-900">{formData.adults}</span>
                    </div>
                    <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
                      <span className="block text-xs text-gray-500 mb-1">Deca</span>
                      <span className="text-lg font-semibold text-gray-900">{formData.children}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Broj putnika izabran na stranici paketa
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Broj putnika</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Odrasli
                      </label>
                      <select
                        value={formData.adults}
                        onChange={(e) => setFormData({ ...formData, adults: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deca
                      </label>
                      <select
                        value={formData.children}
                        onChange={(e) => setFormData({ ...formData, children: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Poruka (opciono)
                </h3>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Posebni zahtevi, pitanja o ponudi..."
                />
              </div>

              {/* Price estimate */}
              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">{pkgPrice || offer ? 'Ukupna cena' : 'Cena'}</p>
                    <p className="text-xs text-gray-400">
                      {pkgPrice && displayDuration
                        ? `${formData.adults + formData.children} os. × ${displayDuration} noći × €${pkgPrice.price_per_person}`
                        : 'Tačna cena nakon potvrde raspoloživosti'}
                    </p>
                  </div>
                  {offer ? (
                    <span className="text-2xl font-bold text-gray-900">
                      ~€{totalPrice.toLocaleString()}
                    </span>
                  ) : pkgPrice ? (
                    <span className="text-2xl font-bold text-teal-600">
                      €{(pkgPrice.price_per_person * (formData.adults + formData.children) * (displayDuration || 1)).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xl font-bold text-teal-600">
                      Raspoloživost na upit
                    </span>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Šalje se...
                  </>
                ) : (
                  'Pošalji upit'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
