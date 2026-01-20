'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, List } from 'lucide-react'
import { usePipeline } from '@/hooks/use-pipeline'
import { useOrganization } from '@/hooks/use-organization'
import { useLeads } from '@/hooks/use-leads'
import PipelineBoard from '@/components/pipeline/PipelineBoard'

export default function PipelinePage() {
  const router = useRouter()
  const { stages, leadsByStage, moveLeadToStage, loading, error, refresh } = usePipeline()
  const { teamMembers } = useOrganization()
  const { updateLead } = useLeads()

  const handleLeadClick = (leadId: string) => {
    router.push(`/dashboard/leads/${leadId}`)
  }

  const handleMoveLead = async (leadId: string, newStageId: string | null) => {
    await moveLeadToStage(leadId, newStageId)
  }

  const handleAssign = async (leadId: string, userId: string | null) => {
    await updateLead(leadId, { assigned_to: userId || null })
    await refresh() // Refresh pipeline data to show updated assignee
  }

  const allUserIds = teamMembers.map(m => m.id)

  // Calculate totals
  const totalLeads = Object.values(leadsByStage).flat().length
  const totalValue = Object.values(leadsByStage)
    .flat()
    .reduce((sum, lead) => sum + (lead.value || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">U obradi</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Prevucite klijente između faza da ažurirate njihov status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition-all"
          >
            <List className="mr-2 h-4 w-4" />
            Svi klijenti
          </Link>
          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center justify-center rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novi klijent
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && (
        <div className="flex items-center gap-6 rounded-[14px] bg-white p-4 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
              <Users className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1E293B]">{totalLeads}</p>
              <p className="text-xs text-[#64748B]">Ukupno klijenata</p>
            </div>
          </div>
          <div className="h-10 w-px bg-[#E2E8F0]" />
          <div>
            <p className="text-2xl font-bold text-[#10B981]">€{totalValue.toLocaleString()}</p>
            <p className="text-xs text-[#64748B]">Ukupna vrednost</p>
          </div>
          <div className="h-10 w-px bg-[#E2E8F0]" />
          <div>
            <p className="text-2xl font-bold text-[#1E293B]">{stages.length}</p>
            <p className="text-xs text-[#64748B]">Faza</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[14px] bg-[#FEF2F2] p-4 border border-[#EF4444]/20">
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* Pipeline Board */}
      {loading ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      ) : (
        <div className="rounded-[14px] bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
          <PipelineBoard
            stages={stages}
            leadsByStage={leadsByStage}
            onMoveLead={handleMoveLead}
            onLeadClick={handleLeadClick}
            teamMembers={teamMembers}
            onAssign={handleAssign}
            allUserIds={allUserIds}
          />
        </div>
      )}
    </div>
  )
}
