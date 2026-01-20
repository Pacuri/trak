'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Save, Building2, Users, UserPlus, Globe, Settings, MapPin, Link2, Copy, Check, Mail, MessageSquare, Plug } from 'lucide-react'
import Link from 'next/link'
import type { LanguageRegion } from '@/lib/prompts/document-parse-prompt'

const LANGUAGE_REGION_OPTIONS: { value: LanguageRegion; label: string }[] = [
  { value: 'ba', label: 'Bosna i Hercegovina' },
  { value: 'rs', label: 'Srbija' },
  { value: 'hr', label: 'Hrvatska' },
]

export default function SettingsPage() {
  const { organization, teamMembers, loading, refresh } = useOrganization()
  const [name, setName] = useState(organization?.name || '')
  const [industry, setIndustry] = useState(organization?.industry || '')
  const [languageRegion, setLanguageRegion] = useState<LanguageRegion>((organization?.language_region as LanguageRegion) || 'rs')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const supabase = createClient()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const landingUrl = organization?.slug ? `${baseUrl}/a/${organization.slug}` : ''
  const ponudeUrl = organization?.slug ? `${baseUrl}/a/${organization.slug}/ponude` : ''

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (organization) {
      setName(organization.name)
      setIndustry(organization.industry || '')
      setLanguageRegion((organization.language_region as LanguageRegion) || 'rs')
    }
  }, [organization])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name, industry: industry || null, language_region: languageRegion })
        .eq('id', organization.id)

      if (error) {
        setSaveError(error.message)
        return
      }

      setSaveSuccess(true)
      await refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError('Neuspešno čuvanje podešavanja')
    } finally {
      setSaving(false)
    }
  }

  const industries = [
    { value: 'travel', label: 'Turistička agencija' },
    { value: 'realestate', label: 'Nekretnine' },
    { value: 'salon', label: 'Salon lepote' },
    { value: 'healthcare', label: 'Zdravstvo' },
    { value: 'education', label: 'Edukacija' },
    { value: 'other', label: 'Ostalo' },
  ]

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-[#F5F3FF] text-[#8B5CF6] border-[#8B5CF6]/20'
      case 'admin':
        return 'bg-[#EFF6FF] text-[#3B82F6] border-[#3B82F6]/20'
      default:
        return 'bg-[#F1F5F9] text-[#64748B] border-[#64748B]/20'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Vlasnik'
      case 'admin':
        return 'Admin'
      default:
        return 'Član'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Podešavanja</h1>
        <p className="mt-1 text-sm text-[#64748B]">Upravljajte podešavanjima vaše organizacije</p>
      </div>

      {loading ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Organization Settings */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-3 p-5 border-b border-[#E2E8F0]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Building2 className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Organizacija</h2>
                <p className="text-sm text-[#64748B]">Osnovni podaci o vašoj organizaciji</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {saveError && (
                <div className="rounded-[10px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
                  <p className="text-sm font-medium text-[#EF4444]">{saveError}</p>
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-[10px] bg-[#ECFDF5] p-4 border border-[#10B981]/20">
                  <p className="text-sm font-medium text-[#10B981]">Podešavanja uspešno sačuvana!</p>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Naziv organizacije
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Industrija
                </label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  <option value="">Izaberite industriju</option>
                  {industries.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Regionalne postavke / Regional Settings */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-sm font-medium text-[#1E293B] mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#64748B]" />
                  Regionalne postavke
                </h3>
                <p className="text-xs text-[#64748B] mb-3">
                  Utiče na jezik AI pri uvozu dokumenata (nazivi polupansion, sobe, itd.)
                </p>
                <div>
                  <label htmlFor="language_region" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Država poslovanja
                  </label>
                  <select
                    id="language_region"
                    value={languageRegion}
                    onChange={(e) => setLanguageRegion(e.target.value as LanguageRegion)}
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  >
                    {LANGUAGE_REGION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Čuvanje...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Sačuvaj izmene
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Team Members */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3FF]">
                  <Users className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E293B]">Tim</h2>
                  <p className="text-sm text-[#64748B]">{teamMembers.length} članova</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
                  <p className="text-sm text-[#64748B]">Nema članova tima.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-[10px] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-semibold text-white">
                          {(member.full_name || member.email).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1E293B]">
                            {member.full_name || member.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-[#64748B]">{member.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${getRoleBadgeStyle(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <button
                  disabled
                  className="flex items-center gap-2 text-sm text-[#94A3B8] cursor-not-allowed"
                  title="Uskoro dostupno"
                >
                  <UserPlus className="h-4 w-4" />
                  Pozovi člana tima (uskoro)
                </button>
              </div>
            </div>
          </div>

          {/* Integracije Card */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7]">
                <Plug className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#1E293B]">Integracije</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Povežite email, SMS i druge servise
                </p>
                <Link href="/dashboard/settings/integracije">
                  <button className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all">
                    <Mail className="h-4 w-4" />
                    Upravljaj integracijama
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Šabloni odgovora Card */}
          <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FDF4]">
                <MessageSquare className="h-5 w-5 text-[#22C55E]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#1E293B]">Šabloni odgovora</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Prilagodite email šablone za odgovore na upite
                </p>
                <Link href="/dashboard/settings/sabloni-odgovora">
                  <button className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all">
                    <Settings className="h-4 w-4" />
                    Uredi šablone
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Public Page Settings Card */}
          <div className="lg:col-span-2 rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FDFA]">
                <Globe className="h-5 w-5 text-[#0D9488]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#1E293B]">Javna stranica</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Prilagodite izgled vaše landing stranice i podešavanja upita
                </p>
                <Link href="/dashboard/settings/public-page">
                  <button className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all">
                    <Settings className="h-4 w-4" />
                    Uredi javnu stranicu
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Shareable links */}
          <div className="lg:col-span-2 rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Link2 className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Linkovi za dijeljenje</h2>
                <p className="text-sm text-[#64748B]">
                  Koristite ove linkove u oglasima, na društvenim mrežama i u komunikaciji s klijentima.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Landinčna stranica (glavni link za oglase)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={landingUrl}
                    className="flex-1 rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(landingUrl)}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-all"
                  >
                    {copiedUrl === landingUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    {copiedUrl === landingUrl ? 'Kopirano' : 'Kopiraj'}
                  </button>
                </div>
                <p className="text-xs text-[#64748B] mt-1">/a/{organization?.slug || '…'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Sve ponude (katalog)
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={ponudeUrl}
                    className="flex-1 rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ponudeUrl)}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-all"
                  >
                    {copiedUrl === ponudeUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    {copiedUrl === ponudeUrl ? 'Kopirano' : 'Kopiraj'}
                  </button>
                </div>
                <p className="text-xs text-[#64748B] mt-1">/a/{organization?.slug || '…'}/ponude</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
