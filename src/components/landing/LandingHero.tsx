'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LandingHeroProps } from '@/types/landing'

export default function LandingHero({ settings, agencyName, slug }: LandingHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 md:py-12">
      {/* Specialization badge */}
      {settings.show_specialization && settings.specialization_text && (
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
          {settings.specialization_emoji && (
            <span className="text-xl">{settings.specialization_emoji}</span>
          )}
          <span className="text-white/90 text-sm font-medium">
            {settings.specialization_text}
          </span>
        </div>
      )}

      {/* Headline */}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-3xl leading-tight">
        {settings.headline}
      </h1>

      {/* Subtitle */}
      <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
        {settings.subtitle}
      </p>

      {/* CTA Button */}
      <Link
        href={`/a/${slug}/qualify`}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        {settings.cta_text}
        <ArrowRight className="w-5 h-5" />
      </Link>

      {/* Subtext */}
      <p className="text-sm text-white/60 mt-4">
        60 sekundi • Besplatno • Bez obaveze
      </p>
    </div>
  )
}
