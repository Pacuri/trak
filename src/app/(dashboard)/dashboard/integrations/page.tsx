'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plug, Check, ExternalLink, Facebook, Instagram, Globe, Mail, MessageSquare, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  iconBg: string
  iconColor: string
  connected: boolean
  connectedEmail?: string
  comingSoon?: boolean
  oauthUrl?: string
}

interface EmailIntegration {
  id: string
  email_address: string
  display_name: string
  provider: string
  is_active: boolean
  connected_at: string
  last_used_at: string | null
  last_error: string | null
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [emailIntegration, setEmailIntegration] = useState<EmailIntegration | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Check for success/error from OAuth callback
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'gmail_connected') {
      setNotification({ type: 'success', message: 'Gmail uspešno povezan!' })
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/integrations')
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
      }
      setNotification({ type: 'error', message: errorMessages[error] || 'Došlo je do greške' })
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [searchParams])

  // Fetch email integration status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/integrations/gmail/status')
        if (response.ok) {
          const data = await response.json()
          setEmailIntegration(data.integration)
        }
      } catch (error) {
        console.error('Error fetching integration status:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleGmailConnect = () => {
    window.location.href = '/api/integrations/gmail/authorize'
  }

  const handleGmailDisconnect = async () => {
    if (!confirm('Da li ste sigurni da želite da prekinete vezu sa Gmail-om?')) {
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
    } finally {
      setDisconnecting(false)
    }
  }

  const integrations: Integration[] = [
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Povezite vašu Facebook stranicu za automatski uvoz upita',
      icon: Facebook,
      iconBg: 'bg-[#1877F2]/10',
      iconColor: 'text-[#1877F2]',
      connected: false,
      comingSoon: true,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Uvozite poruke i komentare sa Instagram profila',
      icon: Instagram,
      iconBg: 'bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F77737]/10',
      iconColor: 'text-[#E1306C]',
      connected: false,
      comingSoon: true,
    },
    {
      id: 'website',
      name: 'Web forma',
      description: 'Integrisana forma za vaš sajt sa automatskim slanjem upita',
      icon: Globe,
      iconBg: 'bg-[#3B82F6]/10',
      iconColor: 'text-[#3B82F6]',
      connected: true, // Always connected - it's built into trak
    },
    {
      id: 'email',
      name: 'Gmail',
      description: emailIntegration
        ? `Povezano: ${emailIntegration.email_address}`
        : 'Povežite Gmail za slanje odgovora na upite klijentima',
      icon: Mail,
      iconBg: 'bg-[#EA4335]/10',
      iconColor: 'text-[#EA4335]',
      connected: !!emailIntegration,
      connectedEmail: emailIntegration?.email_address,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Povežite WhatsApp Business nalog za praćenje poruka',
      icon: MessageSquare,
      iconBg: 'bg-[#25D366]/10',
      iconColor: 'text-[#25D366]',
      connected: false,
      comingSoon: true,
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Povežite trak sa hiljadama drugih aplikacija',
      icon: Zap,
      iconBg: 'bg-[#FF4A00]/10',
      iconColor: 'text-[#FF4A00]',
      connected: false,
      comingSoon: true,
    },
  ]

  const connectedCount = integrations.filter((i) => i.connected).length

  const handleConnect = (integrationId: string) => {
    if (integrationId === 'email') {
      if (emailIntegration) {
        handleGmailDisconnect()
      } else {
        handleGmailConnect()
      }
    }
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Integracije</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Povežite eksterne servise za automatski uvoz upita
          </p>
        </div>
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
              {loading ? '-' : connectedCount} od {integrations.length}
            </p>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon
          return (
            <div
              key={integration.id}
              className={`rounded-[14px] bg-white border shadow-sm overflow-hidden transition-all ${
                integration.connected
                  ? 'border-[#10B981] ring-1 ring-[#10B981]/20'
                  : 'border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-md'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${integration.iconBg}`}>
                    <Icon className={`h-6 w-6 ${integration.iconColor}`} />
                  </div>
                  {integration.connected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981]">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {integration.comingSoon && (
                    <span className="inline-flex items-center rounded-full bg-[#F5F3FF] px-2.5 py-1 text-xs font-medium text-[#8B5CF6]">
                      Uskoro
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-[#1E293B] mb-1">{integration.name}</h3>
                <p className="text-sm text-[#64748B] mb-4">{integration.description}</p>

                {integration.comingSoon ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#F1F5F9] px-4 py-2.5 text-sm font-medium text-[#94A3B8] cursor-not-allowed"
                  >
                    Uskoro dostupno
                  </button>
                ) : integration.id === 'website' ? (
                  // Website integration is always connected
                  <div className="flex gap-2">
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#10B981]/10 px-4 py-2.5 text-sm font-medium text-[#059669] cursor-default"
                    >
                      <Check className="h-4 w-4" />
                      Uključeno
                    </button>
                    <button className="flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ) : integration.connected ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={disconnecting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all disabled:opacity-50"
                    >
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Prekini vezu'
                      )}
                    </button>
                    <button className="flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2.5 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
                  >
                    <Plug className="h-4 w-4" />
                    Poveži
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Gmail Setup Info */}
      {!emailIntegration && !loading && (
        <div className="rounded-[14px] bg-gradient-to-br from-[#EA4335]/5 to-[#FBBC04]/5 p-6 border border-[#E2E8F0]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EA4335]/10">
              <Mail className="h-5 w-5 text-[#EA4335]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1E293B] mb-1">Povežite Gmail za slanje odgovora</h3>
              <p className="text-sm text-[#64748B] mb-3">
                Kada povežete Gmail, moći ćete da šaljete odgovore klijentima direktno iz trak-a.
                Email-ovi će biti poslati sa vaše Gmail adrese.
              </p>
              <ul className="text-sm text-[#64748B] space-y-1 mb-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Šaljite odgovore jednim klikom
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Koristite predefinisane šablone
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Pratite istoriju komunikacije
                </li>
              </ul>
              <button
                onClick={handleGmailConnect}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#EA4335] hover:text-[#C5221F] transition-colors"
              >
                <Plug className="h-4 w-4" />
                Poveži Gmail nalog
              </button>
            </div>
          </div>
        </div>
      )}

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
