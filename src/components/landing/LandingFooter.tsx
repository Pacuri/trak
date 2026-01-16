'use client'

import type { LandingFooterProps } from '@/types/landing'

export default function LandingFooter({ 
  agencyName, 
  legalName, 
  licenseNumber, 
  footerText 
}: LandingFooterProps) {
  const displayName = legalName || agencyName

  return (
    <footer className="bg-black/30 backdrop-blur-sm py-4 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-white/60 text-sm">
          {displayName}
          {licenseNumber && (
            <>
              {' • '}
              <span className="text-white/50">{licenseNumber}</span>
            </>
          )}
        </p>
        {footerText && (
          <p className="text-white/40 text-xs mt-1">
            {footerText}
          </p>
        )}
      </div>
    </footer>
  )
}
