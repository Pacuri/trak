'use client'

import { useState, useCallback } from 'react'
import type { QualificationData, AccommodationType, BoardType, TransportType } from '@/types'

const STEPS = ['country', 'city', 'adults', 'children', 'dates_month', 'dates_duration', 'dates_flexibility', 'accommodation_type', 'board_type', 'transport_type', 'budget'] as const
export type QualificationStep = (typeof STEPS)[number]

// Helper to get dates sub-step index (0, 1, or 2)
export function getDatesSubStep(step: QualificationStep): number | null {
  if (step === 'dates_month') return 0
  if (step === 'dates_duration') return 1
  if (step === 'dates_flexibility') return 2
  return null
}

// Check if step is a dates sub-step
export function isDatesSubStep(step: QualificationStep): boolean {
  return step === 'dates_month' || step === 'dates_duration' || step === 'dates_flexibility'
}

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
  // Calculate progress: treat dates sub-steps as single step for progress bar
  // Steps: country(0), city(1), adults(2), children(3), dates_month(4), dates_duration(5), dates_flexibility(6), accommodation(7), board(8), transport(9), budget(10)
  // Effective: country(0), city(1), adults(2), children(3), dates(4), accommodation(5), board(6), transport(7), budget(8) = 9 steps
  let effectiveStepIndex = currentStepIndex
  if (currentStepIndex >= 4 && currentStepIndex <= 6) {
    // Dates sub-steps: map to step 4, with fractional progress
    effectiveStepIndex = 4 + (currentStepIndex - 4) / 3
  } else if (currentStepIndex > 6) {
    // After dates: subtract 2 (we had 3 steps, now it's 1)
    effectiveStepIndex = currentStepIndex - 2
  }
  const totalEffectiveSteps = 9 // Original 9 steps
  const progress = ((effectiveStepIndex + 1) / totalEffectiveSteps) * 100

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

  // Helper to get next dates sub-step
  const getNextDatesStep = useCallback((current: QualificationStep): QualificationStep | null => {
    if (current === 'dates_month') return 'dates_duration'
    if (current === 'dates_duration') return 'dates_flexibility'
    if (current === 'dates_flexibility') {
      // After dates_flexibility, go to accommodation_type
      const accommodationIndex = STEPS.indexOf('accommodation_type')
      return STEPS[accommodationIndex]
    }
    return null
  }, [])

  const prevStep = useCallback(() => {
    // Handle dates sub-steps specially
    if (currentStep === 'dates_duration') {
      setCurrentStep('dates_month')
      return
    }
    if (currentStep === 'dates_flexibility') {
      setCurrentStep('dates_duration')
      return
    }
    if (currentStep === 'accommodation_type') {
      // Going back from accommodation_type should go to dates_flexibility
      setCurrentStep('dates_flexibility')
      return
    }
    
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }, [currentStepIndex, currentStep])

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
      case 'dates_month':
        return true // Month can be null (Svejedno mi je) or a specific month
      case 'dates_duration':
        return data.dates.duration > 0
      case 'dates_flexibility':
        return true // Always can proceed (flexible is boolean, has default)
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
    getNextDatesStep,
    getDatesSubStep,
    isDatesSubStep,
  }
}
