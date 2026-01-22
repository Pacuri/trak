'use client'

import { Check } from 'lucide-react'
import type { PipelineStage } from '@/types'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

interface StageHistory {
  stage_id: string
  entered_at: string
}

interface PipelineProgressProps {
  stages: PipelineStage[]
  currentStageId: string | null
  stageHistory?: StageHistory[]
  onStageClick?: (stageId: string) => void
}

export default function PipelineProgress({
  stages,
  currentStageId,
  stageHistory = [],
  onStageClick
}: PipelineProgressProps) {
  // Sort stages by position
  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  // Find current stage index
  const currentIndex = sortedStages.findIndex(s => s.id === currentStageId)

  // Calculate progress percentage
  const progressPercent = currentIndex >= 0
    ? ((currentIndex) / (sortedStages.length - 1)) * 100
    : 0

  // Get stage date from history
  const getStageDate = (stageId: string) => {
    const entry = stageHistory.find(h => h.stage_id === stageId)
    if (entry) {
      return format(new Date(entry.entered_at), 'd. MMM', { locale: sr })
    }
    return null
  }

  // Determine stage status
  const getStageStatus = (index: number) => {
    if (index < currentIndex) return 'completed'
    if (index === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="border-t border-gray-100">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between relative">
          {/* Background Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Active Progress Line */}
          <div
            className="absolute top-5 left-0 h-1 bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />

          {sortedStages.map((stage, index) => {
            const status = getStageStatus(index)
            const date = getStageDate(stage.id)

            return (
              <div
                key={stage.id}
                className="relative flex flex-col items-center z-10 cursor-pointer group"
                onClick={() => onStageClick?.(stage.id)}
              >
                {/* Stage Circle */}
                <div
                  className={`
                    flex items-center justify-center rounded-full shadow-md transition-all
                    ${status === 'completed'
                      ? 'w-10 h-10 bg-green-500 text-white'
                      : status === 'active'
                        ? 'w-12 h-12 bg-blue-500 text-white ring-4 ring-blue-100'
                        : 'w-10 h-10 bg-gray-200 text-gray-400 group-hover:bg-gray-300'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${status === 'completed'
                      ? 'text-green-600'
                      : status === 'active'
                        ? 'text-blue-600 font-semibold'
                        : 'text-gray-400'
                    }
                  `}
                >
                  {stage.name}
                </span>

                {/* Date or Status */}
                <span
                  className={`
                    text-[10px] whitespace-nowrap
                    ${status === 'active' ? 'text-blue-500' : 'text-gray-400'}
                  `}
                >
                  {status === 'active' ? 'Trenutno' : date || ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
