'use client'

import { useRouter } from 'next/navigation'
import { usePipeline } from '@/hooks/use-pipeline'
import PipelineBoard from '@/components/pipeline/PipelineBoard'

export default function PipelinePage() {
  const router = useRouter()
  const { stages, leadsByStage, moveLeadToStage, loading, error } = usePipeline()

  const handleLeadClick = (leadId: string) => {
    router.push(`/dashboard/leads/${leadId}`)
  }

  const handleMoveLead = async (leadId: string, newStageId: string | null) => {
    await moveLeadToStage(leadId, newStageId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B]">Pipeline</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Drag and drop leads between stages to update their status.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] bg-[#FFFBEB] p-4 border border-[#F59E0B]/20">
          <p className="text-sm font-medium text-[#EF4444]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-[14px] bg-white p-12 text-center border border-[#E2E8F0] shadow-sm">
          <p className="text-[#64748B]">Loading pipeline...</p>
        </div>
      ) : (
        <div className="rounded-[14px] bg-white p-4 border border-[#E2E8F0] shadow-sm">
          <PipelineBoard
            stages={stages}
            leadsByStage={leadsByStage}
            onMoveLead={handleMoveLead}
            onLeadClick={handleLeadClick}
          />
        </div>
      )}
    </div>
  )
}
