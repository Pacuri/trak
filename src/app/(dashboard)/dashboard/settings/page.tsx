'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Save, Building2, Users, UserPlus } from 'lucide-react'

export default function SettingsPage() {
  const { organization, teamMembers, loading, refresh } = useOrganization()
  const [name, setName] = useState(organization?.name || '')
  const [industry, setIndustry] = useState(organization?.industry || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (organization) {
      setName(organization.name)
      setIndustry(organization.industry || '')
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
        .update({ name, industry: industry || null })
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
        </div>
      )}
    </div>
  )
}
