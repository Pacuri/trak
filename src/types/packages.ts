// Package Types
// Hierarchical structure: Package -> Apartments/RoomTypes -> Prices

export type PackageType = 'fiksni' | 'na_upit'
export type PackageStatus = 'active' | 'inactive' | 'archived'
export type DepartureStatus = 'active' | 'sold_out' | 'cancelled' | 'completed'
export type DeparturePattern = 'weekly' | 'custom'

// Sale modes for FIKSNI packages
export type SaleMode = 'GRUPNO_SMENA' | 'GRUPNO' | 'INDIVIDUALNO'

// Apartment types for FIKSNI
export type ApartmentType = 'studio' | 'apartman' | 'duplex' | 'vila' | 'soba'

// Meal plan codes (industry standard)
export type MealPlanCode = 'ND' | 'BB' | 'HB' | 'FB' | 'AI'

// Discount types for children policies
export type DiscountType = 'FREE' | 'PERCENT' | 'FIXED'

// Shift status
export type ShiftStatus = 'active' | 'full' | 'cancelled'

// Accommodation, meal, and transport types (Serbian-compatible values)
export type AccommodationType = 'hotel' | 'apartman' | 'vila' | 'hostel' | 'kamp' | 'brod'
export type MealPlan = 'all_inclusive' | 'polupansion' | 'dorucak' | 'bez_ishrane'
export type TransportType = 'autobus' | 'avion' | 'sopstveni' | 'brod'

// Urgency labels for UI
export type UrgencyLabel = 'last_seats' | 'filling_up' | 'discounted' | 'new'

// ============================================
// MAIN INTERFACES
// ============================================

export interface Package {
  id: string
  organization_id: string
  
  // Type
  package_type: PackageType
  
  // Basic info
  name: string
  slug?: string
  description?: string
  destination_country: string
  destination_city?: string
  hotel_name?: string
  hotel_stars?: number
  accommodation_name?: string
  
  // Travel details
  board_type?: MealPlan
  transport_type?: TransportType
  departure_location?: string
  
  // For fiksni only: rental period and sale mode
  rental_period_start?: string
  rental_period_end?: string
  sale_mode?: SaleMode
  
  // For na_upit: availability period
  available_from?: string
  available_to?: string
  
  // Meal plans (multiple allowed)
  meal_plans?: MealPlanCode[]
  
  // Transport pricing
  transport_price_fixed?: boolean
  transport_price_per_person?: number
  allow_own_transport?: boolean
  
  // Departure pattern (for auto-generating departures)
  departure_pattern?: DeparturePattern
  departure_day?: number // 0=Sunday, 6=Saturday
  default_duration?: number // nights
  default_capacity?: number // spots per departure
  
  // Pricing
  price_from?: number
  currency: string
  
  // Flags
  is_featured: boolean
  is_active: boolean
  is_published: boolean
  status: PackageStatus
  
  // Timestamps
  created_at: string
  updated_at: string
  created_by?: string
  
  // Joined relations
  images?: PackageImage[]
  departures?: Departure[]
  apartments?: Apartment[]
  room_types?: RoomType[]
  price_intervals?: PriceInterval[]
  children_policies?: ChildrenPolicy[]
  shifts?: Shift[]
  
  // Computed from view (packages_with_next_departure)
  next_departure_id?: string
  next_departure_date?: string
  next_return_date?: string
  next_price?: number
  next_available_spots?: number
  next_total_spots?: number
  active_departures_count?: number
  min_price?: number
  total_capacity?: number
  available_capacity?: number
}

export interface Departure {
  id: string
  package_id: string
  organization_id: string
  
  // Dates
  departure_date: string
  return_date: string
  departure_time?: string
  arrival_time?: string
  
  // Capacity
  total_spots: number
  available_spots: number
  
  // Pricing
  price_override?: number
  original_price?: number
  child_price?: number
  
  // Status
  status: DepartureStatus
  is_visible: boolean
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Computed
  duration_nights?: number
  urgency_label?: UrgencyLabel
  effective_price?: number
  
  // Joined from view (departures_with_package)
  package_name?: string
  destination_country?: string
  destination_city?: string
  hotel_name?: string
  hotel_stars?: number
  package_type?: PackageType
  board_type?: MealPlan
  transport_type?: TransportType
  departure_location?: string
  is_featured?: boolean
  package_base_price?: number
  primary_image_url?: string
  
  // Full package relation (when fetched)
  package?: Package
}

export interface PackageImage {
  id: string
  package_id: string
  url: string
  alt_text?: string
  position: number
  is_primary: boolean
  created_at: string
}

// ============================================
// APARTMENTS (FIKSNI)
// ============================================

export interface Apartment {
  id: string
  package_id: string
  organization_id: string
  
  name: string
  apartment_type: ApartmentType
  
  // Capacity
  max_persons: number
  max_adults?: number
  max_children?: number
  
  // Room configuration
  bedrooms: number
  beds_description?: string
  
  // Amenities
  has_kitchen: boolean
  has_balcony: boolean
  has_sea_view: boolean
  amenities: string[]
  
  // Inventory
  total_units: number
  
  sort_order: number
  created_at: string
  updated_at: string
  
  // Joined prices
  prices?: ApartmentPrice[]
}

export interface ApartmentPrice {
  id: string
  apartment_id: string
  interval_id: string
  organization_id: string
  price_per_night: number
  created_at: string
}

// ============================================
// ROOM TYPES (NA_UPIT)
// ============================================

export interface RoomType {
  id: string
  package_id: string
  organization_id: string
  
  code: string // '1/2', '1/3', '1/4', '1/1'
  name: string // 'Dvokrevetna', 'Trokrevetna'
  max_persons: number
  description?: string
  
  sort_order: number
  created_at: string
  
  // Joined prices
  prices?: HotelPrice[]
}

export interface HotelPrice {
  id: string
  package_id: string
  interval_id: string
  room_type_id: string
  organization_id: string
  
  // Prices per person per night for each meal plan
  price_nd?: number
  price_bb?: number
  price_hb?: number
  price_fb?: number
  price_ai?: number
  
  created_at: string
}

// ============================================
// PRICE INTERVALS (Seasonal Pricing)
// ============================================

export interface PriceInterval {
  id: string
  package_id: string
  organization_id: string
  
  name?: string // e.g., 'Jun', 'Jul-Avg', 'Septembar'
  start_date: string
  end_date: string
  
  sort_order: number
  created_at: string
  
  // Joined prices
  apartment_prices?: ApartmentPrice[]
  hotel_prices?: HotelPrice[]
}

// ============================================
// CHILDREN POLICIES
// ============================================

export interface ChildrenPolicy {
  id: string
  package_id: string
  organization_id: string
  
  age_from: number // e.g., 0.00
  age_to: number // e.g., 1.99
  
  discount_type: DiscountType
  discount_value?: number // Percent (50) or fixed price (25)
  
  label?: string // e.g., 'Bebe', 'Deca'
  sort_order: number
  created_at: string
}

// ============================================
// SHIFTS (GRUPNO_SMENA Tours)
// ============================================

export interface Shift {
  id: string
  package_id: string
  organization_id: string
  
  name?: string // 'Tura 1', 'Tura 2'
  start_date: string
  end_date: string
  
  // Transport for this shift
  transport_price_per_person?: number
  transport_included: boolean
  
  // Capacity
  capacity: number
  booked: number
  
  status: ShiftStatus
  sort_order: number
  created_at: string
  updated_at: string
  
  // Computed
  available_spots?: number
}

// ============================================
// FORM DATA INTERFACES
// ============================================

export interface PackageFormData {
  // Basic info
  name: string
  description?: string
  destination_country: string
  destination_city?: string
  hotel_name?: string
  hotel_stars?: number
  accommodation_name?: string
  
  // Type
  package_type: PackageType
  
  // For FIKSNI
  sale_mode?: SaleMode
  rental_period_start?: string
  rental_period_end?: string
  
  // For NA_UPIT
  available_from?: string
  available_to?: string
  
  // Travel details
  board_type?: MealPlan
  transport_type?: TransportType
  departure_location?: string
  meal_plans?: MealPlanCode[]
  
  // Transport pricing
  transport_price_fixed?: boolean
  transport_price_per_person?: number
  allow_own_transport?: boolean
  
  // Legacy departure settings
  departure_pattern?: DeparturePattern
  departure_day?: number
  default_duration?: number
  default_capacity?: number
  
  // Pricing
  price_from?: number
  
  // Flags
  is_featured: boolean
  is_published?: boolean
  
  // Related data
  images: string[] // URLs
  departures: DepartureFormData[]
  apartments: ApartmentFormData[]
  room_types: RoomTypeFormData[]
  price_intervals: PriceIntervalFormData[]
  children_policies: ChildrenPolicyFormData[]
  shifts: ShiftFormData[]
}

export interface DepartureFormData {
  id?: string // For editing existing
  departure_date: string
  return_date: string
  departure_time?: string
  price_override?: number
  original_price?: number
  child_price?: number
  total_spots?: number
}

export interface ApartmentFormData {
  id?: string
  name: string
  apartment_type: ApartmentType
  max_persons: number
  max_adults?: number
  max_children?: number
  bedrooms?: number
  beds_description?: string
  has_kitchen?: boolean
  has_balcony?: boolean
  has_sea_view?: boolean
  amenities?: string[]
  total_units?: number
  sort_order?: number
  // Prices per interval
  prices?: Record<string, number> // interval_id -> price_per_night
}

export interface RoomTypeFormData {
  id?: string
  code: string
  name: string
  max_persons: number
  description?: string
  sort_order?: number
}

export interface PriceIntervalFormData {
  id?: string
  name?: string
  start_date: string
  end_date: string
  sort_order?: number
  // For FIKSNI: prices per apartment
  apartment_prices?: Record<string, number> // apartment_id -> price_per_night
  // For NA_UPIT: prices per room type and meal plan
  hotel_prices?: HotelPriceFormData[]
}

export interface HotelPriceFormData {
  room_type_id: string
  price_nd?: number
  price_bb?: number
  price_hb?: number
  price_fb?: number
  price_ai?: number
}

export interface ChildrenPolicyFormData {
  id?: string
  age_from: number
  age_to: number
  discount_type: DiscountType
  discount_value?: number
  label?: string
  sort_order?: number
}

export interface ShiftFormData {
  id?: string
  name?: string
  start_date: string
  end_date: string
  transport_price_per_person?: number
  transport_included?: boolean
  capacity: number
  booked?: number
  status?: ShiftStatus
  sort_order?: number
}

export interface GenerateWeeklyDeparturesParams {
  package_id: string
  start_date: string
  end_date: string
  price?: number
  capacity?: number
}

export interface GenerateShiftsParams {
  start_date: string
  end_date: string
  duration_nights: number
  capacity: number
  transport_price?: number
}

// ============================================
// FILTER INTERFACES
// ============================================

export interface PackageFilters {
  package_type?: PackageType
  status?: PackageStatus
  search?: string
  destination_country?: string
  destination_city?: string
  is_featured?: boolean
}

export interface DepartureFilters {
  package_id?: string
  status?: DepartureStatus
  departure_from?: string
  departure_to?: string
  min_price?: number
  max_price?: number
  min_available?: number
}

// ============================================
// API RESPONSE INTERFACES
// ============================================

export interface PackagesListResponse {
  packages: Package[]
  total: number
  limit: number
  offset: number
}

export interface PackageDetailResponse {
  package: Package
  departures: Departure[]
  images: PackageImage[]
}

export interface DeparturesListResponse {
  departures: Departure[]
  total: number
  hasMore: boolean
  matchingCount?: number
  isFallback?: boolean
}

// ============================================
// COMPONENT PROP INTERFACES
// ============================================

export interface PackageCardProps {
  package: Package
  onEdit?: (id: string) => void
  onArchive?: (id: string) => void
}

export interface DepartureRowProps {
  departure: DepartureFormData
  index: number
  packageType: PackageType
  onUpdate: (index: number, data: Partial<DepartureFormData>) => void
  onRemove: (index: number) => void
}

export interface DeparturesTableProps {
  departures: Departure[]
  packageType: PackageType
  onEditDeparture?: (departure: Departure) => void
  onUpdateCapacity?: (id: string, available: number) => void
}

export interface CapacityBarProps {
  total: number
  available: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export interface GenerateDeparturesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageType: PackageType
  onGenerate: (departures: DepartureFormData[]) => void
}

// ============================================
// PRICE CALCULATION INTERFACES
// ============================================

export interface FiksniPriceInput {
  apartment_id: string
  check_in: string
  check_out: string
  shift_id?: string
  include_transport: boolean
  number_of_persons: number
}

export interface NaUpitPriceInput {
  package_id: string
  check_in: string
  check_out: string
  room_type_id: string
  meal_plan: MealPlanCode
  adults: number
  children: { age: number }[]
}

export interface PriceCalculationResult {
  accommodation_total: number
  transport_total: number
  total: number
  nights: number
  price_per_night: number
  breakdown: PriceBreakdownItem[]
}

export interface PriceBreakdownItem {
  interval_name?: string
  nights: number
  price_per_unit: number
  subtotal: number
  description?: string
}

// ============================================
// WIZARD STEP TYPES
// ============================================

export type PackageWizardStep = 
  | 'type'           // Step 1: Package type selection
  | 'basic_info'     // Step 2: Basic info (name, destination)
  | 'sale_mode'      // Step 3a: Sale mode (FIKSNI only)
  | 'period'         // Step 3b: Availability period (NA_UPIT only)
  | 'apartments'     // Step 4a: Apartments config (FIKSNI)
  | 'room_types'     // Step 4b: Room types config (NA_UPIT)
  | 'pricing'        // Step 5: Price intervals and pricing
  | 'children'       // Step 6: Children policies (NA_UPIT)
  | 'shifts'         // Step 6: Shifts config (GRUPNO_SMENA)
  | 'transport'      // Step 7: Transport config
  | 'images'         // Step 8: Images
  | 'review'         // Step 9: Review and save
