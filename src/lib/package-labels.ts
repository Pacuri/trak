// Package Labels - Serbian Translations
// Used throughout the UI for consistent labeling

import type { 
  PackageType, 
  PackageStatus, 
  DepartureStatus, 
  AccommodationType, 
  MealPlan, 
  TransportType,
  UrgencyLabel,
  DeparturePattern
} from '@/types/packages'

// ============================================
// PACKAGE TYPE LABELS
// ============================================

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  fiksni: 'Fiksni (garantovana mesta)',
  na_upit: 'Na upit',
}

export const PACKAGE_TYPE_SHORT_LABELS: Record<PackageType, string> = {
  fiksni: 'Fiksni',
  na_upit: 'Na upit',
}

export const PACKAGE_TYPE_DESCRIPTIONS: Record<PackageType, string> = {
  fiksni: 'Agencija ima zakupljeni kapacitet - garantovana mesta',
  na_upit: 'Proverava se raspoloživost za svaku rezervaciju',
}

// ============================================
// PACKAGE STATUS LABELS
// ============================================

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  active: 'Aktivan',
  inactive: 'Neaktivan',
  archived: 'Arhiviran',
}

export const PACKAGE_STATUS_COLORS: Record<PackageStatus, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  archived: 'bg-red-100 text-red-800 border-red-200',
}

// ============================================
// DEPARTURE STATUS LABELS
// ============================================

export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  active: 'Aktivan',
  sold_out: 'Rasprodato',
  cancelled: 'Otkazano',
  completed: 'Završeno',
  scheduled: 'Planiran',
  confirmed: 'Potvrđen',
}

export const DEPARTURE_STATUS_COLORS: Record<DepartureStatus, string> = {
  active: 'border-green-500 text-green-700 bg-green-50',
  sold_out: 'border-red-500 text-red-700 bg-red-50',
  cancelled: 'border-gray-500 text-gray-700 bg-gray-50',
  completed: 'border-blue-500 text-blue-700 bg-blue-50',
  scheduled: 'border-amber-500 text-amber-700 bg-amber-50',
  confirmed: 'border-green-500 text-green-700 bg-green-50',
}

// ============================================
// ACCOMMODATION LABELS
// ============================================

export const ACCOMMODATION_LABELS: Record<AccommodationType, string> = {
  hotel: 'Hotel',
  apartman: 'Apartman',
  vila: 'Vila',
  hostel: 'Hostel',
  kamp: 'Kamp',
  brod: 'Brod/Kruzer',
}

export const ACCOMMODATION_ICONS: Record<AccommodationType, string> = {
  hotel: '🏨',
  apartman: '🏢',
  vila: '🏡',
  hostel: '🛏️',
  kamp: '⛺',
  brod: '🛳️',
}

// ============================================
// MEAL PLAN LABELS
// ============================================

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  all_inclusive: 'All Inclusive',
  polupansion: 'Polupansion',
  dorucak: 'Doručak',
  bez_ishrane: 'Bez ishrane',
}

export const MEAL_PLAN_SHORT_LABELS: Record<MealPlan, string> = {
  all_inclusive: 'AI',
  polupansion: 'HB',
  dorucak: 'BB',
  bez_ishrane: 'RO',
}

export const MEAL_PLAN_ICONS: Record<MealPlan, string> = {
  all_inclusive: '🍽️',
  polupansion: '🥗',
  dorucak: '🥐',
  bez_ishrane: '🍴',
}

// ============================================
// TRANSPORT LABELS
// ============================================

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  autobus: 'Autobus',
  avion: 'Avion',
  sopstveni: 'Sopstveni prevoz',
  brod: 'Brod',
}

export const TRANSPORT_ICONS: Record<TransportType, string> = {
  autobus: '🚌',
  avion: '✈️',
  sopstveni: '🚗',
  brod: '🛳️',
}

// ============================================
// DEPARTURE PATTERN LABELS
// ============================================

export const DEPARTURE_PATTERN_LABELS: Record<DeparturePattern, string> = {
  weekly: 'Nedeljni polasci',
  custom: 'Prilagođeni datumi',
}

// ============================================
// DAY OF WEEK LABELS
// ============================================

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Nedelja',
  1: 'Ponedeljak',
  2: 'Utorak',
  3: 'Sreda',
  4: 'Četvrtak',
  5: 'Petak',
  6: 'Subota',
}

export const DAY_OF_WEEK_SHORT: Record<number, string> = {
  0: 'Ned',
  1: 'Pon',
  2: 'Uto',
  3: 'Sre',
  4: 'Čet',
  5: 'Pet',
  6: 'Sub',
}

// ============================================
// URGENCY LABELS
// ============================================

export const URGENCY_LABELS: Record<UrgencyLabel, { text: string; className: string; icon: string }> = {
  last_seats: { 
    text: '🔥 POSLEDNJA MESTA', 
    className: 'bg-red-500 text-white',
    icon: '🔥'
  },
  filling_up: { 
    text: '📈 POPUNJAVA SE', 
    className: 'bg-orange-500 text-white',
    icon: '📈'
  },
  discounted: { 
    text: '💰 SNIŽENO', 
    className: 'bg-green-500 text-white',
    icon: '💰'
  },
  new: { 
    text: '🆕 NOVO', 
    className: 'bg-purple-500 text-white',
    icon: '🆕'
  },
}

// ============================================
// UI TEXT CONSTANTS
// ============================================

export const PACKAGE_UI_TEXT = {
  // Page titles
  list_title: 'Paketi',
  create_title: 'Novi paket',
  edit_title: 'Izmeni paket',
  detail_title: 'Detalji paketa',
  
  // Section headers
  basic_info: 'Osnovni podaci',
  travel_details: 'Detalji putovanja',
  departures: 'Polasci',
  images: 'Slike',
  
  // Buttons
  create_button: 'Novi paket',
  save_button: 'Sačuvaj',
  cancel_button: 'Otkaži',
  archive_button: 'Arhiviraj',
  add_departure: 'Dodaj polazak',
  generate_weekly: 'Generiši nedeljne',
  view_all: 'Vidi sve',
  back: 'Nazad',
  
  // Form labels
  name_label: 'Naziv paketa',
  name_placeholder: 'npr. Hotel Aegean Blue - Halkidiki',
  description_label: 'Opis',
  description_placeholder: 'Opišite paket...',
  country_label: 'Država',
  country_placeholder: 'npr. Grčka',
  city_label: 'Grad/Region',
  city_placeholder: 'npr. Halkidiki',
  hotel_label: 'Hotel/Smeštaj',
  hotel_placeholder: 'npr. Aegean Blue Hotel',
  stars_label: 'Broj zvezdica',
  type_label: 'Tip ponude',
  accommodation_label: 'Tip smeštaja',
  meal_label: 'Ishrana',
  transport_label: 'Prevoz',
  departure_location_label: 'Mesto polaska',
  departure_location_placeholder: 'npr. BAS Beograd',
  rental_start_label: 'Početak zakupa',
  rental_end_label: 'Kraj zakupa',
  departure_pattern_label: 'Obrazac polazaka',
  departure_day_label: 'Dan polaska',
  default_duration_label: 'Trajanje (noći)',
  default_capacity_label: 'Kapacitet po polasku',
  price_from_label: 'Cena od (€)',
  featured_label: 'Preporučena ponuda (prikazuje se na vrhu)',
  
  // Departure form
  departure_date_label: 'Datum polaska',
  return_date_label: 'Datum povratka',
  departure_time_label: 'Vreme polaska',
  capacity_label: 'Mesta',
  price_label: 'Cena (€)',
  
  // Stats
  active_departures: 'Aktivnih polazaka',
  min_price: 'Minimalna cena',
  next_departure: 'Sledeći polazak',
  total_capacity: 'Ukupan kapacitet',
  available_capacity: 'Dostupno mesta',
  
  // Empty states
  no_packages: 'Nema paketa',
  no_packages_description: 'Kreirajte prvi paket',
  no_departures: 'Nema polazaka',
  no_departures_description: 'Dodajte pojedinačno ili generišite nedeljne polaske',
  no_images: 'Nema slika',
  
  // Filters
  filter_all: 'Svi',
  search_placeholder: 'Pretraži pakete...',
  
  // Status messages
  creating: 'Kreiranje...',
  saving: 'Čuvanje...',
  loading: 'Učitavanje...',
  success_created: 'Paket je uspešno kreiran',
  success_updated: 'Paket je uspešno ažuriran',
  success_archived: 'Paket je arhiviran',
  error_creating: 'Greška pri kreiranju paketa',
  error_updating: 'Greška pri ažuriranju paketa',
  error_loading: 'Greška pri učitavanju paketa',
  
  // Generate dialog
  generate_title: 'Generiši nedeljne polaske',
  generate_description: 'Automatski kreiraj polazak za svaku nedelju u zadatom periodu',
  start_date_label: 'Početni datum',
  end_date_label: 'Krajnji datum',
  duration_label: 'Trajanje (noći)',
  spots_label: 'Broj mesta',
  will_generate: 'Biće kreirano',
  departures_count: 'polazaka',
  generate_button: 'Generiši',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display name for a package (including hotel if available)
 */
export function getPackageDisplayName(pkg: { name: string; hotel_name?: string }): string {
  if (pkg.hotel_name && !pkg.name.includes(pkg.hotel_name)) {
    return `${pkg.name} - ${pkg.hotel_name}`
  }
  return pkg.name
}

/**
 * Get short location string
 */
export function getLocationString(
  destination_city?: string, 
  destination_country?: string
): string {
  if (destination_city && destination_country) {
    return `${destination_city}, ${destination_country}`
  }
  return destination_city || destination_country || 'Nepoznata lokacija'
}

/**
 * Get formatted capacity string
 */
export function getCapacityString(total: number, available: number): string {
  const booked = total - available
  return `${booked}/${total} mesta`
}

/**
 * Get capacity percentage
 */
export function getCapacityPercentage(total: number, available: number): number {
  if (total === 0) return 0
  return Math.round(((total - available) / total) * 100)
}

/**
 * Get capacity color based on percentage
 */
export function getCapacityColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-orange-500'
  return 'bg-green-500'
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency: string = 'EUR'): string {
  if (currency === 'EUR') {
    return `€${amount.toLocaleString('sr-RS')}`
  }
  return `${amount.toLocaleString('sr-RS')} ${currency}`
}

/**
 * Format date for display (Serbian format)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sr-RS', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format short date (e.g., "Sub 18.1.")
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const dayName = DAY_OF_WEEK_SHORT[date.getDay()]
  return `${dayName} ${date.getDate()}.${date.getMonth() + 1}.`
}

/**
 * Get stars string (★★★★☆)
 */
export function getStarsString(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}
