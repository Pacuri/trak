'use client'

import { Droppable, Draggable } from '@hello-pangea/dnd'
import type { Lead, PipelineStage, User } from '@/types'
import PipelineCard from './PipelineCard'

interface PipelineColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onLeadClick: (leadId: string) => void
  teamMembers?: User[]
  onAssign?: (leadId: string, userId: string | null) => void
  allUserIds?: string[]
}

// Get stage color for top border
function getStageColor(stageName: string): string {
  switch (stageName.toLowerCase()) {
    case 'novi':
    case 'new':
      return '#3B82F6' // blue
    case 'kontaktiran':
    case 'contacted':
      return '#8B5CF6' // purple
    case 'ponuda':
    case 'proposal':
      return '#F97316' // orange
    case 'pregovaranje':
    case 'negotiation':
      return '#EC4899' // pink
    case 'zatvoreno':
    case 'won':
    case 'closed':
      return '#10B981' // green
    case 'izgubljeno':
    case 'lost':
      return '#EF4444' // red
    default:
      return '#64748B' // gray
  }
}

export default function PipelineColumn({ stage, leads, onLeadClick, teamMembers = [], onAssign, allUserIds = [] }: PipelineColumnProps) {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
  const stageColor = getStageColor(stage.name)

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-[#F8FAFC] rounded-[14px] border border-[#E2E8F0] overflow-hidden">
        {/* Colored top border */}
        <div className="h-1" style={{ backgroundColor: stageColor }} />

        {/* Column Header */}
        <div className="p-4 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-[#1E293B]">{stage.name}</h2>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: `${stageColor}15`,
                color: stageColor
              }}
            >
              {leads.length}
            </span>
          </div>
          {totalValue > 0 && (
            <p className="text-sm font-semibold text-[#10B981]">€{totalValue.toLocaleString()}</p>
          )}
        </div>

        {/* Droppable Area */}
        <Droppable droppableId={stage.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[300px] p-3 space-y-3 transition-colors ${
                snapshot.isDraggingOver ? 'bg-[#EFF6FF]' : ''
              }`}
            >
              {leads.map((lead, index) => (
                <Draggable key={String(lead.id)} draggableId={String(lead.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? 'rotate-2 scale-105' : ''}
                      style={{
                        ...provided.draggableProps.style,
                        // Reset transform when not dragging
                        transform: snapshot.isDragging 
                          ? provided.draggableProps.style?.transform 
                          : 'none',
                        transition: snapshot.isDragging 
                          ? provided.draggableProps.style?.transition 
                          : 'none',
                      }}
                    >
                        <PipelineCard
                          lead={lead}
                          onClick={() => onLeadClick(lead.id)}
                          teamMembers={teamMembers}
                          onAssign={onAssign}
                          allUserIds={allUserIds}
                        />
                      </div>
                    )}
                </Draggable>
              ))}
              {provided.placeholder}
              {leads.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[#94A3B8]">Nema upita</p>
                  <p className="text-xs text-[#CBD5E1] mt-1">Prevucite upit ovde</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}
