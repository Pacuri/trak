'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { 
  LandingHero, 
  LandingStats, 
  LandingTrustBadges, 
  LandingFooter,
  FloatingOfferCards 
} from '@/components/landing'
import type { LandingPageData } from '@/types/landing'

export default function AgencyLandingPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [data, setData] = useState<LandingPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLandingData() {
      try {
        const response = await fetch(`/api/public/agencies/${slug}/landing`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Agencija nije pronađena')
          } else {
            setError('Greška pri učitavanju')
          }
          return
        }
        const landingData = await response.json()
        setData(landingData)
      } catch (err) {
        console.error('Error fetching landing data:', err)
        setError('Greška pri učitavanju')
      } finally {
        setLoading(false)
      }
    }

    fetchLandingData()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-700 to-teal-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">
            {error || 'Greška'}
          </h1>
          <p className="text-white/70">
            Proverite da li je link ispravan
          </p>
        </div>
      </div>
    )
  }

  const { agency, settings, background_image_url, floating_offers } = data

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image with dusty teal overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${background_image_url})` }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(55, 100, 100, 0.7) 0%,
            rgba(60, 110, 110, 0.45) 50%,
            rgba(50, 90, 95, 0.65) 100%
          )`
        }}
      />

      {/* Floating offer cards (desktop only) */}
      <FloatingOfferCards offers={floating_offers} />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="py-4 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Logo + Agency name */}
            <div className="flex items-center gap-3">
              {agency.logo_url ? (
                <img
                  src={agency.logo_url}
                  alt={agency.name}
                  className="h-10 w-10 rounded-full object-cover bg-white/10"
                />
              ) : settings.logo_initials ? (
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  {settings.logo_initials}
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  {agency.name[0]}
                </div>
              )}
              <span className="font-semibold text-white text-lg">
                {agency.name}
              </span>
            </div>

            {/* Licensed badge */}
            {settings.is_licensed && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-white/80 text-sm">
                  ✓ Licencirana agencija
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main content - centered */}
        <main className="flex-1 flex flex-col items-center justify-center">
          <LandingHero 
            settings={settings} 
            agencyName={agency.name} 
            slug={slug} 
          />

          {/* Stats card */}
          {settings.show_stats && (
            <div className="mt-8">
              <LandingStats
                travelers={settings.stat_travelers}
                years={settings.stat_years}
                rating={settings.stat_rating}
                destinations={settings.stat_destinations}
              />
            </div>
          )}
        </main>

        {/* Trust badges */}
        <div className="py-6">
          <LandingTrustBadges
            isYutaMember={settings.is_yuta_member}
            isLicensed={settings.is_licensed}
            showInstallments={settings.show_installments}
            showSecureBooking={settings.show_secure_booking}
          />
        </div>

        {/* Footer */}
        <LandingFooter
          agencyName={agency.name}
          legalName={settings.legal_name}
          licenseNumber={settings.license_number}
          footerText={settings.footer_text}
        />
      </div>
    </div>
  )
}
