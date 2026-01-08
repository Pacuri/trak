'use client'

import { useState } from 'react'
import { Plug, Check, ExternalLink, Facebook, Instagram, Globe, Mail, MessageSquare, Zap } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  iconBg: string
  iconColor: string
  connected: boolean
  comingSoon?: boolean
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Povezite vašu Facebook stranicu za automatski uvoz upita',
      icon: Facebook,
      iconBg: 'bg-[#1877F2]/10',
      iconColor: 'text-[#1877F2]',
      connected: false,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Uvozite poruke i komentare sa Instagram profila',
      icon: Instagram,
      iconBg: 'bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F77737]/10',
      iconColor: 'text-[#E1306C]',
      connected: false,
    },
    {
      id: 'website',
      name: 'Web forma',
      description: 'Integrisana forma za vaš sajt sa automatskim slanjem upita',
      icon: Globe,
      iconBg: 'bg-[#3B82F6]/10',
      iconColor: 'text-[#3B82F6]',
      connected: false,
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Automatski uvozite upite iz vaše email adrese',
      icon: Mail,
      iconBg: 'bg-[#EF4444]/10',
      iconColor: 'text-[#EF4444]',
      connected: false,
      comingSoon: true,
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
      description: 'Povežite Trak sa hiljadama drugih aplikacija',
      icon: Zap,
      iconBg: 'bg-[#FF4A00]/10',
      iconColor: 'text-[#FF4A00]',
      connected: false,
      comingSoon: true,
    },
  ])

  const handleConnect = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    )
  }

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <div className="space-y-6">
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
              {connectedCount} od {integrations.length}
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
                ) : integration.connected ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all"
                    >
                      Prekini vezu
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
