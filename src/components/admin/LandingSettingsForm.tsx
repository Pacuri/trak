'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Palette, FileText, BarChart3, Shield, FileSignature } from 'lucide-react'
import type { AgencyLandingSettings } from '@/types/landing'

const FLAG_OPTIONS = [
  { value: '', label: 'Izaberi zastavu/ikonu' },
  { value: '🇬🇷', label: '🇬🇷 Grčka' },
  { value: '🇹🇷', label: '🇹🇷 Turska' },
  { value: '🇪🇬', label: '🇪🇬 Egipat' },
  { value: '🇪🇸', label: '🇪🇸 Španija' },
  { value: '🇮🇹', label: '🇮🇹 Italija' },
  { value: '🇭🇷', label: '🇭🇷 Hrvatska' },
  { value: '🇲🇪', label: '🇲🇪 Crna Gora' },
  { value: '🇦🇱', label: '🇦🇱 Albanija' },
  { value: '🇧🇬', label: '🇧🇬 Bugarska' },
  { value: '🇹🇳', label: '🇹🇳 Tunis' },
  { value: '🇦🇪', label: '🇦🇪 UAE / Dubai' },
  { value: '🇨🇾', label: '🇨🇾 Kipar' },
  { value: '🇵🇹', label: '🇵🇹 Portugalija' },
  { value: '🇫🇷', label: '🇫🇷 Francuska' },
  { value: '🇦🇹', label: '🇦🇹 Austrija' },
  { value: '🇨🇿', label: '🇨🇿 Češka' },
  { value: '🇭🇺', label: '🇭🇺 Mađarska' },
  { value: '🇷🇸', label: '🇷🇸 Srbija' },
  { value: '🌍', label: '🌍 Svet' },
  { value: '✈️', label: '✈️ Avio ture' },
  { value: '🚌', label: '🚌 Autobus ture' },
  { value: '🏔️', label: '🏔️ Planine / Skijanje' },
  { value: '🏖️', label: '🏖️ Plaže' },
  { value: '🛳️', label: '🛳️ Krstarenja' },
]

interface LandingSettingsFormProps {
  settings: AgencyLandingSettings
  onChange: (settings: AgencyLandingSettings) => void
}

interface AccordionSectionProps {
  title: string
  icon: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function AccordionSection({ title, icon, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="border border-[#E2E8F0] rounded-[14px] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF]">
            {icon}
          </div>
          <span className="font-medium text-[#1E293B]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-[#64748B]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#64748B]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-[#E2E8F0]">
          {children}
        </div>
      )}
    </div>
  )
}

export default function LandingSettingsForm({ settings, onChange }: LandingSettingsFormProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['branding']))

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const updateField = <K extends keyof AgencyLandingSettings>(
    field: K,
    value: AgencyLandingSettings[K]
  ) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Branding */}
      <AccordionSection
        title="Branding"
        icon={<Palette className="h-4 w-4 text-[#3B82F6]" />}
        isOpen={openSections.has('branding')}
        onToggle={() => toggleSection('branding')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Logo URL
              </label>
              <input
                type="url"
                value={settings.logo_url || ''}
                onChange={(e) => updateField('logo_url', e.target.value || null)}
                placeholder="https://..."
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
              />
              <p className="text-xs text-[#64748B] mt-1">Link do logo slike</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Inicijali (ako nema logo)
              </label>
              <input
                type="text"
                value={settings.logo_initials || ''}
                onChange={(e) => updateField('logo_initials', e.target.value.slice(0, 2).toUpperCase() || null)}
                placeholder="ST"
                maxLength={2}
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
              />
              <p className="text-xs text-[#64748B] mt-1">Max 2 karaktera</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Primarna boja
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="h-10 w-12 rounded-lg border border-[#E2E8F0] cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => {
                    const val = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      updateField('primary_color', val)
                    }
                  }}
                  placeholder="#0F766E"
                  className="flex-1 rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                Pozadinska slika URL
              </label>
              <input
                type="url"
                value={settings.background_image_url || ''}
                onChange={(e) => updateField('background_image_url', e.target.value || null)}
                placeholder="https://..."
                className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
              />
              <p className="text-xs text-[#64748B] mt-1">Ostavite prazno za auto</p>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Section 2: Hero */}
      <AccordionSection
        title="Hero sekcija"
        icon={<FileText className="h-4 w-4 text-[#3B82F6]" />}
        isOpen={openSections.has('hero')}
        onToggle={() => toggleSection('hero')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Naslov
            </label>
            <input
              type="text"
              value={settings.headline}
              onChange={(e) => updateField('headline', e.target.value)}
              placeholder="Pronađite savršeno putovanje"
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Podnaslov
            </label>
            <textarea
              value={settings.subtitle}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="Recite nam šta tražite..."
              rows={2}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Tekst dugmeta
            </label>
            <input
              type="text"
              value={settings.cta_text}
              onChange={(e) => updateField('cta_text', e.target.value)}
              placeholder="Započni pretragu"
              maxLength={50}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>

          <div className="border-t border-[#E2E8F0] pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_specialization}
                onChange={(e) => updateField('show_specialization', e.target.checked)}
                className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
              />
              <span className="text-sm font-medium text-[#1E293B]">
                Prikaži specijalizaciju
              </span>
            </label>
            <p className="text-xs text-[#64748B] ml-7 mt-1">
              Badge iznad naslova (npr. "Specijalisti za Grčku")
            </p>

            {settings.show_specialization && (
              <div className="mt-3 ml-7 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                    Ikona
                  </label>
                  <select
                    value={settings.specialization_emoji || ''}
                    onChange={(e) => updateField('specialization_emoji', e.target.value || null)}
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all cursor-pointer"
                  >
                    {FLAG_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                    Tekst
                  </label>
                  <input
                    type="text"
                    value={settings.specialization_text || ''}
                    onChange={(e) => updateField('specialization_text', e.target.value || null)}
                    placeholder="Specijalisti za Grčku već 32g"
                    maxLength={100}
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* Section 3: Stats */}
      <AccordionSection
        title="Statistike"
        icon={<BarChart3 className="h-4 w-4 text-[#3B82F6]" />}
        isOpen={openSections.has('stats')}
        onToggle={() => toggleSection('stats')}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.show_stats}
              onChange={(e) => updateField('show_stats', e.target.checked)}
              className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
            />
            <span className="text-sm font-medium text-[#1E293B]">
              Prikaži statistike
            </span>
          </label>
          <p className="text-xs text-[#64748B] ml-7">
            Bela kartica sa brojevima
          </p>

          {settings.show_stats && (
            <div className="ml-7 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Broj putnika
                </label>
                <input
                  type="number"
                  value={settings.stat_travelers || ''}
                  onChange={(e) => updateField('stat_travelers', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="12000"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Godina iskustva
                </label>
                <input
                  type="number"
                  value={settings.stat_years || ''}
                  onChange={(e) => updateField('stat_years', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="32"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Prosečna ocena (0-5)
                </label>
                <input
                  type="number"
                  value={settings.stat_rating || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (e.target.value === '' || (val >= 0 && val <= 5)) {
                      updateField('stat_rating', e.target.value ? val : null)
                    }
                  }}
                  placeholder="4.9"
                  step="0.1"
                  min="0"
                  max="5"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Broj destinacija
                </label>
                <input
                  type="number"
                  value={settings.stat_destinations || ''}
                  onChange={(e) => updateField('stat_destinations', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="50"
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-[#94A3B8] ml-7">
            Ostavite prazno da sakrijete tu statistiku
          </p>
        </div>
      </AccordionSection>

      {/* Section 4: Trust Badges */}
      <AccordionSection
        title="Trust badges"
        icon={<Shield className="h-4 w-4 text-[#3B82F6]" />}
        isOpen={openSections.has('trust')}
        onToggle={() => toggleSection('trust')}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_yuta_member}
              onChange={(e) => updateField('is_yuta_member', e.target.checked)}
              className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
            />
            <div>
              <span className="text-sm font-medium text-[#1E293B]">YUTA član</span>
              <p className="text-xs text-[#64748B]">Prikazuje "YUTA garancija putovanja"</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.show_secure_booking}
              onChange={(e) => updateField('show_secure_booking', e.target.checked)}
              className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
            />
            <div>
              <span className="text-sm font-medium text-[#1E293B]">Sigurna rezervacija</span>
              <p className="text-xs text-[#64748B]">Prikazuje badge za sigurnost</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.show_installments}
              onChange={(e) => updateField('show_installments', e.target.checked)}
              className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]/20"
            />
            <div>
              <span className="text-sm font-medium text-[#1E293B]">Plaćanje na rate</span>
              <p className="text-xs text-[#64748B]">Prikazuje opciju plaćanja na rate</p>
            </div>
          </label>

          <div className="border-t border-[#E2E8F0] pt-4">
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Broj licence (OTP)
            </label>
            <input
              type="text"
              value={settings.license_number || ''}
              onChange={(e) => updateField('license_number', e.target.value || null)}
              placeholder="OTP 123/2024"
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
            <p className="text-xs text-[#64748B] mt-1">Prikazuje se u footeru</p>
          </div>
        </div>
      </AccordionSection>

      {/* Section 5: Footer */}
      <AccordionSection
        title="Footer"
        icon={<FileSignature className="h-4 w-4 text-[#3B82F6]" />}
        isOpen={openSections.has('footer')}
        onToggle={() => toggleSection('footer')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Pravni naziv
            </label>
            <input
              type="text"
              value={settings.legal_name || ''}
              onChange={(e) => updateField('legal_name', e.target.value || null)}
              placeholder="Naziv firme d.o.o."
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
            <p className="text-xs text-[#64748B] mt-1">Puno pravno ime firme</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
              Dodatni tekst u footeru
            </label>
            <input
              type="text"
              value={settings.footer_text || ''}
              onChange={(e) => updateField('footer_text', e.target.value || null)}
              placeholder="Npr. Licencirana turistička agencija od 2005."
              maxLength={200}
              className="block w-full rounded-[10px] border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  )
}
