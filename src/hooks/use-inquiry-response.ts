'use client'

import { useState, useCallback } from 'react'
import type { InquiryResponseType } from '@/types/dashboard'

interface InquiryResponseInput {
  inquiry_id: string
  response_type: InquiryResponseType
  response_message?: string
  internal_notes?: string
  create_lead?: boolean
}

interface InquiryResponseResult {
  success: boolean
  inquiry_id: string
  lead_id: string | null
}

export function useInquiryResponse() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const respondToInquiry = useCallback(async (input: InquiryResponseInput): Promise<InquiryResponseResult | null> => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/inquiries/${input.inquiry_id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response_type: input.response_type,
          response_message: input.response_message,
          internal_notes: input.internal_notes,
          create_lead: input.create_lead,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to respond to inquiry')
      }

      const result = await response.json()
      return result as InquiryResponseResult
    } catch (err: any) {
      console.error('Error responding to inquiry:', err)
      setError(err.message || 'Greška pri slanju odgovora')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    respondToInquiry,
    isSubmitting,
    error,
  }
}

export default useInquiryResponse
