'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useQualification, isDatesSubStep } from '@/hooks/use-qualification'
import QualificationProgress from '@/components/qualification/QualificationProgress'
import CountryStep from '@/components/qualification/CountryStep'
import CityStep from '@/components/qualification/CityStep'
import AdultsStep from '@/components/qualification/AdultsStep'
import ChildrenStep from '@/components/qualification/ChildrenStep'
import ChildAgesStep from '@/components/qualification/ChildAgesStep'
import MonthStep from '@/components/qualification/MonthStep'
import DurationStep from '@/components/qualification/DurationStep'
import AccommodationTypeStep from '@/components/qualification/AccommodationTypeStep'
import BoardTypeStep from '@/components/qualification/BoardTypeStep'
import TransportTypeStep from '@/components/qualification/TransportTypeStep'
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
    updateCountry,
    updateCity,
    updateGuests,
    updateDates,
    updateAccommodationType,
    updateBoardType,
    updateTransportType,
    updateBudget,
    nextStep,
    prevStep,
    canProceed,
    currentStepIndex,
    totalSteps,
    autoAdvance,
    goToStep,
  } = useQualification()

  // Function to go directly to child_ages step (used when children > 0)
  const goToChildAges = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        goToStep('child_ages')
      }, 200)
    })
  }

  // Function to skip child_ages and go to dates_month (used when children = 0)
  const skipToMonth = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        goToStep('dates_month')
      }, 200)
    })
  }

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
      case 'country':
        return (
          <CountryStep
            value={data.destination.country}
            onChange={updateCountry}
            onNext={autoAdvance}
          />
        )
      case 'city':
        return (
          <CityStep
            country={data.destination.country}
            value={data.destination.city}
            onChange={updateCity}
            onNext={autoAdvance}
          />
        )
      case 'adults':
        return (
          <AdultsStep
            value={data.guests.adults}
            onChange={(adults) => updateGuests(adults, data.guests.children, data.guests.childAges)}
            onNext={autoAdvance}
          />
        )
      case 'children':
        return (
          <ChildrenStep
            value={data.guests.children}
            onChange={(children) => {
              // Initialize childAges array if needed
              const childAges = data.guests.childAges.length < children
                ? [...data.guests.childAges, ...Array(children - data.guests.childAges.length).fill(5)]
                : data.guests.childAges.slice(0, children)
              updateGuests(data.guests.adults, children, childAges)
            }}
            onNext={skipToMonth}
            onNextWithChildren={goToChildAges}
          />
        )
      case 'child_ages':
        return (
          <ChildAgesStep
            childCount={data.guests.children}
            value={data.guests.childAges}
            onChange={(childAges) => updateGuests(data.guests.adults, data.guests.children, childAges)}
            onNext={autoAdvance}
          />
        )
      case 'dates_month':
        return (
          <MonthStep
            value={data.dates}
            onChange={updateDates}
            onNext={autoAdvance}
            selectedCountry={data.destination.country}
          />
        )
      case 'dates_duration':
        return (
          <DurationStep
            value={data.dates}
            onChange={updateDates}
            onNext={autoAdvance}
          />
        )
      case 'accommodation_type':
        return (
          <AccommodationTypeStep
            value={data.accommodation.type}
            onChange={updateAccommodationType}
            onNext={autoAdvance}
          />
        )
      case 'board_type':
        return (
          <BoardTypeStep
            value={data.accommodation.board}
            onChange={updateBoardType}
            onNext={autoAdvance}
          />
        )
      case 'transport_type':
        return (
          <TransportTypeStep
            value={data.accommodation.transport}
            onChange={updateTransportType}
            onNext={autoAdvance}
          />
        )
      case 'budget':
        return (
          <BudgetStep
            value={data.budget}
            guestCount={data.guests.adults + data.guests.children}
            onChange={updateBudget}
            onNext={handleSubmit}
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

          {/* Hide "Dalje" button for dates sub-steps (auto-advance only) */}
          {!isDatesSubStep(currentStep) && (
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
          )}
        </div>
      </footer>
    </div>
  )
}
