'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Mail, MessageSquare, Check, X, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface EmailIntegration {
  id: string
  provider: string
  email_address: string
  display_name: string | null
  is_active: boolean
  connected_at: string
  last_used_at: string | null
  last_error: string | null
}

export default function IntegrationPage() {
  const { organization } = useOrganization()
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (organization?.id) {
      loadEmailIntegration()
    }
  }, [organization?.id])

  const loadEmailIntegration = async () => {
    if (!organization?.id) return

    const { data, error } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('organization_id', organization.id)
      .single()

    if (data && !error) {
      setEmailIntegration(data)
    }
    setLoading(false)
  }

  const handleConnectGmail = async () => {
    setConnecting(true)

    // In production, this would redirect to Google OAuth
    // For now, we'll show a placeholder
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId) {
      alert('Google OAuth nije konfigurisan. Kontaktirajte podršku.')
      setConnecting(false)
      return
    }

    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${organization?.id}`

    window.location.href = authUrl
  }

  const handleDisconnect = async () => {
    if (!emailIntegration || !confirm('Da li ste sigurni da želite da prekinete vezu sa email nalogom?')) {
      return
    }

    setDisconnecting(true)

    const { error } = await supabase
      .from('email_integrations')
      .delete()
      .eq('id', emailIntegration.id)

    if (!error) {
      setEmailIntegration(null)
    }
    setDisconnecting(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sr-Latn-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Integracije</h1>
        <p className="mt-1 text-sm text-[#64748B]">Povežite eksterne servise sa vašim trak nalogom</p>
      </div>

      <div className="grid gap-6">
        {/* Email Integration Card */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3C7]">
                <Mail className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Email</h2>
                <p className="text-sm text-[#64748B]">Šaljite odgovore na upite direktno iz trak-a</p>
              </div>
            </div>
            {emailIntegration?.is_active && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-medium text-[#10B981]">
                <Check className="h-3.5 w-3.5" />
                Povezano
              </span>
            )}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[#64748B]" />
              </div>
            ) : emailIntegration ? (
              <div className="space-y-4">
                {/* Connected account info */}
                <div className="rounded-[10px] bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{emailIntegration.email_address}</p>
                      {emailIntegration.display_name && (
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Prikazuje se kao: {emailIntegration.display_name}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">
                        Povezano: {formatDate(emailIntegration.connected_at)}
                      </p>
                      {emailIntegration.last_used_at && (
                        <p className="text-xs text-[#64748B]">
                          Poslednje korišćeno: {formatDate(emailIntegration.last_used_at)}
                        </p>
                      )}
                    </div>
                    <img
                      src="https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png"
                      alt="Gmail"
                      className="h-8 w-8 object-contain"
                    />
                  </div>

                  {emailIntegration.last_error && (
                    <div className="mt-3 flex items-start gap-2 rounded-[8px] bg-[#FEF2F2] p-3 border border-[#EF4444]/20">
                      <AlertCircle className="h-4 w-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-[#EF4444]">Greška pri slanju</p>
                        <p className="text-xs text-[#EF4444]/80">{emailIntegration.last_error}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#EF4444]/20 bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#FEE2E2] transition-all disabled:opacity-50"
                  >
                    {disconnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Prekini vezu
                  </button>
                  <Link
                    href="/dashboard/settings/sabloni-odgovora"
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Uredi šablone odgovora
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B]">
                  Povežite vaš Gmail nalog da biste mogli da šaljete odgovore na upite klijenata direktno iz aplikacije.
                </p>

                <div className="rounded-[10px] bg-[#F0F9FF] p-4 border border-[#3B82F6]/20">
                  <h4 className="text-sm font-medium text-[#1E293B] mb-2">Šta dobijate povezivanjem:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check className="h-4 w-4 text-[#10B981]" />
                      Slanje odgovora na upite jednim klikom
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check className="h-4 w-4 text-[#10B981]" />
                      Korišćenje prilagodljivih šablona
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check className="h-4 w-4 text-[#10B981]" />
                      Praćenje poslatih odgovora
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check className="h-4 w-4 text-[#10B981]" />
                      Email se šalje sa vašeg naloga
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleConnectGmail}
                  disabled={connecting}
                  className="inline-flex items-center gap-3 rounded-[10px] bg-white border-2 border-[#E2E8F0] px-5 py-3 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all disabled:opacity-50"
                >
                  {connecting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <img
                      src="https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png"
                      alt="Gmail"
                      className="h-5 w-5 object-contain"
                    />
                  )}
                  Poveži Gmail nalog
                  <ExternalLink className="h-4 w-4 text-[#64748B]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SMS Integration Card (Coming Soon) */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm opacity-60">
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FDF4]">
                <MessageSquare className="h-6 w-6 text-[#22C55E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">SMS</h2>
                <p className="text-sm text-[#64748B]">Šaljite SMS poruke klijentima</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-medium text-[#64748B]">
              Uskoro
            </span>
          </div>

          <div className="p-5">
            <p className="text-sm text-[#64748B]">
              SMS integracija će biti dostupna uskoro. Moći ćete da šaljete brze poruke klijentima direktno na njihov telefon.
            </p>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="pt-4">
        <Link
          href="/dashboard/settings"
          className="text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
        >
          ← Nazad na podešavanja
        </Link>
      </div>
    </div>
  )
}
