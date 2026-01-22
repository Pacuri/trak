// Dashboard Types
// Types for the redesigned dashboard components

import type { Lead, QualificationData } from './index'

// ===========================================
// STAT CARDS
// ===========================================

export interface DashboardStats {
  leads_to_call: number
  pending_inquiries: number
  departures_today: number
  departures_passengers: number
  revenue_this_month: number
  revenue_trend: number // percentage change vs last month
  urgent_count: number
}

// ===========================================
// LEADS TO CALL
// ===========================================

export type LeadPriority = 'urgent' | 'high' | 'normal'

export interface LeadToCall {
  id: string
  name: string
  phone: string | null
  email: string | null
  destination: string | null
  guests: number | null
  value: number | null
  created_at: string
  last_contact_at: string | null
  priority: LeadPriority // calculated: urgent >48h, high 24-48h, normal <24h
  wait_hours: number
}

// ===========================================
// CUSTOM INQUIRIES
// ===========================================

export type InquiryPriority = 'urgent' | 'high' | 'normal'
export type InquiryResponseType = 'can_help' | 'cannot_help' | 'need_info'

export interface PendingInquiry {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_note: string | null
  qualification_data: QualificationData | null
  created_at: string
  priority: InquiryPriority // calculated: urgent >4h, high 2-4h, normal <2h
  wait_hours: number
  source: string | null
  lead_id: string | null // linked lead in pipeline
}

export interface InquiryResponse {
  response_type: InquiryResponseType
  response_message: string
  internal_notes?: string
  create_lead: boolean
}

// ===========================================
// ATTENTION REQUIRED
// ===========================================

export type AttentionCategory = 
  | 'late_payments'
  | 'expiring_reservations'
  | 'last_seats'
  | 'unanswered_inquiries'

export interface AttentionItem {
  id: string
  category: AttentionCategory
  title: string
  subtitle: string
  urgency: 'critical' | 'warning' | 'info'
  meta: string // e.g., "€450", "12h", "2 mesta"
  link?: string // route to navigate to
  inquiry_id?: string // for opening slide-over
}

export interface AttentionSection {
  category: AttentionCategory
  icon: string
  label: string
  count: number
  items: AttentionItem[]
}

// ===========================================
// TODAY'S DEPARTURES
// ===========================================

export interface TodayDeparture {
  id: string
  departure_id: string
  package_id: string
  package_name: string
  hotel_name: string | null
  hotel_stars: number | null
  destination_city: string | null
  destination_country: string
  departure_time: string | null
  passenger_count: number
  transport_type: string | null
  departure_location: string | null
}

export interface TodayReturn {
  id: string
  destination: string
  passenger_count: number
  arrival_time: string | null
}

// ===========================================
// PACKAGE CAPACITY
// ===========================================

export interface PackageCapacity {
  id: string
  name: string
  hotel_name: string | null
  hotel_stars: number | null
  destination_city: string | null
  destination_country: string
  rental_period_start: string | null
  rental_period_end: string | null
  departure_day: number | null
  total_spots: number
  booked_spots: number
  available_spots: number
  fill_percentage: number
  next_departure: {
    date: string
    available: number
  } | null
}

// ===========================================
// COMBINED DASHBOARD DATA
// ===========================================

export interface DashboardData {
  stats: DashboardStats
  leads_to_call: LeadToCall[]
  pending_inquiries: PendingInquiry[]
  attention: AttentionSection[]
  departures_today: TodayDeparture[]
  returns_today: TodayReturn[]
  package_capacity: PackageCapacity[]
  loading: boolean
  error: string | null
  last_updated: Date | null
}

// ===========================================
// PACKAGES & DEPARTURES (Database types)
// ===========================================

export type PackageType = 'fiksni' | 'na_upit'
export type PackageStatus = 'active' | 'inactive' | 'archived'
export type DepartureStatus = 'active' | 'cancelled' | 'completed'
export type DeparturePattern = 'weekly' | 'custom'

export interface Package {
  id: string
  organization_id: string
  package_type: PackageType
  name: string
  description: string | null
  destination_country: string
  destination_city: string | null
  hotel_name: string | null
  hotel_stars: number | null
  board_type: string | null
  transport_type: string | null
  departure_location: string | null
  rental_period_start: string | null
  rental_period_end: string | null
  departure_pattern: DeparturePattern | null
  departure_day: number | null
  default_duration: number | null
  default_capacity: number | null
  price_from: number | null
  currency: string
  status: PackageStatus
  created_at: string
  updated_at: string
}

export interface Departure {
  id: string
  package_id: string
  organization_id: string
  departure_date: string
  return_date: string
  departure_time: string | null
  arrival_time: string | null
  total_spots: number
  available_spots: number
  price_override: number | null
  status: DepartureStatus
  created_at: string
  updated_at: string
  package?: Package
}
