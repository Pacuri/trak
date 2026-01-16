import type { QualificationData } from './index'

// Custom inquiry status
export type CustomInquiryStatus = 'new' | 'contacted' | 'converted' | 'closed'

// Custom inquiry from database
export interface CustomInquiry {
  id: string
  organization_id: string
  lead_id: string | null
  
  // Contact Info
  customer_name: string
  customer_phone: string
  customer_email: string | null
  
  // Qualification Data
  qualification_data: QualificationData
  
  // Custom Note
  customer_note: string | null
  
  // Status
  status: CustomInquiryStatus
  
  // Timestamps
  created_at: string
  contacted_at: string | null
  
  // Source
  source: string
}

// Form data for submitting inquiry
export interface InquiryFormData {
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_note?: string
}

// API request body
export interface CreateInquiryRequest extends InquiryFormData {
  qualification_data: QualificationData
}

// API response
export interface CreateInquiryResponse {
  success: boolean
  inquiry_id?: string
  error?: string
}

// Props for inquiry components
export interface InquiryFormProps {
  onSubmit: (data: InquiryFormData) => Promise<void>
  isSubmitting: boolean
  responseTimeText: string
}

export interface InquiryCriteriaSummaryProps {
  qualification: QualificationData
}

export interface InquirySuccessProps {
  responseTimeText: string
  slug: string
}

// Agency inquiry settings (from agency_booking_settings)
export interface AgencyInquirySettings {
  allow_custom_inquiries: boolean
  show_inquiry_with_results: boolean
  inquiry_response_text: string
  inquiry_notification_email: string | null
  inquiry_notification_phone: string | null
}
