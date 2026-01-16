'use client'

import { Smartphone } from 'lucide-react'
import type { AgencyLandingSettings } from '@/types/landing'

interface LandingPreviewProps {
  settings: AgencyLandingSettings
  agencyName: string
}

// Default background image
const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=60'

export default function LandingPreview({ settings, agencyName }: LandingPreviewProps) {
  const backgroundUrl = settings.background_image_url || DEFAULT_BACKGROUND

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Smartphone className="h-4 w-4 text-[#64748B]" />
        <span className="text-sm font-medium text-[#64748B]">Pregled</span>
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-[280px]">
        {/* Phone bezel */}
        <div className="bg-gray-900 rounded-[36px] p-2 shadow-xl">
          {/* Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
          
          {/* Screen */}
          <div className="bg-white rounded-[28px] overflow-hidden h-[560px] relative">
            {/* Mini landing page */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${backgroundUrl})` }}
            />
            
            {/* Dusty teal overlay */}
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

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <header className="py-3 px-3">
                <div className="flex items-center gap-2">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover bg-white/10"
                    />
                  ) : settings.logo_initials ? (
                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                      {settings.logo_initials}
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                      {agencyName[0] || 'A'}
                    </div>
                  )}
                  <span className="text-white text-xs font-medium truncate max-w-[120px]">
                    {agencyName}
                  </span>
                </div>
              </header>

              {/* Hero */}
              <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                {/* Specialization badge */}
                {settings.show_specialization && settings.specialization_text && (
                  <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full mb-3">
                    {settings.specialization_emoji && (
                      <span className="text-xs">{settings.specialization_emoji}</span>
                    )}
                    <span className="text-white/90 text-[9px]">
                      {settings.specialization_text}
                    </span>
                  </div>
                )}

                {/* Headline */}
                <h1 className="text-base font-bold text-white mb-2 leading-tight">
                  {settings.headline}
                </h1>

                {/* Subtitle */}
                <p className="text-[10px] text-white/80 mb-4 line-clamp-2">
                  {settings.subtitle}
                </p>

                {/* CTA Button */}
                <button className="bg-amber-500 text-gray-900 px-4 py-2 rounded-lg text-[11px] font-semibold shadow-lg">
                  {settings.cta_text}
                </button>

                {/* Subtext */}
                <p className="text-[8px] text-white/60 mt-2">
                  60 sekundi • Besplatno
                </p>
              </main>

              {/* Stats card */}
              {settings.show_stats && (
                <div className="mx-3 mb-3 bg-white/95 rounded-xl p-2">
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {settings.stat_travelers && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-900">
                          {settings.stat_travelers.toLocaleString()}+
                        </p>
                        <p className="text-[7px] text-gray-500">Putnika</p>
                      </div>
                    )}
                    {settings.stat_years && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-900">
                          {settings.stat_years}
                        </p>
                        <p className="text-[7px] text-gray-500">Godina</p>
                      </div>
                    )}
                    {settings.stat_rating && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-900">
                          ⭐ {settings.stat_rating}
                        </p>
                        <p className="text-[7px] text-gray-500">Ocena</p>
                      </div>
                    )}
                    {settings.stat_destinations && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-900">
                          {settings.stat_destinations}+
                        </p>
                        <p className="text-[7px] text-gray-500">Destinacija</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 px-2 pb-2">
                {settings.show_secure_booking && (
                  <span className="text-[7px] text-white/70">✓ Sigurno</span>
                )}
                {settings.show_installments && (
                  <span className="text-[7px] text-white/70">✓ Rate</span>
                )}
                {settings.is_yuta_member && (
                  <span className="text-[7px] text-white/70">✓ YUTA</span>
                )}
              </div>

              {/* Footer */}
              <footer className="bg-black/30 py-2 px-2 text-center">
                <p className="text-[7px] text-white/60 truncate">
                  {settings.legal_name || agencyName}
                  {settings.license_number && ` • ${settings.license_number}`}
                </p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
