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

// Check if step is a dates sub-step
function isDatesSubStep(step: string): boolean {
  return step === 'dates_month' || step === 'dates_duration' || step === 'dates_flexibility'
}

// Get dates sub-step index (0, 1, or 2)
function getDatesSubStepIndex(step: string): number | null {
  if (step === 'dates_month') return 0
  if (step === 'dates_duration') return 1
  if (step === 'dates_flexibility') return 2
  return null
}

export default function QualificationProgress({
  currentStep,
  progress,
  steps,
}: QualificationProgressProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between text-xs">
        {steps.map((step, index) => {
          // Check if this is the dates step (any of the 3 sub-steps)
          const isDatesStep = isDatesSubStep(step)
          const isDatesActive = isDatesSubStep(currentStep)
          const currentDatesSubStep = getDatesSubStepIndex(currentStep)
          
          // Determine if dates step is past (all 3 sub-steps completed)
          const datesStepIndex = steps.findIndex(s => isDatesSubStep(s))
          const isDatesPast = datesStepIndex >= 0 && 
            steps.indexOf(currentStep) > datesStepIndex + 2 // Past all 3 sub-steps
          
          // Skip dates_duration and dates_flexibility in normal rendering
          if (step === 'dates_duration' || step === 'dates_flexibility') {
            return null
          }
          
          // Calculate display step number (adjust for dates sub-steps)
          let displayStepNumber = index + 1
          if (index > datesStepIndex && datesStepIndex >= 0) {
            // After dates step, subtract 2 (we had 3 steps, now showing as 1)
            displayStepNumber = index - 1
          }
          
          // For dates step, show expanded view when active
          if (isDatesStep && isDatesActive) {
            // Only render dates_month with expansion
            if (step === 'dates_month') {
              return (
                <div
                  key="dates_expanded"
                  className="flex flex-col items-center text-blue-600 font-medium transition-all duration-200"
                  style={{ width: 'auto', minWidth: '60px' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* Main step 5 circle */}
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                      5
                    </div>
                    {/* Sub-step dots */}
                    {[0, 1, 2].map((subIndex) => {
                      const isSubActive = currentDatesSubStep === subIndex
                      const isSubPast = currentDatesSubStep !== null && currentDatesSubStep > subIndex
                      
                      return (
                        <div
                          key={subIndex}
                          className={`
                            w-2 h-2 rounded-full transition-all duration-200
                            ${
                              isSubActive
                                ? 'bg-blue-600 w-3'
                                : isSubPast
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }
                          `}
                        />
                      )
                    })}
                  </div>
                  <span className="hidden sm:block">{STEP_LABELS[step]}</span>
                </div>
              )
            }
            return null
          }
          
          // If dates step is past, show collapsed with checkmark
          if (isDatesStep && isDatesPast) {
            // Only render dates_month
            if (step === 'dates_month') {
              return (
                <div
                  key={step}
                  className="flex flex-col items-center text-green-600"
                >
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs mb-1">
                    ✓
                  </div>
                  <span className="hidden sm:block">{STEP_LABELS[step]}</span>
                </div>
              )
            }
            return null
          }
          
          // Normal step rendering
          const isActive = step === currentStep
          const isPast = steps.indexOf(currentStep) > index || (isDatesPast && index > datesStepIndex)
          
          return (
            <div
              key={step}
              className={`flex flex-col items-center ${
                isActive
                  ? 'text-blue-600 font-medium'
                  : isPast
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isPast ? '✓' : displayStepNumber}
              </div>
              <span className="hidden sm:block">{STEP_LABELS[step]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
