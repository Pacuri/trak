'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import type { Lead, PipelineStage } from '@/types'
import PipelineCard from './PipelineCard'

interface PipelineColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onLeadClick: (leadId: string) => void
}

export default function PipelineColumn({ stage, leads, onLeadClick }: PipelineColumnProps) {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-50 rounded-[14px] p-4 border border-[#E2E8F0]">
        {/* Column Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-[#1E293B]">{stage.name}</h2>
            <span className="text-sm text-[#64748B] bg-white px-2.5 py-1 rounded-full border border-[#E2E8F0]">
              {leads.length}
            </span>
          </div>
          {totalValue > 0 && (
            <p className="text-sm font-medium text-[#1E293B]">${totalValue.toLocaleString()}</p>
          )}
        </div>

        {/* Droppable Area */}
        <Droppable droppableId={stage.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[200px] space-y-3 transition-colors ${
                snapshot.isDraggingOver ? 'bg-[#EFF6FF] rounded-[10px] p-2' : ''
              }`}
            >
              {leads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <PipelineCard
                        lead={lead}
                        onClick={() => onLeadClick(lead.id)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {leads.length === 0 && (
                <div className="text-center py-8 text-sm text-[#94A3B8]">
                  No leads
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}
