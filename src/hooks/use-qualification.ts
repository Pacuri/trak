'use client'

import { useState, useCallback } from 'react'
import type { QualificationData, AccommodationType, BoardType, TransportType } from '@/types'

const STEPS = ['destination', 'guests', 'dates', 'accommodation', 'budget'] as const
export type QualificationStep = (typeof STEPS)[number]

const INITIAL_DATA: QualificationData = {
  destination: {
    country: '',
    city: null,
  },
  guests: {
    adults: 2,
    children: 0,
    childAges: [],
  },
  dates: {
    month: null,
    exactStart: null,
    exactEnd: null,
    duration: 7,
    flexible: true,
  },
  accommodation: {
    type: 'any' as AccommodationType,
    board: 'any' as BoardType,
    transport: 'bus' as TransportType,
  },
  budget: {
    min: null,
    max: null,
    perPerson: true,
  },
}

export function useQualification() {
  const [currentStep, setCurrentStep] = useState<QualificationStep>('destination')
  const [data, setData] = useState<QualificationData>(INITIAL_DATA)
  const [isComplete, setIsComplete] = useState(false)

  const currentStepIndex = STEPS.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const updateData = useCallback((updates: Partial<QualificationData>) => {
    setData((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  const updateDestination = useCallback((country: string, city?: string | null) => {
    setData((prev) => ({
      ...prev,
      destination: { country, city: city || null },
    }))
  }, [])

  const updateGuests = useCallback((adults: number, children: number, childAges?: number[]) => {
    setData((prev) => ({
      ...prev,
      guests: { adults, children, childAges: childAges || [] },
    }))
  }, [])

  const updateDates = useCallback(
    (dates: Partial<QualificationData['dates']>) => {
      setData((prev) => ({
        ...prev,
        dates: { ...prev.dates, ...dates },
      }))
    },
    []
  )

  const updateAccommodation = useCallback(
    (accommodation: Partial<QualificationData['accommodation']>) => {
      setData((prev) => ({
        ...prev,
        accommodation: { ...prev.accommodation, ...accommodation },
      }))
    },
    []
  )

  const updateBudget = useCallback(
    (budget: Partial<QualificationData['budget']>) => {
      setData((prev) => ({
        ...prev,
        budget: { ...prev.budget, ...budget },
      }))
    },
    []
  )

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    } else {
      setIsComplete(true)
    }
  }, [currentStepIndex])

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }, [currentStepIndex])

  const goToStep = useCallback((step: QualificationStep) => {
    setCurrentStep(step)
  }, [])

  const reset = useCallback(() => {
    setData(INITIAL_DATA)
    setCurrentStep('destination')
    setIsComplete(false)
  }, [])

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'destination':
        return data.destination.country.length > 0
      case 'guests':
        return data.guests.adults >= 1
      case 'dates':
        return data.dates.month !== null || data.dates.exactStart !== null
      case 'accommodation':
        return true // All have defaults
      case 'budget':
        return true // Optional
      default:
        return false
    }
  }, [currentStep, data])

  return {
    // State
    currentStep,
    data,
    progress,
    isComplete,
    steps: STEPS,
    currentStepIndex,
    totalSteps: STEPS.length,

    // Actions
    updateData,
    updateDestination,
    updateGuests,
    updateDates,
    updateAccommodation,
    updateBudget,
    nextStep,
    prevStep,
    goToStep,
    reset,
    canProceed,
  }
}
