'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useQualification } from '@/hooks/use-qualification'
import QualificationProgress from '@/components/qualification/QualificationProgress'
import DestinationStep from '@/components/qualification/DestinationStep'
import GuestsStep from '@/components/qualification/GuestsStep'
import DatesStep from '@/components/qualification/DatesStep'
import AccommodationStep from '@/components/qualification/AccommodationStep'
import BudgetStep from '@/components/qualification/BudgetStep'

export default function QualifyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    currentStep,
    data,
    progress,
    steps,
    updateDestination,
    updateGuests,
    updateDates,
    updateAccommodation,
    updateBudget,
    nextStep,
    prevStep,
    canProceed,
    currentStepIndex,
    totalSteps,
  } = useQualification()

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Save qualification data to API
      const response = await fetch('/api/public/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          qualification: data,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit')

      const result = await response.json()

      // Store qualification in session storage for results page
      sessionStorage.setItem('qualification', JSON.stringify(data))
      sessionStorage.setItem('qualificationId', result.id || '')

      // Navigate to results
      router.push(`/a/${slug}/results`)
    } catch (error) {
      console.error('Qualification error:', error)
      // Still navigate to show cached/fallback results
      sessionStorage.setItem('qualification', JSON.stringify(data))
      router.push(`/a/${slug}/results`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStepIndex === totalSteps - 1) {
      handleSubmit()
    } else {
      nextStep()
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'destination':
        return (
          <DestinationStep
            value={data.destination}
            onChange={updateDestination}
          />
        )
      case 'guests':
        return (
          <GuestsStep
            value={data.guests}
            onChange={updateGuests}
          />
        )
      case 'dates':
        return (
          <DatesStep
            value={data.dates}
            onChange={updateDates}
          />
        )
      case 'accommodation':
        return (
          <AccommodationStep
            value={data.accommodation}
            onChange={updateAccommodation}
          />
        )
      case 'budget':
        return (
          <BudgetStep
            value={data.budget}
            guestCount={data.guests.adults + data.guests.children}
            onChange={updateBudget}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with progress */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <QualificationProgress
            currentStep={currentStep}
            progress={progress}
            steps={steps}
          />
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {renderStep()}
      </main>

      {/* Navigation footer */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          {currentStepIndex > 0 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Nazad
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Učitavanje...
              </>
            ) : currentStepIndex === totalSteps - 1 ? (
              <>
                Pronađi ponude
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Dalje
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}
