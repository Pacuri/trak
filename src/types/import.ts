// Document Import Types
// For parsing supplier price lists with Claude AI

export type Currency = 'EUR' | 'KM' | 'RSD'
export type BusinessModel = 'vlastita_marza' | 'posrednik'
export type DocumentType = 'price_list' | 'contract' | 'unknown'
export type BedType = 'any' | 'separate' | 'shared' | 'extra'
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PriceType = 'per_person_per_night' | 'per_person_per_stay' | 'per_room_per_night' | 'per_unit'
export type SupplementPer = 'night' | 'stay' | 'person_night' | 'person_stay'
export type NoteType = 'warning' | 'info' | 'promo'

// ============================================
// DOCUMENT PARSE RESULT (from Claude)
// ============================================

export interface DocumentParseResult {
  // Document metadata
  document_type: DocumentType
  document_info?: {
    type: string
    supplier_name?: string
    season?: string
    valid_from?: string
    valid_to?: string
    currency: string
    source_text?: string
  }
  supplier_name?: string
  currency: Currency
  business_model: BusinessModel

  // Parsed hotels/packages
  packages: ParsedPackage[]

  // Shared transport (if present)
  transport?: ParsedTransport

  // Enhanced fields
  supplements?: ParsedSupplement[]
  mandatory_fees?: ParsedMandatoryFee[]
  discounts?: ParsedDiscount[]
  policies?: ParsedPolicies
  included_services?: string[]
  important_notes?: ParsedImportantNote[]
  tax_disclaimer?: string

  // Parsing confidence
  confidence: {
    overall: number
    issues: string[]
  }
  parsing_confidence?: {
    overall: number
    issues: string[]
  }
}

export interface ParsedPackage {
  hotel_name: string
  stars?: number
  destination: {
    country: string
    city?: string
    region?: string
  }

  // Hotel description and amenities (extracted + generated)
  hotel_description?: string           // Extracted from PDF if present
  hotel_amenities?: string[]           // Pool, spa, beach access, etc.
  generated_description?: string       // AI-generated marketing description
  distance_from_beach?: number         // Meters from beach/sea
  distance_from_center?: number        // Meters from city center

  // Enhanced pricing info
  price_type?: PriceType
  base_occupancy?: number
  meal_plan?: string
  occupancy_pricing?: OccupancyPricing

  room_types: ParsedRoomType[]
  price_intervals: ParsedPriceInterval[]

  // Price matrix: interval_name -> room_code -> meal_plan -> price
  price_matrix: Record<string, Record<string, Record<string, number>>>

  children_policies: ParsedChildrenPolicy[]

  // Enhanced room details
  room_details?: ParsedRoomDetail[]

  // Package-level notes
  notes?: string[]

  confidence: number
}

export interface ParsedRoomType {
  code: string      // "1/2", "1/3", "1/4"
  name: string      // "Dvokrevetna", "Trokrevetna"
  max_persons: number
  description?: string
}

export interface ParsedPriceInterval {
  name: string        // "18.05.-31.05.", "Jun 2026"
  start_date: string  // ISO date
  end_date: string    // ISO date
}

export interface ParsedChildrenPolicy {
  rule_name?: string
  conditions: {
    min_adults?: number
    max_adults?: number
    child_position?: number
    room_type_codes?: string[]
    bed_type?: BedType
  }
  age_from: number
  age_to: number
  discount_type: 'FREE' | 'PERCENT' | 'FIXED'
  discount_value?: number
  source_text: string  // Original text from document
}

export interface ParsedTransport {
  supplier?: string
  operator?: string
  transport_type?: string
  type?: string
  included_in_package_price?: boolean
  prices?: ParsedTransportPrice[]
  routes?: ParsedTransportRoute[]
}

export interface ParsedTransportPrice {
  city: string
  location?: string
  price: number
  child_price?: number
}

export interface ParsedTransportRoute {
  departure_city: string
  departure_point?: string
  destination?: string
  adult_price: number
  child_price?: number
  child_age_from?: number
  child_age_to?: number
  infant_price?: number
  infant_age_to?: number
  currency?: string
  standalone_adult_price?: number
  standalone_child_price?: number
  source_text?: string
}

// ============================================
// ENHANCED PARSING TYPES
// ============================================

export interface ParsedSupplement {
  code: string
  name: string
  amount?: number
  percent?: number
  per: SupplementPer
  currency?: string
  mandatory: boolean
  conditions?: Record<string, unknown>
  source_text: string
}

export interface FeeRule {
  age_from: number
  age_to: number
  amount: number
}

export interface ParsedMandatoryFee {
  code: string
  name: string
  rules: FeeRule[]
  currency: string
  per: 'stay' | 'night'
  source_text: string
}

export interface ParsedDiscount {
  code: string
  name: string
  percent?: number
  fixed_amount?: number
  conditions?: {
    book_before?: string
    min_nights?: number
  }
  valid_from?: string
  valid_to?: string
  source_text: string
}

export interface ParsedRoomDetail {
  room_type_code: string
  description?: string
  size_sqm?: number
  distance_from_beach?: number
  bed_config?: string
  view?: string
  max_occupancy?: number
  max_adults?: number
  max_children?: number
  min_adults?: number
  amenities?: string[]
  warnings?: string[]
  source_text?: string
}

export interface OccupancyPricing {
  base_occupancy: number
  single_supplement_percent?: number
  third_person_discount_percent?: number
  fourth_person_discount_percent?: number
  source_text?: string
}

export interface ParsedPolicies {
  deposit?: {
    percent: number
    due: string
    balance_due_days_before?: number
    source_text: string
  }
  cancellation?: {
    rules: Array<{ days_before: number; penalty_percent: number }>
    source_text: string
  }
  restrictions?: {
    min_stay?: number
    max_stay?: number
    check_in_days?: string[]
    min_adults?: number
    min_advance_booking_days?: number
    documents_required?: string[]
    source_text?: string
  }
  payment_options?: {
    installments_available?: boolean
    card_payment_fee_percent?: number
    source_text?: string
  }
}

export interface ParsedImportantNote {
  type: NoteType
  text: string
  applies_to?: string[]
}

// ============================================
// IMPORT FORM DATA (for review/editing)
// ============================================

export interface ImportFormData {
  // Source info
  source_document_url: string
  business_model: BusinessModel
  currency: Currency
  margin_percent?: number
  package_type?: 'fiksni' | 'na_upit'

  // Packages to import (with selected flag)
  packages: ImportPackageFormData[]
  
  // Shared transport
  transport?: ImportTransportFormData
  
  // Enhanced fields
  supplements?: ParsedSupplement[]
  mandatory_fees?: ParsedMandatoryFee[]
  discounts?: ParsedDiscount[]
  policies?: ParsedPolicies
  included_services?: string[]
  important_notes?: ParsedImportantNote[]
}

export interface ImportPackageFormData {
  // Selection
  selected: boolean
  confidence: number

  // Basic info
  hotel_name: string
  stars?: number
  destination_country: string
  destination_city?: string
  destination_region?: string

  // Hotel description and amenities (for review/editing)
  hotel_description?: string
  hotel_amenities?: string[]
  generated_description?: string
  distance_from_beach?: number
  distance_from_center?: number

  // Enhanced pricing info
  price_type?: PriceType
  base_occupancy?: number
  occupancy_pricing?: OccupancyPricing
  
  // Room types
  room_types: {
    code: string
    name: string
    max_persons: number
    description?: string
  }[]
  
  // Price intervals
  price_intervals: {
    name: string
    start_date: string
    end_date: string
  }[]
  
  // Price matrix (editable)
  price_matrix: Record<string, Record<string, Record<string, number>>>
  
  // Children policies
  children_policies: {
    rule_name?: string
    min_adults?: number
    max_adults?: number
    child_position?: number
    room_type_codes?: string[]
    bed_type?: BedType
    age_from: number
    age_to: number
    discount_type: 'FREE' | 'PERCENT' | 'FIXED'
    discount_value?: number
    source_text: string
  }[]
  
  // Enhanced room details
  room_details?: ParsedRoomDetail[]
  
  // Meal plans available
  meal_plans: string[]
  
  // Notes/issues to review
  issues: string[]
}

export interface ImportTransportFormData {
  name: string
  supplier_name?: string
  transport_type?: string
  prices: {
    city: string
    location?: string
    price: number
    child_price?: number
  }[]
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface DocumentImportRequest {
  file: File
  organization_id: string
}

export interface DocumentImportResponse {
  success: boolean
  import_id: string
  result?: DocumentParseResult
  error?: string
}

export interface SaveImportedPackagesRequest {
  import_id: string
  packages: ImportPackageFormData[]
  transport?: ImportTransportFormData
  business_model: BusinessModel
  margin_percent?: number
  currency?: Currency // User-specified document currency
  package_type?: 'fiksni' | 'na_upit'

  // Enhanced fields
  supplements?: ParsedSupplement[]
  mandatory_fees?: ParsedMandatoryFee[]
  discounts?: ParsedDiscount[]
  policies?: ParsedPolicies
  included_services?: string[]
  important_notes?: ParsedImportantNote[]
  tax_disclaimer?: string
}

export interface SaveImportedPackagesResponse {
  success: boolean
  created_packages: string[]  // Package IDs
  transport_price_list_id?: string
  errors?: string[]
}

// ============================================
// DOCUMENT IMPORT RECORD (database)
// ============================================

export interface DocumentImport {
  id: string
  organization_id: string
  file_name: string
  file_type: string
  file_url: string
  file_size_bytes?: number
  status: ImportStatus
  parsed_at?: string
  parse_result?: DocumentParseResult
  error_message?: string
  packages_found: number
  packages_imported: number
  created_at: string
  created_by?: string
}

// ============================================
// CHILDREN POLICY RULE (database)
// ============================================

export interface ChildrenPolicyRule {
  id: string
  package_id?: string
  organization_id: string
  rule_name?: string
  priority: number
  min_adults?: number
  max_adults?: number
  child_position?: number
  room_type_codes?: string[]
  bed_type?: BedType
  age_from: number
  age_to: number
  discount_type: 'FREE' | 'PERCENT' | 'FIXED'
  discount_value?: number
  source_text?: string
  created_at: string
  updated_at: string
}

// ============================================
// TRANSPORT PRICE LIST (database)
// ============================================

export interface TransportPriceList {
  id: string
  organization_id: string
  name: string
  supplier_name?: string
  transport_type?: string
  valid_from?: string
  valid_to?: string
  source_document_url?: string
  created_at: string
  updated_at: string
  prices?: TransportPrice[] // Used in form data
  transport_prices?: TransportPrice[] // Used in API response (Supabase relation)
}

export interface TransportPrice {
  id: string
  price_list_id: string
  organization_id: string
  departure_city: string
  departure_location?: string
  price_per_person: number
  currency: string
  child_price?: number
  child_age_limit: number
  sort_order: number
  created_at: string
}

// ============================================
// CURRENCY UTILITIES
// ============================================

export const EXCHANGE_RATES: Record<Currency, number> = {
  EUR: 1,
  KM: 1.95583,  // Fixed rate: 1 EUR = 1.95583 KM
  RSD: 117.5,   // Approximate rate
}

export function convertToEur(amount: number, fromCurrency: Currency): number {
  return amount / EXCHANGE_RATES[fromCurrency]
}

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = currency === 'EUR' ? '€' : currency
  return `${amount.toFixed(2)} ${symbol}`
}
