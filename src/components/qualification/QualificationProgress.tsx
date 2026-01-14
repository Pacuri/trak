'use client'

import type { QualificationStep } from '@/hooks/use-qualification'

interface QualificationProgressProps {
  currentStep: QualificationStep
  progress: number
  steps: readonly QualificationStep[]
}

const STEP_LABELS: Record<string, string> = {
  country: 'Država',
  city: 'Grad',
  adults: 'Odrasli',
  children: 'Deca',
  dates_month: 'Datumi',
  dates_duration: 'Datumi',
  dates_flexibility: 'Datumi',
  accommodation_type: 'Smeštaj',
  board_type: 'Ishrana',
  transport_type: 'Prevoz',
  budget: 'Budžet',
}

// Map raw steps to display steps (collapsing dates sub-steps into one)
const DISPLAY_STEPS = ['country', 'city', 'adults', 'children', 'dates', 'accommodation_type', 'board_type', 'transport_type', 'budget'] as const

// Check if step is a dates sub-step
function isDatesSubStep(step: string): boolean {
  return step === 'dates_month' || step === 'dates_duration' || step === 'dates_flexibility'
}

// Get dates sub-step index (0, 1, or 2)
function getDatesSubStepIndex(step: string): number {
  if (step === 'dates_month') return 0
  if (step === 'dates_duration') return 1
  if (step === 'dates_flexibility') return 2
  return -1
}

// Get the display step index for a given raw step
function getDisplayStepIndex(step: string, steps: readonly string[]): number {
  if (isDatesSubStep(step)) return 4 // 'dates' is at index 4 in DISPLAY_STEPS
  
  const rawIndex = steps.indexOf(step)
  if (rawIndex <= 3) return rawIndex // country, city, adults, children
  if (rawIndex >= 7) return rawIndex - 2 // accommodation_type onwards (subtract 2 for collapsed dates)
  return 4 // dates
}

export default function QualificationProgress({
  currentStep,
  progress,
  steps,
}: QualificationProgressProps) {
  const currentDisplayIndex = getDisplayStepIndex(currentStep, steps)
  const isDatesActive = isDatesSubStep(currentStep)
  const currentDatesSubStep = getDatesSubStepIndex(currentStep)
  
  // Calculate which 3 display steps to show (sliding window)
  let windowStart: number
  if (currentDisplayIndex <= 1) {
    windowStart = 0
  } else if (currentDisplayIndex >= DISPLAY_STEPS.length - 2) {
    windowStart = DISPLAY_STEPS.length - 3
  } else {
    windowStart = currentDisplayIndex - 1
  }
  
  const visibleDisplaySteps = DISPLAY_STEPS.slice(windowStart, windowStart + 3)

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators - sliding window of 3 */}
      <div className="flex justify-center gap-6 text-xs">
        {visibleDisplaySteps.map((displayStep, idx) => {
          const displayIndex = windowStart + idx
          const displayNumber = displayIndex + 1
          const isActive = displayIndex === currentDisplayIndex
          // Fix: Only mark as past if currentDisplayIndex is GREATER than this step
          const isPast = currentDisplayIndex > displayIndex
          
          // Special handling for dates step with sub-steps
          if (displayStep === 'dates' && (isActive || (isDatesActive && displayIndex === 4))) {
            return (
              <div
                key={displayStep}
                className="flex flex-col items-center text-blue-600 font-medium transition-all duration-200"
                style={{ minWidth: isDatesActive ? '80px' : 'auto' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {/* Main step circle */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isPast ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {isPast ? '✓' : displayNumber}
                  </div>
                  {/* Sub-step dots - only show when dates is active */}
                  {isDatesActive && [0, 1, 2].map((subIndex) => {
                    const isSubActive = currentDatesSubStep === subIndex
                    const isSubPast = currentDatesSubStep > subIndex
                    
                    return (
                      <div
                        key={subIndex}
                        className={`
                          rounded-full transition-all duration-200
                          ${
                            isSubActive
                              ? 'w-3 h-3 bg-blue-600'
                              : isSubPast
                              ? 'w-2 h-2 bg-green-500'
                              : 'w-2 h-2 bg-gray-300'
                          }
                        `}
                      />
                    )
                  })}
                </div>
                <span className="text-center">{STEP_LABELS['dates_month']}</span>
              </div>
            )
          }
          
          // Normal step rendering
          return (
            <div
              key={displayStep}
              className={`flex flex-col items-center transition-all duration-200 ${
                isActive
                  ? 'text-blue-600 font-medium'
                  : isPast
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isPast ? '✓' : displayNumber}
              </div>
              <span className="text-center">{STEP_LABELS[displayStep]}</span>
            </div>
          )
        })}
      </div>
      
      {/* Step counter */}
      <div className="text-center text-xs text-gray-400 mt-3">
        Korak {currentDisplayIndex + 1} od {DISPLAY_STEPS.length}
      </div>
    </div>
  )
}
