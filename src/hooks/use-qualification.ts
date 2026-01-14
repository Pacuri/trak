'use client'

import { useState, useCallback } from 'react'
import type { QualificationData, AccommodationType, BoardType, TransportType } from '@/types'

const STEPS = ['country', 'city', 'adults', 'children', 'dates', 'accommodation_type', 'board_type', 'transport_type', 'budget'] as const
export type QualificationStep = (typeof STEPS)[number]

const INITIAL_DATA: QualificationData = {
  destination: {
    country: '',
    city: null,
  },
  guests: {
    adults: 1, // Minimum required, but user must select
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
    type: null as AccommodationType | null,
    board: null as BoardType | null,
    transport: null as TransportType | null,
  },
  budget: {
    min: null,
    max: null,
    perPerson: true,
  },
}

export function useQualification() {
  const [currentStep, setCurrentStep] = useState<QualificationStep>('country')
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

  const updateCountry = useCallback((country: string) => {
    setData((prev) => ({
      ...prev,
      destination: { ...prev.destination, country },
    }))
  }, [])

  const updateCity = useCallback((city: string | null) => {
    setData((prev) => ({
      ...prev,
      destination: { ...prev.destination, city },
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

  const updateAccommodationType = useCallback((type: AccommodationType) => {
    setData((prev) => ({
      ...prev,
      accommodation: { ...prev.accommodation, type },
    }))
  }, [])

  const updateBoardType = useCallback((board: BoardType) => {
    setData((prev) => ({
      ...prev,
      accommodation: { ...prev.accommodation, board },
    }))
  }, [])

  const updateTransportType = useCallback((transport: TransportType) => {
    setData((prev) => ({
      ...prev,
      accommodation: { ...prev.accommodation, transport },
    }))
  }, [])

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
    setCurrentStep('country')
    setIsComplete(false)
  }, [])

  // Auto-advance helper - call nextStep after a short delay to allow state update
  const autoAdvance = useCallback(() => {
    // Use requestAnimationFrame to ensure state updates are processed first
    requestAnimationFrame(() => {
      setTimeout(() => {
        nextStep()
      }, 200) // Small delay for better UX
    })
  }, [nextStep])

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'country':
        return data.destination.country.length > 0
      case 'city':
        return true // City is optional, can proceed with or without
      case 'adults':
        return data.guests.adults >= 1
      case 'children':
        return true // Children can be 0
      case 'dates':
        return data.dates.month !== null || data.dates.exactStart !== null
      case 'accommodation_type':
        return data.accommodation.type !== null
      case 'board_type':
        return data.accommodation.board !== null
      case 'transport_type':
        return data.accommodation.transport !== null
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
    updateCountry,
    updateCity,
    updateGuests,
    updateDates,
    updateAccommodation,
    updateAccommodationType,
    updateBoardType,
    updateTransportType,
    updateBudget,
    nextStep,
    prevStep,
    goToStep,
    reset,
    canProceed,
    autoAdvance,
  }
}
