'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import { Mail, MessageSquare, Check, X, ExternalLink, RefreshCw, AlertCircle, Facebook, Instagram, Phone, CheckCircle2, Plug } from 'lucide-react'
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

interface MetaIntegration {
  id: string
  page_id: string
  page_name: string | null
  instagram_account_id: string | null
  instagram_username: string | null
  whatsapp_phone_number_id: string | null
  messenger_enabled: boolean
  instagram_enabled: boolean
  whatsapp_enabled: boolean
  is_active: boolean
  last_webhook_at: string | null
  connected_at: string
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const { organization } = useOrganization()
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null)
  const [metaIntegration, setMetaIntegration] = useState<MetaIntegration | null>(null)
  const [loading, setLoading] = useState(true)
  const [metaLoading, setMetaLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [metaConnecting, setMetaConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [metaDisconnecting, setMetaDisconnecting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const supabase = createClient()

  // Check for success/error from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'gmail_connected') {
      setNotification({ type: 'success', message: 'Gmail uspešno povezan!' })
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (success === 'meta_connected') {
      setNotification({ type: 'success', message: 'Meta Business Suite uspešno povezan!' })
      window.history.replaceState({}, '', '/dashboard/integrations')
      loadMetaIntegration()
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'OAuth autorizacija nije uspela',
        missing_params: 'Nedostaju parametri',
        invalid_state: 'Nevažeći state parametar',
        state_expired: 'Sesija je istekla, pokušajte ponovo',
        auth_mismatch: 'Greška pri autentifikaciji',
        no_email: 'Nije moguće dobiti email adresu',
        db_error: 'Greška pri čuvanju podataka',
        callback_failed: 'Callback nije uspeo',
        access_denied: 'Pristup odbijen',
        meta_oauth_failed: 'Meta OAuth autorizacija nije uspela',
        meta_no_pages: 'Nema povezanih Facebook stranica',
        meta_token_failed: 'Greška pri dobijanju pristupnog tokena',
      }
      setNotification({ type: 'error', message: errorMessages[error] || 'Došlo je do greške' })
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [searchParams])

  useEffect(() => {
    if (organization?.id) {
      loadEmailIntegration()
      loadMetaIntegration()
    }
  }, [organization?.id])

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

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

  const loadMetaIntegration = async () => {
    try {
      const response = await fetch('/api/integrations/meta')
      if (response.ok) {
        const data = await response.json()
        setMetaIntegration(data.integration || null)
      }
    } catch (err) {
      console.error('Error loading Meta integration:', err)
    }
    setMetaLoading(false)
  }

  const handleConnectGmail = () => {
    setConnecting(true)
    window.location.href = '/api/integrations/gmail/authorize'
  }

  const handleDisconnect = async () => {
    if (!emailIntegration || !confirm('Da li ste sigurni da želite da prekinete vezu sa email nalogom?')) {
      return
    }

    setDisconnecting(true)

    try {
      const response = await fetch('/api/integrations/gmail/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setEmailIntegration(null)
        setNotification({ type: 'success', message: 'Gmail veza je prekinuta' })
      } else {
        const data = await response.json()
        setNotification({ type: 'error', message: data.error || 'Greška pri prekidu veze' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Greška pri prekidu veze' })
    }
    setDisconnecting(false)
  }

  const handleConnectMeta = () => {
    setMetaConnecting(true)
    window.location.href = '/api/integrations/meta/auth'
  }

  const handleDisconnectMeta = async () => {
    if (!metaIntegration || !confirm('Da li ste sigurni da želite da prekinete vezu sa Meta nalogom?')) {
      return
    }

    setMetaDisconnecting(true)

    try {
      const response = await fetch('/api/integrations/meta', { method: 'DELETE' })
      if (response.ok) {
        setMetaIntegration(null)
        setNotification({ type: 'success', message: 'Meta veza je prekinuta' })
      } else {
        const data = await response.json()
        setNotification({ type: 'error', message: data.error || 'Greška pri prekidu veze' })
      }
    } catch (err) {
      console.error('Error disconnecting Meta:', err)
      setNotification({ type: 'error', message: 'Greška pri prekidu veze' })
    }
    setMetaDisconnecting(false)
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

  const connectedCount = (emailIntegration ? 1 : 0) + (metaIntegration ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center gap-3 rounded-[10px] p-4 ${
            notification.type === 'success'
              ? 'bg-[#10B981]/10 text-[#059669]'
              : 'bg-[#EF4444]/10 text-[#DC2626]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Integracije</h1>
        <p className="mt-1 text-sm text-[#64748B]">Povežite eksterne servise za automatski uvoz upita</p>
      </div>

      {/* Stats */}
      <div className="rounded-[14px] bg-white p-5 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3FF]">
            <Plug className="h-6 w-6 text-[#8B5CF6]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#64748B]">Aktivne integracije</p>
            <p className="text-2xl font-bold text-[#1E293B]">
              {loading || metaLoading ? '-' : connectedCount} od 2
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Meta Integration Card (Facebook Messenger, Instagram, WhatsApp) */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F3FF]">
                <Facebook className="h-6 w-6 text-[#1877F2]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Meta Business Suite</h2>
                <p className="text-sm text-[#64748B]">Facebook Messenger, Instagram DM, WhatsApp</p>
              </div>
            </div>
            {metaIntegration?.is_active && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-medium text-[#10B981]">
                <Check className="h-3.5 w-3.5" />
                Povezano
              </span>
            )}
          </div>

          <div className="p-5">
            {metaLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[#64748B]" />
              </div>
            ) : metaIntegration ? (
              <div className="space-y-4">
                {/* Connected account info */}
                <div className="rounded-[10px] bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
                  <div className="space-y-3">
                    {/* Facebook Page */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2]">
                        <Facebook className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1E293B]">{metaIntegration.page_name || 'Facebook Page'}</p>
                        <p className="text-xs text-[#64748B]">
                          Messenger {metaIntegration.messenger_enabled ? '✓' : '✗'}
                        </p>
                      </div>
                    </div>

                    {/* Instagram */}
                    {metaIntegration.instagram_account_id && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]">
                          <Instagram className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1E293B]">
                            @{metaIntegration.instagram_username || 'Instagram'}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Instagram DM {metaIntegration.instagram_enabled ? '✓' : '✗'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp */}
                    {metaIntegration.whatsapp_phone_number_id && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]">
                          <Phone className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1E293B]">WhatsApp Business</p>
                          <p className="text-xs text-[#64748B]">
                            WhatsApp {metaIntegration.whatsapp_enabled ? '✓' : '✗'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">
                    Povezano: {formatDate(metaIntegration.connected_at)}
                    {metaIntegration.last_webhook_at && (
                      <> • Poslednja poruka: {formatDate(metaIntegration.last_webhook_at)}</>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDisconnectMeta}
                    disabled={metaDisconnecting}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#EF4444]/20 bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#FEE2E2] transition-all disabled:opacity-50"
                  >
                    {metaDisconnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Prekini vezu
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B]">
                  Povežite vašu Facebook stranicu da biste primali i odgovarali na poruke iz Messenger-a, Instagram DM-a i WhatsApp-a.
                </p>

                <div className="rounded-[10px] bg-[#F0F9FF] p-4 border border-[#3B82F6]/20">
                  <h4 className="text-sm font-medium text-[#1E293B] mb-2">Šta dobijate povezivanjem:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Facebook className="h-4 w-4 text-[#1877F2]" />
                      Facebook Messenger poruke direktno u trak-u
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Instagram className="h-4 w-4 text-[#E4405F]" />
                      Instagram Direct poruke (ako je povezan)
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Phone className="h-4 w-4 text-[#25D366]" />
                      WhatsApp Business poruke (ako je konfigurisan)
                    </li>
                    <li className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Check className="h-4 w-4 text-[#10B981]" />
                      Automatsko kreiranje leadova iz poruka
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleConnectMeta}
                  disabled={metaConnecting}
                  className="inline-flex items-center gap-3 rounded-[10px] bg-[#1877F2] px-5 py-3 text-sm font-medium text-white hover:bg-[#166FE5] transition-all disabled:opacity-50"
                >
                  {metaConnecting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Facebook className="h-5 w-5" />
                  )}
                  Poveži Facebook stranicu
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Email Integration Card */}
        <div className="rounded-[14px] bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF3C7]">
                <Mail className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Gmail</h2>
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

      {/* Help Section */}
      <div className="rounded-[14px] bg-gradient-to-br from-[#3B82F6]/5 to-[#8B5CF6]/5 p-6 border border-[#E2E8F0]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
            <MessageSquare className="h-5 w-5 text-[#3B82F6]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1E293B] mb-1">Treba vam pomoć?</h3>
            <p className="text-sm text-[#64748B] mb-3">
              Naš tim je tu da vam pomogne sa podešavanjem integracija i odgovori na sva vaša pitanja.
            </p>
            <button className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors">
              Kontaktirajte podršku
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
