'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/hooks/use-user'
import { useLandingSettings, type CombinedLandingSettings } from '@/hooks/use-landing-settings'
import { LandingSettingsForm, InquirySettingsForm, LandingPreview } from '@/components/admin'
import { DEFAULT_LANDING_SETTINGS } from '@/types/landing'
import { Save, ExternalLink, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function PublicPageSettingsPage() {
  const { organizationId, loading: userLoading } = useUser()
  const { settings, loading, saving, error, fetchSettings, saveSettings } = useLandingSettings()
  
  const [localSettings, setLocalSettings] = useState<CombinedLandingSettings | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const [agencyName, setAgencyName] = useState('Agencija')

  // Fetch settings on mount
  useEffect(() => {
    if (organizationId) {
      fetchSettings(organizationId).then((data) => {
        if (data) {
          setLocalSettings(data)
          setSlug(data.slug)
        }
      })
    }
  }, [organizationId, fetchSettings])

  // Fetch agency name from organization
  useEffect(() => {
    if (organizationId) {
      // Try to get agency name from booking settings or organization
      fetch(`/api/agencies/${organizationId}/landing-settings`)
        .then(res => res.json())
        .then(data => {
          if (data.landing?.legal_name) {
            setAgencyName(data.landing.legal_name)
          }
        })
        .catch(() => {})
    }
  }, [organizationId])

  // Handle landing settings change
  const handleLandingChange = useCallback((newLanding: typeof localSettings extends null ? never : NonNullable<typeof localSettings>['landing']) => {
    if (!localSettings) return
    setLocalSettings({
      ...localSettings,
      landing: newLanding,
    })
    setIsDirty(true)
    setSaveSuccess(false)
  }, [localSettings])

  // Handle inquiry settings change
  const handleInquiryChange = useCallback((newInquiry: typeof localSettings extends null ? never : NonNullable<typeof localSettings>['inquiry']) => {
    if (!localSettings) return
    setLocalSettings({
      ...localSettings,
      inquiry: newInquiry,
    })
    setIsDirty(true)
    setSaveSuccess(false)
  }, [localSettings])

  // Handle save
  const handleSave = async () => {
    if (!organizationId || !localSettings) return

    const success = await saveSettings(organizationId, {
      landing: localSettings.landing,
      inquiry: localSettings.inquiry,
    })

    if (success) {
      setIsDirty(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  // Loading state
  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#3B82F6] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Učitavanje podešavanja...</p>
        </div>
      </div>
    )
  }

  // No settings yet - create defaults
  if (!localSettings) {
    setLocalSettings({
      landing: {
        id: '',
        organization_id: organizationId || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...DEFAULT_LANDING_SETTINGS,
      },
      inquiry: {
        allow_custom_inquiries: true,
        show_inquiry_with_results: true,
        inquiry_response_text: 'Javićemo vam se u roku od 24 sata',
        inquiry_notification_email: null,
        inquiry_notification_phone: null,
      },
      slug: null,
    })
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Podešavanja javne stranice</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Prilagodite izgled vaše landing stranice i podešavanja upita
          </p>
        </div>
        <div className="flex items-center gap-3">
          {slug && (
            <a
              href={`/a/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#1E293B] hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Pogledaj stranicu
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#3B82F6] px-5 py-2 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-[10px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-[#EF4444]" />
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* Success message */}
      {saveSuccess && (
        <div className="rounded-[10px] bg-[#ECFDF5] p-4 border border-[#10B981]/20 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-[#10B981]" />
          <p className="text-sm font-medium text-[#10B981]">Izmene su sačuvane!</p>
        </div>
      )}

      {/* Dirty indicator */}
      {isDirty && !saving && (
        <div className="rounded-[10px] bg-[#FFF7ED] p-3 border border-[#F59E0B]/20 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          <p className="text-xs text-[#92400E]">Imate nesačuvane izmene</p>
        </div>
      )}

      {/* Two column layout - side by side */}
      <div className="flex gap-8">
        {/* Left column - Forms (scrollable) */}
        <div className="flex-1 min-w-0 space-y-6">
          <LandingSettingsForm
            settings={localSettings.landing}
            onChange={handleLandingChange}
          />
          <InquirySettingsForm
            settings={localSettings.inquiry}
            onChange={handleInquiryChange}
          />
        </div>

        {/* Right column - Preview (sticky, hidden on mobile) */}
        <div className="hidden lg:block w-[380px] flex-shrink-0">
          <div className="sticky top-24">
            <LandingPreview
              settings={localSettings.landing}
              agencyName={localSettings.landing.legal_name || agencyName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
