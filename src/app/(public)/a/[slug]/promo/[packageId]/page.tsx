'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  MapPin,
  Users,
  Baby,
  Calendar,
  ArrowRight,
  Loader2,
  Minus,
  Plus,
  Hotel,
  Star,
  Check,
} from 'lucide-react'
import type { QualificationData } from '@/types'

interface PromoPackage {
  id: string
  name: string
  description?: string
  destination_country: string
  destination_city?: string
  hotel_name?: string
  hotel_stars?: number
  package_type: string
  board_type?: string
  valid_from?: string | null
  valid_to?: string | null
  default_duration?: number
  price_from?: number
  currency: string
  images: { id: string; url: string; position: number; is_primary?: boolean }[]
}

const MEAL_LABELS: Record<string, string> = {
  all_inclusive: 'All Inclusive',
  half_board: 'Polupansion',
  breakfast: 'Doručak',
  room_only: 'Samo noćenje',
}

export default function PromoPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const packageId = params.packageId as string

  const [pkg, setPkg] = useState<PromoPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Wizard state
  const [step, setStep] = useState(1)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [childAges, setChildAges] = useState<number[]>([])
  const [dateType, setDateType] = useState<'flexible' | 'specific'>('flexible')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [specificDate, setSpecificDate] = useState<string>('')
  const [duration, setDuration] = useState(7)

  // Contact info
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function fetchPackage() {
      try {
        setLoading(true)
        const res = await fetch(`/api/public/agencies/${slug}/packages/${packageId}`)
        if (!res.ok) throw new Error('Paket nije pronađen')
        const data = await res.json()
        setPkg(data)
        // Set default duration from package if available
        if (data.default_duration) {
          setDuration(data.default_duration)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }
    if (slug && packageId) fetchPackage()
  }, [slug, packageId])

  const handleAddChild = () => {
    if (children < 4) {
      setChildren(children + 1)
      setChildAges([...childAges, 5])
    }
  }

  const handleRemoveChild = () => {
    if (children > 0) {
      setChildren(children - 1)
      setChildAges(childAges.slice(0, -1))
    }
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...childAges]
    newAges[index] = age
    setChildAges(newAges)
  }

  const handleContinue = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      // Save qualification data and redirect to package page
      const qualificationData: QualificationData = {
        destination: {
          country: pkg?.destination_country || '',
          city: pkg?.destination_city || null,
        },
        dates: {
          month: selectedMonth || null,
          exactStart: specificDate || null,
          exactEnd: null,
          duration: duration,
          flexible: dateType === 'flexible',
        },
        guests: {
          adults,
          children,
          childAges,
        },
        budget: {
          min: null,
          max: null,
          perPerson: true,
        },
        accommodation: {
          type: null,
          board: pkg?.board_type as any || null,
          transport: null,
        },
        package_id: packageId,
        package_name: pkg?.name || '',
      }

      // Store contact info separately for the inquiry form
      if (name || email || phone) {
        sessionStorage.setItem('promo_contact', JSON.stringify({ name, email, phone }))
      }

      sessionStorage.setItem('qualification', JSON.stringify(qualificationData))
      sessionStorage.setItem('promo_package_id', packageId)

      router.push(`/a/${slug}/paket/${packageId}`)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return adults >= 1
      case 2:
        return dateType === 'flexible' ? !!selectedMonth : !!specificDate
      case 3:
        return name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0)
      default:
        return true
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Paket nije pronađen'}</h2>
          <p className="text-gray-600">Ova ponuda više nije dostupna.</p>
        </div>
      </div>
    )
  }

  const primaryImage = pkg.images?.[0]?.url
  const locationText = [pkg.destination_city, pkg.destination_country].filter(Boolean).join(', ')

  const months = [
    { value: 'jan', label: 'Januar' },
    { value: 'feb', label: 'Februar' },
    { value: 'mar', label: 'Mart' },
    { value: 'apr', label: 'April' },
    { value: 'maj', label: 'Maj' },
    { value: 'jun', label: 'Jun' },
    { value: 'jul', label: 'Jul' },
    { value: 'avg', label: 'Avgust' },
    { value: 'sep', label: 'Septembar' },
    { value: 'okt', label: 'Oktobar' },
    { value: 'nov', label: 'Novembar' },
    { value: 'dec', label: 'Decembar' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative h-[40vh] sm:h-[45vh] overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={pkg.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-blue-600" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Package info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Location */}
            <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <MapPin className="w-4 h-4" />
              <span>{locationText}</span>
            </div>

            {/* Package name */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              {pkg.hotel_name || pkg.name}
            </h1>

            {/* Stars & Board type */}
            <div className="flex flex-wrap items-center gap-3">
              {pkg.hotel_stars && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-white text-sm font-medium">{pkg.hotel_stars} zvezdica</span>
                </div>
              )}
              {pkg.board_type && MEAL_LABELS[pkg.board_type] && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-white text-sm font-medium">{MEAL_LABELS[pkg.board_type]}</span>
                </div>
              )}
              {pkg.price_from && (
                <div className="bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-white text-sm font-medium">od €{pkg.price_from}/os.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Card */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 pb-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress indicator */}
          <div className="flex border-b border-gray-100">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  s === step
                    ? 'text-teal-600 border-b-2 border-teal-600 -mb-px'
                    : s < step
                    ? 'text-teal-600'
                    : 'text-gray-400'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2 ${
                  s < step
                    ? 'bg-teal-600 text-white'
                    : s === step
                    ? 'bg-teal-100 text-teal-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {s < step ? <Check className="w-3.5 h-3.5" /> : s}
                </span>
                {s === 1 ? 'Putnici' : s === 2 ? 'Termin' : 'Kontakt'}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="p-6">
            {/* Step 1: Guests */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ko putuje?</h2>
                  <p className="text-gray-500">Unesite broj putnika za ovo putovanje</p>
                </div>

                {/* Adults */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Odrasli</div>
                      <div className="text-sm text-gray-500">18+ godina</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xl font-bold text-gray-900">{adults}</span>
                    <button
                      onClick={() => setAdults(Math.min(10, adults + 1))}
                      disabled={adults >= 10}
                      className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Baby className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Deca</div>
                      <div className="text-sm text-gray-500">0-17 godina</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleRemoveChild}
                      disabled={children === 0}
                      className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xl font-bold text-gray-900">{children}</span>
                    <button
                      onClick={handleAddChild}
                      disabled={children >= 4}
                      className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Child ages */}
                {children > 0 && (
                  <div className="space-y-3 p-4 bg-amber-50 rounded-xl">
                    <div className="text-sm font-medium text-amber-800">Uzrast dece</div>
                    <div className="grid grid-cols-2 gap-3">
                      {childAges.map((age, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm text-amber-700">Dete {idx + 1}:</span>
                          <select
                            value={age}
                            onChange={(e) => handleChildAgeChange(idx, parseInt(e.target.value))}
                            className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          >
                            {Array.from({ length: 18 }, (_, i) => (
                              <option key={i} value={i}>{i} god.</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Dates */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Kada želite da putujete?</h2>
                  <p className="text-gray-500">Odaberite željeni termin putovanja</p>
                </div>

                {/* Date type toggle */}
                <div className="flex gap-3 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setDateType('flexible')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                      dateType === 'flexible'
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📅 Fleksibilan sam
                  </button>
                  <button
                    onClick={() => setDateType('specific')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                      dateType === 'specific'
                        ? 'bg-white text-teal-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🎯 Tačan datum
                  </button>
                </div>

                {dateType === 'flexible' ? (
                  <>
                    {/* Month selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        U kom mesecu želite da putujete?
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {months.map((month) => (
                          <button
                            key={month.value}
                            onClick={() => setSelectedMonth(month.value)}
                            className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                              selectedMonth === month.value
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Specific date */
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Željeni datum polaska
                    </label>
                    <input
                      type="date"
                      value={specificDate}
                      min={pkg.valid_from || undefined}
                      max={pkg.valid_to || undefined}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                )}

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Koliko noći?
                  </label>
                  <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <button
                      onClick={() => setDuration(Math.max(1, duration - 1))}
                      disabled={duration <= 1}
                      className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                      <span className="text-3xl font-bold text-gray-900">{duration}</span>
                      <span className="text-gray-500 ml-2">noći</span>
                    </div>
                    <button
                      onClick={() => setDuration(Math.min(30, duration + 1))}
                      disabled={duration >= 30}
                      className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-teal-500 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Vaši podaci</h2>
                  <p className="text-gray-500">Ostavite kontakt kako bismo vas obavestili o ponudi</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ime i prezime *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Petar Petrović"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email adresa
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="petar@email.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Broj telefona
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+381 64 123 4567"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    * Potreban je barem email ili broj telefona
                  </p>
                </div>

                {/* Summary */}
                <div className="p-4 bg-teal-50 rounded-xl">
                  <h3 className="font-semibold text-teal-900 mb-2">Vaša pretraga:</h3>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>📍 {pkg.hotel_name || pkg.name}, {locationText}</li>
                    <li>👥 {adults} odraslih{children > 0 ? `, ${children} dece` : ''}</li>
                    <li>📅 {dateType === 'flexible' ? months.find(m => m.value === selectedMonth)?.label : specificDate}, {duration} noći</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer with buttons */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Nazad
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={!isStepValid()}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {step === 3 ? 'Pogledaj ponudu' : 'Nastavi'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔒 Vaši podaci su sigurni i koriste se samo za kontakt
          </p>
        </div>
      </div>
    </div>
  )
}
