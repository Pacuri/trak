import type { UrgencyLabel } from './index'

// Agency landing page settings from database
export interface AgencyLandingSettings {
  id: string
  organization_id: string
  
  // Branding
  logo_url: string | null
  logo_initials: string | null
  primary_color: string
  background_image_url: string | null
  
  // Hero Section
  headline: string
  subtitle: string
  cta_text: string
  
  // Specialization
  show_specialization: boolean
  specialization_emoji: string | null
  specialization_text: string | null
  
  // Stats
  show_stats: boolean
  stat_travelers: number | null
  stat_years: number | null
  stat_rating: number | null
  stat_destinations: number | null
  
  // Trust Badges
  is_yuta_member: boolean
  is_licensed: boolean
  license_number: string | null
  show_installments: boolean
  show_secure_booking: boolean
  
  // Footer
  legal_name: string | null
  footer_text: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

// Default values for landing settings when none exist
export const DEFAULT_LANDING_SETTINGS: Omit<AgencyLandingSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  logo_url: null,
  logo_initials: null,
  primary_color: '#0F766E',
  background_image_url: null,
  
  headline: 'Pronađite savršeno putovanje',
  subtitle: 'Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas, za manje od 60 sekundi.',
  cta_text: 'Započni pretragu',
  
  show_specialization: false,
  specialization_emoji: null,
  specialization_text: null,
  
  show_stats: false,
  stat_travelers: null,
  stat_years: null,
  stat_rating: null,
  stat_destinations: null,
  
  is_yuta_member: false,
  is_licensed: true,
  license_number: null,
  show_installments: false,
  show_secure_booking: true,
  
  legal_name: null,
  footer_text: null,
}

// Floating offer card for desktop preview
export interface FloatingOfferCard {
  id: string
  name: string
  city: string | null
  country: string
  price_per_person: number
  currency: string
  image_url: string | null
  urgency_label: UrgencyLabel | null
}

// Landing page API response
export interface LandingPageData {
  agency: {
    name: string
    slug: string
    organization_id: string
    logo_url: string | null
  }
  settings: AgencyLandingSettings
  background_image_url: string
  floating_offers: FloatingOfferCard[]
  inquiry_settings: {
    allow_custom_inquiries: boolean
    show_inquiry_with_results: boolean
    inquiry_response_text: string
  }
}

// Props for landing page components
export interface LandingHeroProps {
  settings: AgencyLandingSettings
  agencyName: string
  slug: string
}

export interface LandingStatsProps {
  travelers: number | null
  years: number | null
  rating: number | null
  destinations: number | null
}

export interface LandingTrustBadgesProps {
  isYutaMember: boolean
  isLicensed: boolean
  showInstallments: boolean
  showSecureBooking: boolean
}

export interface LandingFooterProps {
  agencyName: string
  legalName: string | null
  licenseNumber: string | null
  footerText: string | null
}

export interface FloatingOfferCardsProps {
  offers: FloatingOfferCard[]
}
