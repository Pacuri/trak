'use client'

import type { FloatingOfferCardsProps } from '@/types/landing'
import { getLabelBgColor } from '@/lib/labels'

export default function FloatingOfferCards({ offers }: FloatingOfferCardsProps) {
  if (offers.length < 2) return null

  return (
    <>
      {/* Left floating card */}
      <div 
        className="hidden lg:block absolute left-[5%] top-[30%] z-10 animate-float"
        style={{ animationDelay: '0s' }}
      >
        <FloatingCard offer={offers[0]} />
      </div>

      {/* Right floating card */}
      <div 
        className="hidden lg:block absolute right-[5%] top-[40%] z-10 animate-float"
        style={{ animationDelay: '1.5s' }}
      >
        <FloatingCard offer={offers[1]} />
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

function FloatingCard({ offer }: { offer: FloatingOfferCardsProps['offers'][0] }) {
  const hasImage = offer.image_url !== null

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-[200px] transform hover:scale-105 transition-transform cursor-pointer">
      {/* Urgency label */}
      {offer.urgency_label && (
        <div className={`absolute -top-2 -left-2 ${getLabelBgColor(offer.urgency_label.color)} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}>
          {offer.urgency_label.icon} {offer.urgency_label.text}
        </div>
      )}

      {/* Image */}
      <div className="relative w-full h-24 rounded-xl overflow-hidden mb-3">
        {hasImage ? (
          <img
            src={offer.image_url!}
            alt={offer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600" />
        )}
      </div>

      {/* Content */}
      <div>
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {offer.name}
        </h4>
        <p className="text-gray-500 text-xs mt-0.5">
          {offer.city ? `${offer.city}, ` : ''}{offer.country}
        </p>
        <p className="text-teal-700 font-bold text-sm mt-2">
          od €{offer.price_per_person.toLocaleString('sr-RS')}/os
        </p>
      </div>
    </div>
  )
}
