'use client'

import { Shield, CreditCard, CheckCircle, Award } from 'lucide-react'
import type { LandingTrustBadgesProps } from '@/types/landing'

export default function LandingTrustBadges({ 
  isYutaMember, 
  isLicensed, 
  showInstallments, 
  showSecureBooking 
}: LandingTrustBadgesProps) {
  const badges = [
    {
      show: showSecureBooking,
      icon: Shield,
      text: 'Sigurna rezervacija',
    },
    {
      show: showInstallments,
      icon: CreditCard,
      text: 'Plaćanje na rate',
    },
    {
      show: isYutaMember,
      icon: Award,
      text: 'YUTA garancija',
    },
    {
      show: isLicensed,
      icon: CheckCircle,
      text: 'Licencirana agencija',
    },
  ].filter(badge => badge.show)

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 px-4">
      {badges.map((badge, index) => (
        <div 
          key={index}
          className="flex items-center gap-2 text-white/70 text-sm"
        >
          <badge.icon className="w-4 h-4" />
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  )
}
