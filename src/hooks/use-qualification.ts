'use client'

import { useState, useCallback } from 'react'
import type { QualificationData, AccommodationType, BoardType, TransportType } from '@/types'

const STEPS = ['country', 'city', 'adults', 'children', 'child_ages', 'dates_month', 'dates_duration', 'accommodation_type', 'board_type', 'transport_type', 'budget'] as const
export type QualificationStep = (typeof STEPS)[number]

// Helper to get dates sub-step index (0 or 1)
export function getDatesSubStep(step: QualificationStep): number | null {
  if (step === 'dates_month') return 0
  if (step === 'dates_duration') return 1
  return null
}

// Check if step is a dates sub-step
export function isDatesSubStep(step: QualificationStep): boolean {
  return step === 'dates_month' || step === 'dates_duration'
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
  // Steps: country(0), city(1), adults(2), children(3), dates_month(4), dates_duration(5), accommodation(6), board(7), transport(8), budget(9)
  // Effective: country(0), city(1), adults(2), children(3), dates(4), accommodation(5), board(6), transport(7), budget(8) = 9 steps
  let effectiveStepIndex = currentStepIndex
  if (currentStepIndex >= 4 && currentStepIndex <= 5) {
    // Dates sub-steps: map to step 4, with fractional progress
    effectiveStepIndex = 4 + (currentStepIndex - 4) / 2
  } else if (currentStepIndex > 5) {
    // After dates: subtract 1 (we had 2 steps, now it's 1)
    effectiveStepIndex = currentStepIndex - 1
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
    let nextIndex = currentStepIndex + 1

    // Skip child_ages step if no children
    if (STEPS[nextIndex] === 'child_ages' && data.guests.children === 0) {
      nextIndex++
    }

    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex])
    } else {
      setIsComplete(true)
    }
  }, [currentStepIndex, data.guests.children])

  // Helper to get next dates sub-step
  const getNextDatesStep = useCallback((current: QualificationStep): QualificationStep | null => {
    if (current === 'dates_month') return 'dates_duration'
    if (current === 'dates_duration') {
      // After dates_duration, go to accommodation_type
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
    if (currentStep === 'accommodation_type') {
      // Going back from accommodation_type should go to dates_duration
      setCurrentStep('dates_duration')
      return
    }
    // Going back from dates_month should skip child_ages if no children
    if (currentStep === 'dates_month' && data.guests.children === 0) {
      setCurrentStep('children')
      return
    }

    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex])
    }
  }, [currentStepIndex, currentStep, data.guests.children])

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
      case 'child_ages':
        // Only need ages if there are children
        return data.guests.children === 0 || data.guests.childAges.length === data.guests.children
      case 'dates_month':
        return data.dates.month !== null // Must select a month or exact date option
      case 'dates_duration':
        return data.dates.duration > 0
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
