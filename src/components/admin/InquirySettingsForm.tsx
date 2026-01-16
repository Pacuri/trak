'use client'

import { MessageCircle, Mail, Phone } from 'lucide-react'
import type { AgencyInquirySettings } from '@/types/inquiry'

interface InquirySettingsFormProps {
  settings: AgencyInquirySettings
  onChange: (settings: AgencyInquirySettings) => void
}

export default function InquirySettingsForm({ settings, onChange }: InquirySettingsFormProps) {
  const updateField = <K extends keyof AgencyInquirySettings>(
    field: K,
    value: AgencyInquirySettings[K]
  ) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <div className="border border-[#E2E8F0] rounded-[14px] bg-white overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#E2E8F0]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F3FF]">
          <MessageCircle className="h-4 w-4 text-[#8B5CF6]" />
        </div>
        <span className="font-medium text-[#1E293B]">Prilagođeni upiti</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Allow custom inquiries toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allow_custom_inquiries}
            onChange={(e) => updateField('allow_custom_inquiries', e.target.checked)}
            className="h-4 w-4 rounded border-[#E2E8F0] text-[#8B5CF6] focus:ring-[#8B5CF6]/20"
          />
          <div>
            <span className="text-sm font-medium text-[#1E293B]">
              Dozvoli prilagođene upite
            </span>
            <p className="text-xs text-[#64748B]">
              Klijenti mogu poslati upit ako nema ponuda
            </p>
          </div>
        </label>

        {/* Show with results toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.show_inquiry_with_results}
            onChange={(e) => updateField('show_inquiry_with_results', e.target.checked)}
            disabled={!settings.allow_custom_inquiries}
            className="h-4 w-4 rounded border-[#E2E8F0] text-[#8B5CF6] focus:ring-[#8B5CF6]/20 disabled:opacity-50"
          />
          <div className={!settings.allow_custom_inquiries ? 'opacity-50' : ''}>
            <span className="text-sm font-medium text-[#1E293B]">
              Prikaži i kada ima ponuda
            </span>
            <p className="text-xs text-[#64748B]">
              "Niste pronašli što tražite?" link na dnu rezultata
            </p>
          </div>
        </label>

        {/* Response time text */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
            Poruka o vremenu odgovora
          </label>
          <input
            type="text"
            value={settings.inquiry_response_text}
            onChange={(e) => updateField('inquiry_response_text', e.target.value)}
            placeholder="Javićemo vam se u roku od 24 sata"
            maxLength={200}
            className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
          />
          <p className="text-xs text-[#64748B] mt-1">
            Prikazuje se klijentu nakon slanja upita
          </p>
        </div>

        {/* Notification email */}
        <div className="border-t border-[#E2E8F0] pt-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#64748B]" />
              Email za notifikacije
            </div>
          </label>
          <input
            type="email"
            value={settings.inquiry_notification_email || ''}
            onChange={(e) => updateField('inquiry_notification_email', e.target.value || null)}
            placeholder="info@agencija.rs"
            className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
          />
          <p className="text-xs text-[#64748B] mt-1">
            Dobićete email kada stigne novi upit
          </p>
        </div>

        {/* Notification phone */}
        <div>
          <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#64748B]" />
              Telefon za SMS/Viber (opciono)
            </div>
          </label>
          <input
            type="tel"
            value={settings.inquiry_notification_phone || ''}
            onChange={(e) => updateField('inquiry_notification_phone', e.target.value || null)}
            placeholder="065 123 4567"
            className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
          />
          <p className="text-xs text-[#64748B] mt-1">
            SMS notifikacija za nove upite (uskoro)
          </p>
        </div>
      </div>
    </div>
  )
}
