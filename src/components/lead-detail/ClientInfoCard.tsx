'use client'

import { Phone, Mail, MapPin, Globe, MessageSquare, Pencil } from 'lucide-react'
import type { Lead, LeadSource } from '@/types'
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils'

interface ClientInfoCardProps {
  lead: Lead
  source?: LeadSource | null
  originalMessage?: string | null
  onEdit?: () => void
}

export default function ClientInfoCard({
  lead,
  source,
  originalMessage,
  onEdit
}: ClientInfoCardProps) {
  const initials = getInitials(lead.name)
  const gradient = getAvatarGradient(lead.name)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Informacije o klijentu
        </h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Izmeni
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${gradient}`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{lead.name}</h3>

            {/* Contact Grid */}
            <div className="mt-3 grid grid-cols-2 gap-4">
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${lead.phone}`} className="text-gray-600 hover:text-blue-500">
                    {lead.phone}
                  </a>
                </div>
              )}

              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="text-gray-600 hover:text-blue-500 truncate">
                    {lead.email}
                  </a>
                </div>
              )}

              {lead.destination && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{lead.destination}</span>
                </div>
              )}

              {source && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{source.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Original Message */}
        {originalMessage && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">Poruka klijenta</p>
                <p className="text-sm text-amber-600 mt-1 whitespace-pre-wrap">&quot;{originalMessage}&quot;</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
