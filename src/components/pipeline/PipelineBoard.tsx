'use client'

import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import type { PipelineStage, Lead } from '@/types'
import PipelineColumn from './PipelineColumn'

interface PipelineBoardProps {
  stages: PipelineStage[]
  leadsByStage: Record<string, Lead[]>
  onMoveLead: (leadId: string, newStageId: string | null) => Promise<void>
  onLeadClick: (leadId: string) => void
}

export default function PipelineBoard({
  stages,
  leadsByStage,
  onMoveLead,
  onLeadClick,
}: PipelineBoardProps) {
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStageId = destination.droppableId === 'null' ? null : destination.droppableId

    await onMoveLead(draggableId, newStageId)
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
          />
        ))}
      </div>
    </DragDropContext>
  )
}
