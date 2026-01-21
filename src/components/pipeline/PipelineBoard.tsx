'use client'

import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import type { PipelineStage, User } from '@/types'
import type { PipelineCardLead } from '@/hooks/use-pipeline'
import PipelineColumn from './PipelineColumn'

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
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStageId = destination.droppableId === 'null' ? null : destination.droppableId

    // Fire and forget - don't await
    onMoveLead(draggableId, newStageId)
  }

  return (
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
  )
}
