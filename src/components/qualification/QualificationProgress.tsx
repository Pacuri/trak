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
  dates: 'Datumi',
  accommodation_type: 'Smeštaj',
  board_type: 'Ishrana',
  transport_type: 'Prevoz',
  budget: 'Budžet',
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
          const isActive = step === currentStep
          const isPast = steps.indexOf(currentStep) > index

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
                {isPast ? '✓' : index + 1}
              </div>
              <span className="hidden sm:block">{STEP_LABELS[step]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
