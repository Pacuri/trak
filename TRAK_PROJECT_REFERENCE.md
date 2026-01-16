# TRAK Project Reference

> Complete technical reference for the TRAK travel agency CRM platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Reference](#6-api-reference)
7. [Components Library](#7-components-library)
8. [Hooks Reference](#8-hooks-reference)
9. [Utility Functions](#9-utility-functions)
10. [Type Definitions](#10-type-definitions)
11. [Business Logic](#11-business-logic)
12. [Customization System](#12-customization-system)
13. [Development Guidelines](#13-development-guidelines)

---

## 1. Project Overview

### What is TRAK?

TRAK is a **full-funnel automation platform** for Serbian travel agencies - positioned as "Shopify for Travel Agencies." It handles the complete customer journey:

- **Lead Capture** - From Facebook ads, Instagram, Viber, WhatsApp, phone, email
- **Qualification Flow** - 20-second tap-based questionnaire
- **Offer Matching** - Smart algorithm matching offers to customer needs
- **Reservation System** - 72-hour holds with automated follow-ups
- **Payment Processing** - Deposit and full payment options
- **Contract Generation** - Automated PDF contracts
- **Trip Management** - Kanban-style traveler management

### Core User Flow

```
Facebook/IG Ad → Landing Page → Qualification (17-20 sec)
                                      ↓
                              Matching Offers
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
            "Reserve Now"                      "Send Inquiry"
            (Instant Booking)                  (On-Request)
                    ↓                                   ↓
            Reservation Form                   Inquiry Form
                    ↓                                   ↓
            Payment + Hold (72h)               Agent Response
                    ↓                                   ↓
            Confirmation                       Offer → Reserve
```

### Two Inventory Types

| Type | Description | Booking Flow |
|------|-------------|--------------|
| **Owned (Instant)** | Pre-booked capacity | Reserve → Pay → Confirmed |
| **Inquiry (On-Request)** | Requires supplier verification | Inquire → Wait → Reserve |

---

## 2. Tech Stack

### Core Technologies

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Backend/DB | Supabase | - |
| Auth | Supabase Auth | - |

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Database client |
| `@supabase/ssr` | Server-side rendering support |
| `@hello-pangea/dnd` | Drag and drop (Kanban boards) |
| `react-hook-form` | Form state management |
| `zod` | Schema validation |
| `date-fns` | Date utilities |
| `lucide-react` | Icon library |
| `recharts` | Charts and analytics |

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config (React compiler enabled, strict mode disabled for DnD) |
| `tsconfig.json` | TypeScript config (ES2017 target, strict mode, `@/*` path alias) |
| `.env.local` | Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |

---

## 3. Project Structure

```
/src
├── /app                              # Next.js App Router
│   ├── /(auth)                       # Public auth pages
│   │   ├── login/
│   │   └── register/
│   │
│   ├── /(onboarding)                 # New user setup
│   │   └── onboarding/
│   │
│   ├── /(public)                     # Public-facing pages
│   │   └── /a/[slug]/                # Agency pages (by slug)
│   │       ├── page.tsx              # Landing page
│   │       ├── qualify/              # Qualification flow
│   │       ├── results/              # Search results
│   │       ├── offer/[offerId]/      # Offer detail
│   │       ├── reserve/[offerId]/    # Reservation form
│   │       ├── inquiry/              # Custom inquiry
│   │       └── confirmation/         # Success page
│   │
│   ├── /(dashboard)                  # Protected dashboard
│   │   └── /dashboard/
│   │       ├── page.tsx              # Dashboard home
│   │       ├── offers/               # Offer management
│   │       ├── leads/                # Lead management
│   │       ├── inquiries/            # Inquiry management
│   │       ├── reservations/         # Reservation management
│   │       ├── pipeline/             # Sales pipeline (Kanban)
│   │       ├── trips/                # Trip management
│   │       ├── analytics/            # Analytics
│   │       ├── settings/             # Agency settings
│   │       └── integrations/         # Third-party integrations
│   │
│   └── /api                          # API Routes
│       ├── /offers/                  # Offer CRUD
│       ├── /inquiries/               # Inquiry management
│       ├── /bookings/                # Booking management
│       ├── /reservations/            # Reservation management
│       ├── /agencies/                # Agency settings
│       └── /public/                  # Public APIs (no auth)
│
├── /components                       # React components
│   ├── /admin/                       # Settings components
│   ├── /landing/                     # Landing page components
│   ├── /qualification/               # Multi-step form (19 components)
│   ├── /offers/                      # Offer management
│   ├── /inquiry/                     # Inquiry forms
│   ├── /public/                      # Public-facing components
│   ├── /pipeline/                    # Kanban board
│   ├── /trips/                       # Trip management
│   └── /reservations/                # Reservation components
│
├── /hooks                            # Custom React hooks (11)
├── /lib                              # Utilities
│   ├── /supabase/                    # Supabase clients
│   ├── utils.ts                      # General utilities
│   ├── matching.ts                   # Offer matching algorithm
│   ├── labels.ts                     # Urgency label logic
│   └── formatting.ts                 # Date/price formatting
│
├── /types                            # TypeScript definitions
│   ├── index.ts                      # Main types (60+)
│   ├── inquiry.ts                    # Inquiry types
│   └── landing.ts                    # Landing page types
│
└── middleware.ts                     # Auth routing middleware
```

### Route Groups

| Group | Purpose | Auth Required |
|-------|---------|---------------|
| `(auth)` | Login, Register | No |
| `(onboarding)` | New user setup | Yes |
| `(public)` | Customer-facing pages | No |
| `(dashboard)` | Agent/Admin dashboard | Yes |

---

## 4. Database Schema

### Entity Relationship Overview

```
organizations (tenant)
    │
    ├── users (team members)
    │
    ├── offers ──────────────────┐
    │   ├── offer_images         │
    │   ├── offer_views          │
    │   └── offer_inquiries ─────┼──→ reservations
    │                            │
    ├── reservations ────────────┤
    │   └── payments             │
    │                            │
    ├── bookings ────────────────┘
    │   └── payments
    │
    ├── leads
    │   └── lead_activities
    │
    ├── abandoned_carts
    │
    ├── agency_booking_settings (1:1)
    │
    └── notifications
```

### Core Tables

#### organizations
Top-level tenant entity.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Organization name |
| slug | text | URL identifier (unique) |
| settings | jsonb | Custom settings |

#### users
Team members within an organization.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.uid) |
| organization_id | uuid | FK to organizations |
| email | text | User email |
| full_name | text | Display name |
| role | text | 'owner' \| 'admin' \| 'agent' |
| is_active | boolean | Account status |

#### offers
Travel packages/deals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| title | text | Offer title |
| country | text | Destination country |
| city | text | Destination city |
| departure_date | date | Start date |
| return_date | date | End date |
| price_per_person | numeric | Price |
| original_price | numeric | Price before discount |
| total_spots | int | Total capacity |
| available_spots | int | Remaining capacity |
| inventory_type | text | 'owned' \| 'inquiry' |
| accommodation_type | text | 'hotel' \| 'apartment' \| 'villa' \| 'any' |
| board_type | text | 'all_inclusive' \| 'half_board' \| 'breakfast' \| 'room_only' \| 'any' |
| transport_type | text | 'flight' \| 'bus' \| 'none' \| 'own' |
| status | text | 'active' \| 'sold_out' \| 'archived' |
| views_total | int | Total views |
| views_last_24h | int | Recent views |

#### reservations
Temporary holds on offers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| offer_id | uuid | FK to offers |
| lead_id | uuid | FK to leads |
| code | text | Unique code (TRK-YYYY-NNNNNN) |
| customer_name | text | Customer name |
| customer_phone | text | Customer phone |
| customer_email | text | Customer email |
| adults | int | Number of adults |
| children | int | Number of children |
| total_price | numeric | Total amount |
| deposit_amount | numeric | Required deposit |
| amount_paid | numeric | Amount paid |
| payment_option | text | 'deposit' \| 'full' \| 'agency' \| 'contact' |
| status | text | 'pending' \| 'paid' \| 'expired' \| 'cancelled' \| 'converted' |
| expires_at | timestamp | Hold expiration |

#### bookings
Confirmed sales.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| offer_id | uuid | FK to offers |
| reservation_id | uuid | FK to reservations |
| lead_id | uuid | FK to leads |
| closed_by | uuid | FK to users |
| payment_method | text | 'card' \| 'bank' \| 'cash' \| 'mixed' |
| payment_status | text | 'paid' \| 'partial' \| 'unpaid' |
| status | text | 'confirmed' \| 'cancelled' \| 'completed' |

#### offer_inquiries
Custom inquiries for on-request offers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| offer_id | uuid | FK to offers (nullable) |
| customer_name | text | Customer name |
| customer_email | text | Customer email |
| message | text | Customer message |
| qualification_data | jsonb | Search criteria |
| status | text | 'pending' \| 'checking' \| 'available' \| 'unavailable' \| 'alternative' \| 'expired' |
| responded_by | uuid | FK to users |
| responded_at | timestamp | Response time |
| reservation_id | uuid | If converted to reservation |

#### agency_booking_settings
Agency configuration (1:1 with organization).

| Column | Type | Description |
|--------|------|-------------|
| organization_id | uuid | FK to organizations (unique) |
| slug | text | Public URL slug (unique) |
| display_name | text | Public display name |
| logo_url | text | Logo URL |
| primary_color | text | Brand color hex |
| working_hours | jsonb | Business hours |
| allow_online_payment | boolean | Enable online payments |
| allow_deposit_payment | boolean | Enable deposits |
| allow_custom_inquiries | boolean | Enable custom inquiries |

### Database Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| booking_capacity_decrease | bookings | Decreases offer spots on insert |
| booking_capacity_restore | bookings | Restores spots on cancellation |
| reservation_capacity_hold | reservations | Holds spots on pending |
| reservation_capacity_restore | reservations | Restores on expiry/cancel |
| payment_update_reservation | payments | Updates amount_paid |
| reservation_code_gen | reservations | Auto-generates TRK-YYYY-NNNNNN |

### Row Level Security (RLS)

All tables have RLS enabled. Key patterns:

**Organization-scoped access:**
```sql
-- Users can only access data in their organization
organization_id = get_user_organization_id(auth.uid())
```

**Public read access (offers, settings):**
```sql
-- Active offers are publicly visible
status = 'active'
```

**Public write access (reservations, inquiries):**
```sql
-- Anyone can create reservations/inquiries
WITH CHECK (true)
```

---

## 5. Authentication & Authorization

### Auth Flow

```
Request → middleware.ts
              │
              ├── No session → /login (public routes allowed)
              │
              ├── Session + no org → /onboarding
              │
              └── Session + org → dashboard access
```

### User Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access, can manage team |
| `admin` | Most access, can manage team |
| `agent` | Day-to-day operations only |

### Middleware Logic

```typescript
// middleware.ts
1. Refresh Supabase session
2. Get current user
3. If no user:
   - Public routes (/a/*, /login, /register) → allow
   - Protected routes → redirect to /login
4. If user without organization:
   - /onboarding → allow
   - Others → redirect to /onboarding
5. If authenticated user on auth pages:
   - Redirect to /dashboard
```

### Supabase Client Setup

| File | Use Case |
|------|----------|
| `lib/supabase/client.ts` | Browser/client components |
| `lib/supabase/server.ts` | Server components, API routes |
| `lib/supabase/middleware.ts` | Middleware session handling |

---

## 6. API Reference

### Public APIs (No Auth Required)

#### GET `/api/public/agencies/[slug]`
Get agency info by slug.

#### GET `/api/public/agencies/[slug]/landing`
Get landing page configuration.

#### GET `/api/public/agencies/[slug]/offers`
Get active offers for agency.

#### GET `/api/public/agencies/[slug]/cities`
Get available destination cities.

#### POST `/api/public/qualify`
Run qualification matching.

```typescript
// Request
{
  slug: string,
  qualification_data: QualificationData
}

// Response
{
  offers: Offer[],
  match_scores: number[]
}
```

#### POST `/api/public/reservations`
Create a reservation.

```typescript
// Request
{
  offer_id: string,
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  adults: number,
  children: number,
  child_ages?: number[],
  payment_option: 'deposit' | 'full' | 'agency' | 'contact',
  notes?: string
}
```

#### POST `/api/public/inquiries`
Create a custom inquiry.

#### POST `/api/public/email-capture`
Capture abandoned cart email.

### Protected APIs (Auth Required)

#### Offers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/offers` | List offers (with filters) |
| POST | `/api/offers` | Create offer |
| GET | `/api/offers/[id]` | Get single offer |
| PUT | `/api/offers/[id]` | Update offer |
| DELETE | `/api/offers/[id]` | Delete offer |
| PUT | `/api/offers/[id]/capacity` | Update capacity |
| POST | `/api/offers/import` | CSV import |

#### Inquiries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inquiries` | List inquiries |
| POST | `/api/inquiries` | Create inquiry |
| GET | `/api/inquiries/[id]` | Get inquiry |
| PUT | `/api/inquiries/[id]` | Update status/response |

#### Reservations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reservations` | List reservations |
| POST | `/api/reservations` | Create reservation |
| GET | `/api/reservations/[id]` | Get reservation |
| PUT | `/api/reservations/[id]` | Update reservation |
| DELETE | `/api/reservations/[id]` | Cancel reservation |

#### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List bookings |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/[id]` | Get booking |
| PUT | `/api/bookings/[id]` | Update booking |

#### Agency Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/agencies/[org_id]/landing-settings` | Update landing page |

---

## 7. Components Library

### Landing Page Components (`/components/landing/`)

| Component | Description |
|-----------|-------------|
| `LandingHero` | Hero section with headline, subtitle, CTA |
| `LandingStats` | Statistics display (travelers, years, etc.) |
| `LandingTrustBadges` | Trust indicators (YUTA, License, etc.) |
| `LandingFooter` | Footer with contact info |
| `FloatingOfferCards` | Desktop floating offer previews |

### Qualification Flow (`/components/qualification/`)

19 step components for the multi-step qualification form:

| Component | Step |
|-----------|------|
| `CountryStep` | Select destination country |
| `CityStep` | Select destination city |
| `GuestsStep` | Total guests overview |
| `AdultsStep` | Number of adults |
| `ChildrenStep` | Number of children + ages |
| `DatesStep` | Date range picker |
| `MonthStep` | Preferred month |
| `DurationStep` | Trip duration |
| `FlexibilityStep` | Date flexibility |
| `AccommodationStep` | Accommodation preference |
| `AccommodationTypeStep` | Hotel/apartment/villa |
| `BoardTypeStep` | All-inclusive/half-board/etc. |
| `TransportTypeStep` | Flight/bus/own transport |
| `BudgetStep` | Budget per person |
| `QualificationProgress` | Progress bar |
| `ChipSelector` | Reusable chip selector |

### Offer Components (`/components/offers/`)

| Component | Description |
|-----------|-------------|
| `OfferForm` | Create/edit offer form |
| `OfferTableRow` | Table row in offer list |
| `CSVImportModal` | CSV import dialog |
| `QuickCapacityEditor` | Inline capacity editor |

### Public Components (`/components/public/`)

| Component | Description |
|-----------|-------------|
| `InstantOfferCard` | Offer card for owned inventory |
| `InquiryOfferCard` | Offer card for inquiry inventory |
| `ResultsSection` | Search results display |
| `ReservationForm` | Reservation form with payment options |
| `EmailCapturePopup` | Email capture modal |
| `ResponseTimeDisplay` | Expected response time |

### Pipeline Components (`/components/pipeline/`)

| Component | Description |
|-----------|-------------|
| `PipelineBoard` | Main Kanban board container |
| `PipelineColumn` | Individual stage column |
| `PipelineCard` | Lead card (draggable) |

### Admin Components (`/components/admin/`)

| Component | Description |
|-----------|-------------|
| `LandingPreview` | Live landing page preview |
| `LandingSettingsForm` | Landing page customization form |
| `InquirySettingsForm` | Inquiry configuration form |

---

## 8. Hooks Reference

### Data Management Hooks

#### `useOffers()`
CRUD operations for travel offers.

```typescript
const {
  offers,
  loading,
  error,
  fetchOffers,
  createOffer,
  updateOffer,
  deleteOffer
} = useOffers(filters?)
```

#### `useLeads()`
Lead management with pipeline support.

```typescript
const {
  leads,
  loading,
  fetchLeads,
  createLead,
  updateLead,
  updateLeadStage
} = useLeads()
```

#### `useInquiries()`
Custom inquiry management.

```typescript
const {
  inquiries,
  loading,
  fetchInquiries,
  updateInquiryStatus,
  respondToInquiry
} = useInquiries()
```

#### `useReservations()`
Reservation management.

```typescript
const {
  reservations,
  loading,
  fetchReservations,
  updateReservation,
  cancelReservation
} = useReservations()
```

#### `useBookings()`
Booking management.

```typescript
const {
  bookings,
  loading,
  fetchBookings,
  createBooking,
  updateBooking
} = useBookings()
```

### UI State Hooks

#### `useQualification()`
Multi-step qualification form state.

```typescript
const {
  currentStep,
  totalSteps,
  data,
  setData,
  nextStep,
  prevStep,
  progress,
  isComplete
} = useQualification()
```

#### `usePipeline()`
Kanban board stage management.

```typescript
const {
  stages,
  leads,
  moveLeadToStage,
  reorderLeads
} = usePipeline()
```

### Settings Hooks

#### `useOrganization()`
Current organization context.

```typescript
const { organization, loading } = useOrganization()
```

#### `useUser()`
Current user info and permissions.

```typescript
const { user, role, isOwner, isAdmin } = useUser()
```

#### `useAgencySettings()`
Agency booking configuration.

```typescript
const {
  settings,
  loading,
  updateSettings
} = useAgencySettings()
```

#### `useLandingSettings()`
Landing page customization.

```typescript
const {
  settings,
  loading,
  updateSettings
} = useLandingSettings()
```

---

## 9. Utility Functions

### Supabase Clients (`/lib/supabase/`)

```typescript
// Browser client
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server client
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

### Matching Algorithm (`/lib/matching.ts`)

```typescript
matchOffers(offers: Offer[], qualification: QualificationData): ScoredOffer[]
```

**Scoring System (Max 118 points):**

| Factor | Max Points | Logic |
|--------|------------|-------|
| Destination | 30 | Exact city match |
| Dates | 25 | Date range overlap |
| Budget | 20 | Within budget range |
| Accommodation | 10 | Type match |
| Board Type | 10 | Type match |
| Transport | 8 | Type match |
| Duration | 10 | Duration match |
| Capacity | 5 | Fits guest count |

### Urgency Labels (`/lib/labels.ts`)

```typescript
getUrgencyLabel(offer: Offer): UrgencyLabel | null
```

**Priority Order:**

1. `POSLEDNJA_MESTA` - Last spots (≤2 available) - 🔥 Red
2. `ISTICE_USKORO` - Expiring soon (≤7 days) - ⏰ Red
3. `POPUNJAVA_SE` - Filling up (≥70% booked) - 📈 Orange
4. `SNIZENO` - Discounted (≥10% off) - 💰 Green
5. `NOVO` - New (≤7 days old) - 🆕 Purple
6. `POPULARNO` - Popular (≥10 views/24h) - 📊 Blue

**Display frequency:** ~30% of eligible offers show labels.

### Formatting (`/lib/formatting.ts`)

```typescript
// Date formatting (Serbian locale)
formatDateRange(start: Date, end: Date): string
// "15. jan - 22. jan 2026"

// Price formatting
formatPrice(amount: number, currency?: string): string
// "1.299 €" or "153.900 RSD"

// Guest count
formatGuests(adults: number, children: number): string
// "2 odrasla, 1 dete"

// Response time
formatResponseTime(minutes: number): string
// "Do 2 sata" or "Do 24 sata"
```

### Avatar Generation (`/lib/avatar-utils.ts`)

```typescript
getInitials(name: string): string
getAvatarColor(name: string): string
```

---

## 10. Type Definitions

### Core Types (`/types/index.ts`)

```typescript
// Organization
interface Organization {
  id: string
  name: string
  slug: string
  industry?: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

// User
interface User {
  id: string
  organization_id: string
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'agent'
  avatar_url?: string
  is_active: boolean
}

// Offer
interface Offer {
  id: string
  organization_id: string
  title: string
  description?: string
  country: string
  city: string
  departure_date: string
  return_date: string
  price_per_person: number
  original_price?: number
  currency: string
  total_spots: number
  available_spots: number
  inventory_type: InventoryType
  accommodation_type: AccommodationType
  board_type: BoardType
  transport_type: TransportType
  hotel_name?: string
  hotel_stars?: number
  inclusions?: string[]
  status: OfferStatus
  views_total: number
  views_last_24h: number
  images?: OfferImage[]
}

// Reservation
interface Reservation {
  id: string
  organization_id: string
  offer_id: string
  lead_id?: string
  code: string
  customer_name: string
  customer_phone: string
  customer_email: string
  adults: number
  children: number
  child_ages?: number[]
  total_price: number
  deposit_amount: number
  amount_paid: number
  currency: string
  payment_option: PaymentOption
  status: ReservationStatus
  notes?: string
  expires_at: string
}

// Booking
interface Booking {
  id: string
  organization_id: string
  offer_id?: string
  reservation_id?: string
  lead_id?: string
  closed_by?: string
  customer_name: string
  customer_email: string
  customer_phone: string
  adults: number
  children: number
  total_price: number
  amount_paid: number
  currency: string
  payment_method?: PaymentMethod
  payment_status: PaymentStatus
  is_external: boolean
  status: BookingStatus
  travel_start_date?: string
  travel_end_date?: string
}
```

### Enum Types

```typescript
type InventoryType = 'owned' | 'inquiry'

type OfferStatus = 'active' | 'sold_out' | 'archived'

type AccommodationType = 'hotel' | 'apartment' | 'villa' | 'any'

type BoardType = 'all_inclusive' | 'half_board' | 'breakfast' | 'room_only' | 'any'

type TransportType = 'flight' | 'bus' | 'none' | 'own'

type ReservationStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'converted'

type PaymentOption = 'deposit' | 'full' | 'agency' | 'contact'

type BookingStatus = 'confirmed' | 'cancelled' | 'completed'

type PaymentStatus = 'paid' | 'partial' | 'unpaid'

type InquiryStatus = 'pending' | 'checking' | 'available' | 'unavailable' | 'alternative' | 'expired'
```

### Qualification Types

```typescript
interface QualificationData {
  destination: {
    country?: string
    city?: string
  }
  guests: {
    adults: number
    children: number
    childAges?: number[]
  }
  dates: {
    startDate?: string
    endDate?: string
    month?: string
    duration?: number
    isFlexible?: boolean
  }
  accommodation: {
    type?: AccommodationType
    boardType?: BoardType
    transportType?: TransportType
  }
  budget: {
    min?: number
    max?: number
    perPerson?: boolean
  }
}
```

### Landing Page Types (`/types/landing.ts`)

```typescript
interface AgencyLandingSettings {
  // Branding
  display_name?: string
  logo_url?: string
  primary_color?: string
  background_image_url?: string

  // Hero
  hero_headline?: string
  hero_subtitle?: string
  cta_text?: string
  specialization_emoji?: string
  specialization_text?: string

  // Stats
  show_stats?: boolean
  stat_travelers?: number
  stat_years?: number
  stat_rating?: number
  stat_destinations?: number

  // Trust badges
  show_yuta_badge?: boolean
  show_license_badge?: boolean
  license_number?: string
  show_installments_badge?: boolean
  show_secure_badge?: boolean

  // Inquiry settings
  allow_custom_inquiries?: boolean
  show_inquiry_with_results?: boolean
  inquiry_response_text?: string
}
```

---

## 11. Business Logic

### Offer Matching Algorithm

The matching algorithm scores offers against qualification data:

```typescript
function matchOffers(
  offers: Offer[],
  qualification: QualificationData
): ScoredOffer[] {
  return offers
    .map(offer => ({
      offer,
      score: calculateScore(offer, qualification)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
}

function calculateScore(offer: Offer, qual: QualificationData): number {
  let score = 0

  // Destination (30 points)
  if (qual.destination.city === offer.city) score += 30
  else if (qual.destination.country === offer.country) score += 15

  // Date overlap (25 points)
  score += calculateDateOverlap(offer, qual.dates) // 0-25

  // Budget (20 points)
  if (offer.price_per_person <= qual.budget.max) score += 20
  else if (offer.price_per_person <= qual.budget.max * 1.1) score += 10

  // ... additional factors

  return score
}
```

### Reservation Flow

```
Customer submits reservation
        ↓
API creates reservation (status: 'pending')
        ↓
Trigger: reservation_capacity_hold
        ↓
Offer available_spots decremented
        ↓
72-hour timer starts
        ↓
┌───────┴───────┐
↓               ↓
Payment      No Payment
received     (72h elapsed)
↓               ↓
status:      status:
'paid'       'expired'
↓               ↓
Trigger:     Trigger:
(none)       reservation_capacity_restore
↓               ↓
Convert to   Offer spots restored
Booking
```

### Urgency Label Logic

Labels display with ~30% frequency using deterministic selection:

```typescript
function shouldShowLabel(offer: Offer): boolean {
  // Use offer ID to create deterministic but seemingly random selection
  const hash = hashString(offer.id)
  return hash % 100 < 30 // ~30% show labels
}

function getLabel(offer: Offer): UrgencyLabel | null {
  if (!shouldShowLabel(offer)) return null

  // Priority order
  if (offer.available_spots <= 2) return 'POSLEDNJA_MESTA'
  if (daysUntilDeparture(offer) <= 7) return 'ISTICE_USKORO'
  if (occupancyRate(offer) >= 0.7) return 'POPUNJAVA_SE'
  if (discountPercent(offer) >= 0.1) return 'SNIZENO'
  if (daysOld(offer) <= 7) return 'NOVO'
  if (offer.views_last_24h >= 10) return 'POPULARNO'

  return null
}
```

---

## 12. Customization System

### Landing Page Customization

Agencies can customize their public landing page:

| Setting | Default | Description |
|---------|---------|-------------|
| `display_name` | Organization name | Public display name |
| `logo_url` | Initials | Logo image URL |
| `primary_color` | `#3B82F6` | Brand color |
| `background_image_url` | Auto (from offers) | Hero background |
| `hero_headline` | "Pronadite savrseno putovanje" | Main headline |
| `hero_subtitle` | "Recite nam sta trazite..." | Subtitle |
| `cta_text` | "Zapocni pretragu" | CTA button text |
| `show_stats` | false | Show statistics section |
| `show_yuta_badge` | false | YUTA membership badge |
| `show_license_badge` | false | License badge |
| `allow_custom_inquiries` | true | Enable custom inquiries |

### Agency Booking Settings

| Setting | Type | Description |
|---------|------|-------------|
| `working_hours` | JSON | Business hours by day |
| `response_time_minutes` | number | Expected response time |
| `reservation_hold_hours` | number | Default 72 hours |
| `allow_online_payment` | boolean | Enable online payments |
| `allow_deposit_payment` | boolean | Enable deposits |
| `deposit_percentage` | number | Deposit amount (default 30%) |
| `allow_custom_inquiries` | boolean | Enable custom inquiries |
| `inquiry_notification_email` | string | Email for new inquiries |
| `abandoned_cart_enabled` | boolean | Enable cart recovery |

### URL Entry Points

| Pattern | Use Case |
|---------|----------|
| `trak.rs/a/[slug]` | Main agency landing page |
| `trak.rs/a/[slug]/qualify` | Direct to qualification |
| `trak.rs/a/[slug]/offer/[id]` | Direct to specific offer |

---

## 13. Development Guidelines

### Code Patterns

#### Organization Scoping
**CRITICAL:** Every database query MUST filter by `organization_id`.

```typescript
// ✅ Correct
const { data } = await supabase
  .from('offers')
  .select('*')
  .eq('organization_id', orgId)

// ❌ Wrong - never do this
const { data } = await supabase
  .from('offers')
  .select('*')
```

#### API Route Pattern

```typescript
// app/api/offers/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Query with org scope
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('organization_id', userData.organization_id)

  return NextResponse.json(data)
}
```

#### Component Pattern

```typescript
// components/offers/OfferCard.tsx
'use client'

import { Offer } from '@/types'
import { formatPrice, formatDateRange } from '@/lib/formatting'
import { getUrgencyLabel } from '@/lib/labels'

interface OfferCardProps {
  offer: Offer
  onClick?: () => void
}

export function OfferCard({ offer, onClick }: OfferCardProps) {
  const label = getUrgencyLabel(offer)

  return (
    <div
      className="rounded-lg border p-4 cursor-pointer hover:shadow-md"
      onClick={onClick}
    >
      <h3 className="font-semibold">{offer.title}</h3>
      <p className="text-sm text-gray-600">
        {offer.city}, {offer.country}
      </p>
      <p className="text-sm">
        {formatDateRange(offer.departure_date, offer.return_date)}
      </p>
      <p className="font-bold">
        {formatPrice(offer.price_per_person)}
      </p>
      {label && <UrgencyBadge label={label} />}
    </div>
  )
}
```

### Localization

All user-facing text is in Serbian (Latin script). Use `date-fns` with Serbian locale:

```typescript
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

format(date, 'd. MMM yyyy', { locale: sr })
// "15. jan 2026"
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `OfferCard.tsx` |
| Hooks | camelCase with `use-` | `use-offers.ts` |
| Utilities | camelCase | `formatting.ts` |
| Types | camelCase | `index.ts` |
| API routes | lowercase | `route.ts` |

### Import Aliases

Use the `@/` alias for all imports:

```typescript
import { Offer } from '@/types'
import { useOffers } from '@/hooks/use-offers'
import { formatPrice } from '@/lib/formatting'
import { createClient } from '@/lib/supabase/client'
```

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Key File Locations

| What | Where |
|------|-------|
| Pages | `src/app/` |
| Components | `src/components/` |
| Hooks | `src/hooks/` |
| Types | `src/types/` |
| Utilities | `src/lib/` |
| API Routes | `src/app/api/` |
| Supabase clients | `src/lib/supabase/` |
| Middleware | `src/middleware.ts` |

---

*Generated: January 2026*
*TRAK v2.1*
