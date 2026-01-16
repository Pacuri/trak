import { z } from 'zod'

// ============================================
// ENUM SCHEMAS
// ============================================

export const PackageTypeSchema = z.enum(['fiksni', 'na_upit'])

export const SaleModeSchema = z.enum(['GRUPNO_SMENA', 'GRUPNO', 'INDIVIDUALNO'])

export const ApartmentTypeSchema = z.enum(['studio', 'apartman', 'duplex', 'vila', 'soba'])

export const MealPlanCodeSchema = z.enum(['ND', 'BB', 'HB', 'FB', 'AI'])

export const DiscountTypeSchema = z.enum(['FREE', 'PERCENT', 'FIXED'])

export const ShiftStatusSchema = z.enum(['active', 'full', 'cancelled'])

// ============================================
// APARTMENT SCHEMAS
// ============================================

export const ApartmentFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Naziv apartmana je obavezan'),
  apartment_type: ApartmentTypeSchema,
  max_persons: z.number().int().min(1, 'Minimalno 1 osoba'),
  max_adults: z.number().int().min(1).optional(),
  max_children: z.number().int().min(0).optional(),
  bedrooms: z.number().int().min(0).default(1),
  beds_description: z.string().optional(),
  has_kitchen: z.boolean().default(true),
  has_balcony: z.boolean().default(false),
  has_sea_view: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  total_units: z.number().int().min(1, 'Minimalno 1 jedinica').default(1),
  sort_order: z.number().int().default(0),
  prices: z.record(z.string(), z.number().min(0)).optional(),
})

// ============================================
// ROOM TYPE SCHEMAS
// ============================================

export const RoomTypeFormSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'Kod sobe je obavezan'),
  name: z.string().min(1, 'Naziv sobe je obavezan'),
  max_persons: z.number().int().min(1, 'Minimalno 1 osoba'),
  description: z.string().optional(),
  sort_order: z.number().int().default(0),
})

// ============================================
// PRICE INTERVAL SCHEMAS
// ============================================

export const HotelPriceFormSchema = z.object({
  room_type_id: z.string().uuid(),
  price_nd: z.number().min(0).optional().nullable(),
  price_bb: z.number().min(0).optional().nullable(),
  price_hb: z.number().min(0).optional().nullable(),
  price_fb: z.number().min(0).optional().nullable(),
  price_ai: z.number().min(0).optional().nullable(),
})

export const PriceIntervalFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  start_date: z.string().min(1, 'Datum početka je obavezan'),
  end_date: z.string().min(1, 'Datum kraja je obavezan'),
  sort_order: z.number().int().default(0),
  apartment_prices: z.record(z.string(), z.number().min(0)).optional(),
  hotel_prices: z.array(HotelPriceFormSchema).optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Datum kraja mora biti posle datuma početka', path: ['end_date'] }
)

// ============================================
// CHILDREN POLICY SCHEMAS
// ============================================

export const ChildrenPolicyFormSchema = z.object({
  id: z.string().uuid().optional(),
  age_from: z.number().min(0, 'Uzrast mora biti pozitivan'),
  age_to: z.number().min(0, 'Uzrast mora biti pozitivan'),
  discount_type: DiscountTypeSchema,
  discount_value: z.number().min(0).optional().nullable(),
  label: z.string().optional(),
  sort_order: z.number().int().default(0),
}).refine(
  (data) => data.age_to > data.age_from,
  { message: 'Gornja granica uzrasta mora biti veća od donje', path: ['age_to'] }
).refine(
  (data) => {
    if (data.discount_type === 'FREE') return true
    return data.discount_value !== undefined && data.discount_value !== null
  },
  { message: 'Vrednost popusta je obavezna za ovaj tip', path: ['discount_value'] }
)

// ============================================
// SHIFT SCHEMAS
// ============================================

export const ShiftFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  start_date: z.string().min(1, 'Datum početka je obavezan'),
  end_date: z.string().min(1, 'Datum kraja je obavezan'),
  transport_price_per_person: z.number().min(0).optional().nullable(),
  transport_included: z.boolean().default(true),
  capacity: z.number().int().min(1, 'Kapacitet mora biti pozitivan'),
  booked: z.number().int().min(0).default(0),
  status: ShiftStatusSchema.default('active'),
  sort_order: z.number().int().default(0),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Datum kraja mora biti posle datuma početka', path: ['end_date'] }
)

export const GenerateShiftsSchema = z.object({
  start_date: z.string().min(1, 'Datum početka je obavezan'),
  end_date: z.string().min(1, 'Datum kraja je obavezan'),
  duration_nights: z.number().int().min(1, 'Trajanje mora biti minimalno 1 noć'),
  capacity: z.number().int().min(1, 'Kapacitet mora biti pozitivan'),
  transport_price: z.number().min(0).optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Datum kraja mora biti posle datuma početka', path: ['end_date'] }
)

// ============================================
// PACKAGE FORM SCHEMA
// ============================================

export const PackageFormSchema = z.object({
  // Basic info
  name: z.string().min(1, 'Naziv paketa je obavezan'),
  description: z.string().optional(),
  destination_country: z.string().min(1, 'Država je obavezna'),
  destination_city: z.string().optional(),
  hotel_name: z.string().optional(),
  hotel_stars: z.number().int().min(1).max(5).optional().nullable(),
  accommodation_name: z.string().optional(),
  
  // Type
  package_type: PackageTypeSchema,
  
  // For FIKSNI
  sale_mode: SaleModeSchema.optional().nullable(),
  rental_period_start: z.string().optional(),
  rental_period_end: z.string().optional(),
  
  // For NA_UPIT
  available_from: z.string().optional(),
  available_to: z.string().optional(),
  
  // Travel details
  transport_type: z.string().optional(),
  departure_location: z.string().optional(),
  meal_plans: z.array(MealPlanCodeSchema).default([]),
  
  // Transport pricing
  transport_price_fixed: z.boolean().default(false),
  transport_price_per_person: z.number().min(0).optional().nullable(),
  allow_own_transport: z.boolean().default(false),
  
  // Legacy departure settings
  departure_day: z.number().int().min(0).max(6).optional(),
  default_duration: z.number().int().min(1).optional(),
  default_capacity: z.number().int().min(1).optional(),
  
  // Pricing
  price_from: z.number().min(0).optional().nullable(),
  
  // Flags
  is_featured: z.boolean().default(false),
  is_published: z.boolean().default(false),
  
  // Related data
  images: z.array(z.string().url()).default([]),
  apartments: z.array(ApartmentFormSchema).default([]),
  room_types: z.array(RoomTypeFormSchema).default([]),
  price_intervals: z.array(PriceIntervalFormSchema).default([]),
  children_policies: z.array(ChildrenPolicyFormSchema).default([]),
  shifts: z.array(ShiftFormSchema).default([]),
})

// ============================================
// PRICE CALCULATION SCHEMAS
// ============================================

export const FiksniPriceInputSchema = z.object({
  apartment_id: z.string().uuid(),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
  shift_id: z.string().uuid().optional(),
  include_transport: z.boolean(),
  number_of_persons: z.number().int().min(1),
}).refine(
  (data) => new Date(data.check_out) > new Date(data.check_in),
  { message: 'Datum odlaska mora biti posle datuma dolaska', path: ['check_out'] }
)

export const NaUpitPriceInputSchema = z.object({
  package_id: z.string().uuid(),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
  room_type_id: z.string().uuid(),
  meal_plan: MealPlanCodeSchema,
  adults: z.number().int().min(1),
  children: z.array(z.object({ age: z.number().min(0) })).default([]),
}).refine(
  (data) => new Date(data.check_out) > new Date(data.check_in),
  { message: 'Datum odlaska mora biti posle datuma dolaska', path: ['check_out'] }
)

// ============================================
// INFERRED TYPES
// ============================================

export type ApartmentFormInput = z.infer<typeof ApartmentFormSchema>
export type RoomTypeFormInput = z.infer<typeof RoomTypeFormSchema>
export type PriceIntervalFormInput = z.infer<typeof PriceIntervalFormSchema>
export type HotelPriceFormInput = z.infer<typeof HotelPriceFormSchema>
export type ChildrenPolicyFormInput = z.infer<typeof ChildrenPolicyFormSchema>
export type ShiftFormInput = z.infer<typeof ShiftFormSchema>
export type GenerateShiftsInput = z.infer<typeof GenerateShiftsSchema>
export type PackageFormInput = z.infer<typeof PackageFormSchema>
export type FiksniPriceInput = z.infer<typeof FiksniPriceInputSchema>
export type NaUpitPriceInput = z.infer<typeof NaUpitPriceInputSchema>
