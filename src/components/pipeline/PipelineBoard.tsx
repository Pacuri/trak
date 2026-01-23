'use client'

import { useState } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import type { PipelineStage, User } from '@/types'
import type { PipelineCardLead } from '@/hooks/use-pipeline'
import PipelineColumn from './PipelineColumn'
import { AlertTriangle, UserCheck, X } from 'lucide-react'

interface PipelineBoardProps {
  stages: PipelineStage[]
  leadsByStage: Record<string, PipelineCardLead[]>
  onMoveLead: (leadId: string, newStageId: string | null) => Promise<void>
  onLeadClick: (leadId: string) => void
  onReply?: (leadId: string) => void
  teamMembers?: User[]
  onAssign?: (leadId: string, userId: string | null) => void
  allUserIds?: string[]
}

interface PendingMove {
  leadId: string
  leadName: string
  newStageId: string | null
  stageName: string
}

export default function PipelineBoard({
  stages,
  leadsByStage,
  onMoveLead,
  onLeadClick,
  onReply,
  teamMembers = [],
  onAssign,
  allUserIds = [],
}: PipelineBoardProps) {
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStageId = destination.droppableId === 'null' ? null : destination.droppableId

    // Check if moving to a "won" stage (Zatvoreno)
    const targetStage = stages.find(s => s.id === newStageId)

    if (targetStage?.is_won) {
      // Find the lead name for the confirmation dialog
      let leadName = 'Ovaj klijent'
      for (const stageId in leadsByStage) {
        const lead = leadsByStage[stageId].find(l => l.id === draggableId)
        if (lead) {
          leadName = lead.name
          break
        }
      }

      // Show confirmation dialog instead of immediate move
      setPendingMove({
        leadId: draggableId,
        leadName,
        newStageId,
        stageName: targetStage.name
      })
      return
    }

    // Fire and forget - don't await
    onMoveLead(draggableId, newStageId)
  }

  const handleConfirmMove = async () => {
    if (!pendingMove) return

    setIsConfirming(true)
    try {
      await onMoveLead(pendingMove.leadId, pendingMove.newStageId)
    } finally {
      setIsConfirming(false)
      setPendingMove(null)
    }
  }

  const handleCancelMove = () => {
    setPendingMove(null)
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] || []}
              onLeadClick={onLeadClick}
              onReply={onReply}
              teamMembers={teamMembers}
              onAssign={onAssign}
              allUserIds={allUserIds}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Confirmation Dialog for converting lead to client */}
      {pendingMove && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleCancelMove}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Potvrdi konverziju u klijenta
                </h3>
                <p className="text-sm text-gray-500">
                  Premještanje u &quot;{pendingMove.stageName}&quot;
                </p>
              </div>
              <button
                onClick={handleCancelMove}
                className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Da li ste sigurni?</p>
                  <p>
                    <span className="font-semibold">{pendingMove.leadName}</span> će biti prebačen u fazu &quot;{pendingMove.stageName}&quot; i označen kao zatvoreni posao (klijent).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelMove}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Otkaži
              </button>
              <button
                onClick={handleConfirmMove}
                disabled={isConfirming}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Premještam...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Potvrdi
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
