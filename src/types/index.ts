export interface Organization {
  id: string
  name: string
  slug: string
  industry: string | null
  language_region?: 'rs' | 'ba' | 'hr' | null
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'agent'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  organization_id: string
  name: string
  slug: string
  color: string
  position: number
  is_default: boolean
  is_won: boolean
  is_lost: boolean
}

export interface LeadSource {
  id: string
  organization_id: string
  type: string
  name: string
  is_active: boolean
}

export interface Lead {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  source_id: string | null
  source_type: string | null
  source_inquiry_id: string | null  // Reference to custom_inquiry for rich data
  stage_id: string | null
  assigned_to: string | null
  destination: string | null
  travel_date: string | null
  guests: number | null
  budget: number | null
  currency: string
  value: number | null
  original_message: string | null
  notes: string | null
  tags: string[] | null
  last_contact_at: string | null
  next_followup_at: string | null
  closed_at: string | null
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
  // Joined relations
  stage?: PipelineStage
  source?: LeadSource
  assignee?: User
  assigned_user?: User // Alias for backward compatibility
  source_inquiry?: CustomInquiry // Rich inquiry data when created from website
}

// Custom Inquiry (website form submissions)
export interface CustomInquiry {
  id: string
  organization_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_note: string | null
  qualification_data: QualificationData | null
  package_id: string | null
  source: string | null
  status: 'new' | 'contacted' | 'converted' | 'closed' | 'responded'
  responded_at: string | null
  responded_by: string | null
  response_type: string | null
  response_message: string | null
  internal_notes: string | null
  converted_to_lead_id: string | null
  lead_id: string | null
  created_at: string
  updated_at: string
  // Joined relations
  package?: {
    id: string
    name: string
    hotel_name: string | null
    destination_country: string | null
    destination_city: string | null
  }
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  type: string
  description: string | null
  metadata: Record<string, any>
  created_at: string
  user?: User
}

export interface Reminder {
  id: string
  lead_id: string
  user_id: string
  organization_id: string
  title: string
  description: string | null
  due_at: string
  is_completed: boolean
  is_automatic: boolean
  created_at: string
}

// ===========================================
// PHASE 2: Offers + Inquiry System Types
// ===========================================

export type InventoryType = 'owned' | 'inquiry'
export type OfferStatus = 'active' | 'sold_out' | 'archived'
export type AccommodationType = 'hotel' | 'apartment' | 'villa' | 'any'
export type BoardType = 'all_inclusive' | 'half_board' | 'breakfast' | 'room_only' | 'any'
export type TransportType = 'flight' | 'bus' | 'none' | 'own'

export interface Offer {
  id: string
  organization_id: string
  
  // Basic info
  name: string
  description: string | null
  star_rating: number | null
  
  // Destination
  country: string
  city: string | null
  
  // Dates
  departure_date: string
  return_date: string
  
  // Pricing
  price_per_person: number
  original_price: number | null
  currency: string
  
  // Capacity
  total_spots: number
  available_spots: number
  
  // Details
  accommodation_type: AccommodationType | null
  board_type: BoardType | null
  transport_type: TransportType | null
  
  // Inventory type
  inventory_type: InventoryType
  
  // Labels
  is_recommended: boolean
  
  // Analytics
  views_total: number
  views_last_24h: number
  
  // Status
  status: OfferStatus
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Joined relations
  images?: OfferImage[]

  // For package-based departures (na upit): link to /a/[slug]/paket/[package_id]
  package_id?: string
}

export interface OfferImage {
  id: string
  offer_id: string
  url: string
  alt_text: string | null
  position: number
  is_primary: boolean
  created_at: string
}

export interface OfferView {
  id: string
  offer_id: string
  session_id: string | null
  user_agent: string | null
  ip_hash: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  qualification_data: QualificationData | null
  viewed_at: string
}

// Reservation types
export type ReservationStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'converted'
export type PaymentOption = 'deposit' | 'full' | 'agency' | 'contact'

export interface Reservation {
  id: string
  organization_id: string
  offer_id: string | null
  lead_id: string | null
  
  code: string
  
  // Customer info
  customer_name: string
  customer_phone: string
  customer_email: string | null
  
  // Guests
  adults: number
  children: number
  child_ages: number[] | null
  
  // Pricing
  total_price: number
  deposit_amount: number | null
  amount_paid: number
  currency: string
  
  // Payment
  payment_option: PaymentOption | null
  
  // Status
  status: ReservationStatus
  
  // Expiry
  expires_at: string
  
  // Reminders
  reminder_24h_sent: boolean
  reminder_48h_sent: boolean
  
  // Qualification
  qualification_data: QualificationData | null
  
  // Timestamps
  created_at: string
  updated_at: string
  paid_at: string | null
  expired_at: string | null
  cancelled_at: string | null
  
  // Joined relations
  offer?: Offer
  lead?: Lead
}

// Booking types
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type PaymentMethod = 'card' | 'bank' | 'cash' | 'mixed'

export interface Booking {
  id: string
  organization_id: string
  lead_id: string | null
  offer_id: string | null
  reservation_id: string | null
  closed_by: string | null
  
  // Customer info
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  
  // Guests
  adults: number
  children: number
  child_ages: number[] | null
  
  // Pricing
  total_amount: number
  amount_paid: number
  currency: string
  
  // Payment
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  
  // External booking
  is_external: boolean
  external_destination: string | null
  external_accommodation: string | null
  external_dates: string | null
  external_value: number | null
  
  // Status
  status: BookingStatus
  cancellation_reason: string | null
  refund_amount: number | null
  
  // Dates
  travel_date: string | null
  return_date: string | null
  
  // Timestamps
  booked_at: string
  cancelled_at: string | null
  completed_at: string | null
  
  // Joined relations
  offer?: Offer
  lead?: Lead
  reservation?: Reservation
  closer?: User
}

// Offer Inquiry types
export type InquiryStatus = 'pending' | 'checking' | 'available' | 'unavailable' | 'alternative' | 'expired'

export interface OfferInquiry {
  id: string
  organization_id: string
  offer_id: string
  
  // Customer info
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_message: string | null
  
  // Qualification
  qualification_data: QualificationData | null
  
  // Status
  status: InquiryStatus
  
  // Response
  responded_by: string | null
  responded_at: string | null
  response_note: string | null
  
  // Links
  reservation_id: string | null
  alternative_offer_id: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Joined relations
  offer?: Offer
  responder?: User
  alternative_offer?: Offer
  reservation?: Reservation
}

// Payment types
export type PaymentType = 'deposit' | 'full' | 'partial' | 'refund'
export type PaymentProviderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'

export interface Payment {
  id: string
  organization_id: string
  reservation_id: string | null
  booking_id: string | null
  
  amount: number
  currency: string
  
  payment_type: PaymentType | null
  payment_method: PaymentMethod | null
  payment_provider: string | null
  
  provider_transaction_id: string | null
  provider_response: Record<string, any> | null
  
  status: PaymentProviderStatus
  
  notes: string | null
  recorded_by: string | null
  
  created_at: string
  completed_at: string | null
  failed_at: string | null
}

// Abandoned Cart types
export interface AbandonedCart {
  id: string
  organization_id: string
  email: string
  
  qualification_data: QualificationData | null
  offers_shown: string[] | null
  
  discount_code: string | null
  discount_percent: number
  discount_expires_at: string | null
  
  email_1_sent_at: string | null
  email_2_sent_at: string | null
  email_3_sent_at: string | null
  
  converted: boolean
  converted_at: string | null
  converted_reservation_id: string | null
  
  unsubscribed: boolean
  unsubscribed_at: string | null
  
  created_at: string
}

// Agency Booking Settings
export interface DaySchedule {
  enabled: boolean
  start: string // "09:00"
  end: string   // "17:00"
}

export interface WorkingHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface AgencyBookingSettings {
  id: string
  organization_id: string
  
  slug: string
  
  // Display
  display_name: string | null
  logo_url: string | null
  primary_color: string
  
  // Contact
  contact_phone: string | null
  contact_email: string | null
  contact_address: string | null
  
  // Working hours
  working_hours: WorkingHours
  response_time_working: number  // minutes
  response_time_outside: number  // minutes
  
  // Reservation
  reservation_hold_hours: number
  deposit_percent: number
  
  // Abandoned cart
  abandoned_cart_enabled: boolean
  abandoned_cart_discount_percent: number
  abandoned_cart_discount_hours: number
  abandoned_cart_email_1_hours: number
  abandoned_cart_email_2_hours: number
  abandoned_cart_email_3_hours: number
  
  // Features
  allow_online_payment: boolean
  allow_deposit_payment: boolean
  allow_agency_payment: boolean
  allow_contact_request: boolean
  
  // SEO
  meta_title: string | null
  meta_description: string | null
  
  created_at: string
  updated_at: string
}

// Qualification Flow types
export interface QualificationDestination {
  country: string
  city: string | null
}

export interface QualificationGuests {
  adults: number
  children: number
  childAges: number[]
}

export interface QualificationDates {
  month: string | null
  exactStart: string | null
  exactEnd: string | null
  duration: number
  flexible: boolean
}

export interface QualificationAccommodation {
  type: AccommodationType | null
  board: BoardType | null
  transport: TransportType | null
}

export interface QualificationBudget {
  min: number | null
  max: number | null
  perPerson: boolean
}

export interface QualificationData {
  destination: QualificationDestination
  guests: QualificationGuests
  dates: QualificationDates
  accommodation: QualificationAccommodation
  budget: QualificationBudget
  // Package inquiry specific fields (optional)
  package_id?: string
  package_name?: string
  selected_date?: string | null
  selected_room_type_id?: string | null
  selected_meal_plan?: string | null
}

// Urgency Label types
export type UrgencyLabelType = 
  | 'POSLEDNJA_MESTA'
  | 'ISTICE_USKORO'
  | 'POPUNJAVA_SE'
  | 'SNIZENO'
  | 'NOVO'
  | 'POPULARNO'
  | 'PREPORUCUJEMO'

export type UrgencyLabelColor = 'red' | 'orange' | 'green' | 'purple' | 'blue'

export interface UrgencyLabel {
  type: UrgencyLabelType
  text: string
  color: UrgencyLabelColor
  icon: string
}

// Notification types
export type NotificationType = 
  | 'new_lead'
  | 'new_inquiry'
  | 'inquiry_urgent'
  | 'new_reservation'
  | 'payment_received'
  | 'reservation_expiring'
  | 'reservation_expired'
  | 'booking_cancelled'
  | 'new_message'

export interface Notification {
  id: string
  organization_id: string
  user_id: string | null
  
  type: NotificationType
  title: string
  body: string | null
  
  reference_type: string | null
  reference_id: string | null
  
  read: boolean
  read_at: string | null
  
  created_at: string
}

// Daily Reconciliation types
export interface DailyReconciliation {
  id: string
  organization_id: string
  user_id: string
  
  reconciliation_date: string
  
  leads_created: number
  bookings_closed: number
  revenue_total: number
  
  confirmed_complete: boolean
  confirmed_at: string | null
  
  created_at: string
}
