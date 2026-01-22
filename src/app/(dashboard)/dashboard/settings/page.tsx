'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Save, Building2, Users, UserPlus, Globe, Settings, Link2, Copy, Check, Mail, MessageSquare, Plug, Bell, Volume2, VolumeX, X, Loader2, Clock, Send } from 'lucide-react'
import Link from 'next/link'
import type { LanguageRegion } from '@/lib/prompts/document-parse-prompt'

interface TeamInvitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
  invited_by: { full_name: string | null; email: string } | null
}

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
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true)
  const supabase = createClient()

  // Team invitation state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<{ url: string } | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([])

  // Load notification sound preference
  useEffect(() => {
    const stored = localStorage.getItem('notification_sound_enabled')
    if (stored !== null) {
      setNotificationSoundEnabled(stored === 'true')
    }
  }, [])

  // Load pending invitations
  useEffect(() => {
    async function loadInvitations() {
      if (!organization) return
      try {
        const response = await fetch('/api/team/invite')
        const data = await response.json()
        if (data.invitations) {
          setPendingInvitations(data.invitations.filter((inv: TeamInvitation) => inv.status === 'pending'))
        }
      } catch (err) {
        console.error('Failed to load invitations:', err)
      }
    }
    loadInvitations()
  }, [organization])

  const toggleNotificationSound = () => {
    const newValue = !notificationSoundEnabled
    setNotificationSoundEnabled(newValue)
    localStorage.setItem('notification_sound_enabled', String(newValue))
  }

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invitation')
        setInviting(false)
        return
      }

      setInviteSuccess({ url: data.invitation.invite_url })
      setInviteEmail('')
      // Refresh pending invitations
      const invResponse = await fetch('/api/team/invite')
      const invData = await invResponse.json()
      if (invData.invitations) {
        setPendingInvitations(invData.invitations.filter((inv: TeamInvitation) => inv.status === 'pending'))
      }
    } catch (err) {
      setInviteError('Greška pri slanju pozivnice')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/team/invite?id=${invitationId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      }
    } catch (err) {
      console.error('Failed to revoke invitation:', err)
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1E293B]">Podešavanja</h1>
        <p className="mt-1 text-sm text-[#64748B]">Upravljajte podešavanjima vaše organizacije</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Organization Section */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                  <Building2 className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E293B]">Organizacija</h2>
                  <p className="text-sm text-[#64748B]">Osnovni podaci o vašoj agenciji</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {saveError && (
                <div className="rounded-lg bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
                  <p className="text-sm font-medium text-[#EF4444]">{saveError}</p>
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-lg bg-[#ECFDF5] p-4 border border-[#10B981]/20">
                  <p className="text-sm font-medium text-[#10B981]">Podešavanja uspešno sačuvana!</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Naziv
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
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
                    className="block w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  >
                    <option value="">Izaberite industriju</option>
                    {industries.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="language_region" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                  Država poslovanja
                </label>
                <select
                  id="language_region"
                  value={languageRegion}
                  onChange={(e) => setLanguageRegion(e.target.value as LanguageRegion)}
                  className="block w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                >
                  {LANGUAGE_REGION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-[#64748B]">
                  Utiče na jezik AI pri uvozu dokumenata
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Čuvanje...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Sačuvaj
                  </>
                )}
              </button>
            </form>
          </section>

          {/* 2. Team Section */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3FF]">
                  <Users className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E293B]">Tim</h2>
                  <p className="text-sm text-[#64748B]">{teamMembers.length} članova</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 text-sm text-[#3B82F6] font-medium hover:text-[#2563EB] transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Pozovi člana
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="px-6 py-4 flex items-center justify-between"
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

              {/* Pending Invitations */}
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="px-6 py-4 flex items-center justify-between bg-[#FEF3C7]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7]">
                      <Clock className="h-5 w-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{invitation.email}</p>
                      <p className="text-xs text-[#64748B]">
                        Čeka prihvatanje • Ističe {new Date(invitation.expires_at).toLocaleDateString('sr-RS')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    className="p-2 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                    title="Poništi pozivnicu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Quick Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Integrations */}
            <Link
              href="/dashboard/integrations"
              className="group bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:border-[#3B82F6]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF3C7] flex-shrink-0">
                  <Plug className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6] transition-colors">Integracije</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Gmail, Meta, SMS</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#10B981]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    1 aktivna
                  </span>
                </div>
              </div>
            </Link>

            {/* Response Templates */}
            <Link
              href="/dashboard/settings/sabloni-odgovora"
              className="group bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:border-[#3B82F6]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0FDF4] flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6] transition-colors">Šabloni odgovora</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Email šabloni za upite</p>
                </div>
              </div>
            </Link>

            {/* Public Page */}
            <Link
              href="/dashboard/settings/public-page"
              className="group bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 hover:border-[#3B82F6]/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0FDFA] flex-shrink-0">
                  <Globe className="h-5 w-5 text-[#0D9488]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E293B] group-hover:text-[#3B82F6] transition-colors">Javna stranica</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Landing page i upiti</p>
                </div>
              </div>
            </Link>

            {/* Notifications - Inline toggle */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] flex-shrink-0">
                  <Bell className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E293B]">Obaveštenja</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Zvučna upozorenja</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={toggleNotificationSound}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        notificationSoundEnabled ? 'bg-[#3B82F6]' : 'bg-[#E2E8F0]'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          notificationSoundEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                      {notificationSoundEnabled ? (
                        <>
                          <Volume2 className="h-3 w-3" />
                          Uključeno
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-3 w-3" />
                          Isključeno
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Shareable Links */}
          <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]">
                  <Link2 className="h-5 w-5 text-[#64748B]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1E293B]">Linkovi za dijeljenje</h2>
                  <p className="text-sm text-[#64748B]">Za oglase i društvene mreže</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5 uppercase tracking-wider">
                  Landing stranica
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={landingUrl}
                    className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(landingUrl)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors"
                  >
                    {copiedUrl === landingUrl ? (
                      <Check className="h-4 w-4 text-[#10B981]" />
                    ) : (
                      <Copy className="h-4 w-4 text-[#64748B]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5 uppercase tracking-wider">
                  Katalog ponuda
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={ponudeUrl}
                    className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ponudeUrl)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-colors"
                  >
                    {copiedUrl === ponudeUrl ? (
                      <Check className="h-4 w-4 text-[#10B981]" />
                    ) : (
                      <Copy className="h-4 w-4 text-[#64748B]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => {
            setShowInviteModal(false)
            setInviteError(null)
            setInviteSuccess(null)
          }} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => {
                setShowInviteModal(false)
                setInviteError(null)
                setInviteSuccess(null)
              }}
              className="absolute top-4 right-4 p-1 text-[#64748B] hover:text-[#1E293B] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <UserPlus className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1E293B]">Pozovi člana tima</h3>
                <p className="text-sm text-[#64748B]">Pošaljite pozivnicu putem email linka</p>
              </div>
            </div>

            {inviteSuccess ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#ECFDF5] p-4 border border-[#10B981]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-[#10B981]" />
                    <p className="text-sm font-medium text-[#10B981]">Pozivnica je kreirana!</p>
                  </div>
                  <p className="text-xs text-[#64748B]">Podelite ovaj link sa osobom koju želite da pozovete:</p>
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteSuccess.url}
                    className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1E293B] bg-[#F8FAFC]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inviteSuccess.url)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] transition-all"
                  >
                    {copiedUrl === inviteSuccess.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setInviteSuccess(null)
                  }}
                  className="w-full mt-2 text-sm text-[#3B82F6] font-medium hover:underline"
                >
                  Pozovi još nekoga
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="rounded-lg bg-[#FEF2F2] p-3 border border-[#EF4444]/20">
                    <p className="text-sm text-[#EF4444]">{inviteError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="invite-email" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Email adresa
                  </label>
                  <input
                    type="email"
                    id="invite-email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="kolega@firma.com"
                    className="block w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="invite-role" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Uloga
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'agent')}
                    className="block w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] bg-white focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
                  >
                    <option value="agent">Agent - može raditi sa klijentima</option>
                    <option value="admin">Admin - pun pristup podešavanjima</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Šaljem...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Pošalji pozivnicu
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
