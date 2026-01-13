'use client'

import type { Offer, QualificationData } from '@/types'
import InstantOfferCard from './InstantOfferCard'
import InquiryOfferCard from './InquiryOfferCard'
import ResponseTimeDisplay from './ResponseTimeDisplay'

interface ResultsSectionProps {
  title: string
  subtitle?: React.ReactNode
  offers: Offer[]
  cardType: 'instant' | 'inquiry'
  qualification: QualificationData
  slug: string
  responseTimeMinutes?: number
  isWithinWorkingHours?: boolean
}

export default function ResultsSection({
  title,
  subtitle,
  offers,
  cardType,
  qualification,
  slug,
  responseTimeMinutes = 30,
  isWithinWorkingHours = true,
}: ResultsSectionProps) {
  if (offers.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <p className="text-gray-500">{subtitle}</p>
          ) : (
            subtitle
          )
        ) : cardType === 'inquiry' ? (
          <ResponseTimeDisplay
            responseTimeMinutes={responseTimeMinutes}
            isWithinWorkingHours={isWithinWorkingHours}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) =>
          cardType === 'instant' ? (
            <InstantOfferCard
              key={offer.id}
              offer={offer}
              qualification={qualification}
              slug={slug}
            />
          ) : (
            <InquiryOfferCard
              key={offer.id}
              offer={offer}
              qualification={qualification}
              slug={slug}
              responseTimeMinutes={responseTimeMinutes}
              isWithinWorkingHours={isWithinWorkingHours}
            />
          )
        )}
      </div>
    </section>
  )
}
