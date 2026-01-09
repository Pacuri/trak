'use client'

import { useState } from 'react'
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
  const [renderKey, setRenderKey] = useState(0)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { draggableId, destination } = result
    const newStageId = destination.droppableId === 'null' ? null : destination.droppableId

    // Fire and forget - don't await
    onMoveLead(draggableId, newStageId)
    
    // Force re-render to ensure visual update
    setRenderKey(prev => prev + 1)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd} key={renderKey}>
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
