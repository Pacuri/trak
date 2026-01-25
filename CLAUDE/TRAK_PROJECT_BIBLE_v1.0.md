# TRAK - Complete Project Bible
## Version 1.0 | January 23, 2026

---

# TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Database Schema](#3-database-schema)
4. [User Flows](#4-user-flows)
5. [Feature Modules](#5-feature-modules)
6. [Implementation Status](#6-implementation-status)
7. [API Reference](#7-api-reference)
8. [Component Library](#8-component-library)
9. [Business Logic](#9-business-logic)
10. [Future Roadmap](#10-future-roadmap)

---

# 1. PROJECT OVERVIEW

## 1.1 Vision

TRAK transforms travel agency operations from manual chaos into automated efficiency. It's the **"Shopify for Travel Agencies"** - a complete full-funnel automation platform.

**The Problem:**
Serbian travel agencies manually handle inquiries via Viber, phone, and email. They lose leads, forget follow-ups, and have no system for converting interest into bookings.

**The Solution:**
One platform that handles the entire customer journey:
```
Ad → Qualification → Offer Matching → Reservation → Payment → Contract → Follow-up
```

## 1.2 Target Market

- **Primary:** Serbian travel agencies (language_region: 'rs')
- **Secondary:** Bosnian agencies ('ba'), Croatian agencies ('hr')
- **Industries:** Tour operators, travel agencies, hospitality

## 1.3 Core Value Propositions

1. **No Website Needed** - Agencies get a branded landing page at `/a/[slug]`
2. **No Booking System Needed** - Built-in reservation with 72h holds
3. **No CRM Needed** - Full lead pipeline with automation
4. **No Payment Processor Needed** - Integrated WSpay/Stripe
5. **AI-Powered** - Document parsing, smart matching, lead scoring


---

# 2. TECHNICAL ARCHITECTURE

## 2.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16.1.1        │ React 19.2.3       │ TypeScript 5      │
│  Tailwind CSS 4        │ Lucide Icons       │ Recharts          │
│  React Hook Form       │ Zod Validation     │ date-fns          │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  Supabase              │ PostgreSQL         │ Row Level Security│
│  Edge Functions        │ Realtime           │ Storage           │
├─────────────────────────────────────────────────────────────────┤
│                     AI / INTEGRATIONS                            │
├─────────────────────────────────────────────────────────────────┤
│  Anthropic Claude      │ OpenAI (backup)    │ Google APIs       │
│  Meta (FB/IG/WA)       │ Gmail/Outlook      │ WSpay/Stripe      │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/            # Main dashboard (protected)
│   │   ├── components/
│   │   └── dashboard/
│   ├── (onboarding)/           # New user onboarding
│   │   └── onboarding/
│   ├── (public)/               # Public-facing pages
│   │   ├── a/[slug]/          # Agency landing pages
│   │   └── invite/            # Team invitation acceptance
│   ├── api/                    # API routes
│   │   ├── agencies/
│   │   ├── analytics/
│   │   ├── bookings/
│   │   ├── cron/
│   │   ├── dashboard/
│   │   ├── departures/
│   │   ├── email/
│   │   ├── inbox/
│   │   ├── inquiries/
│   │   ├── integrations/
│   │   ├── leads/
│   │   ├── offer-quotes/
│   │   ├── offers/
│   │   ├── packages/
│   │   ├── public/
│   │   ├── reservations/
│   │   ├── team/
│   │   ├── transport-price-lists/
│   │   └── webhooks/
│   └── ponuda/[id]/           # Public offer view
│
├── components/
│   ├── admin/                  # Agency settings forms
│   ├── calculator/             # Price calculator
│   ├── chat/                   # Chat interface
│   ├── customers/              # Customer cards
│   ├── dashboard/              # Dashboard widgets
│   ├── inquiries/              # Inquiry management
│   ├── inquiry/                # Public inquiry form
│   ├── landing/                # Landing page builder
│   ├── lead-detail/            # Lead detail cards
│   ├── leads/                  # Lead components
│   ├── notifications/          # Toast/notifications
│   ├── offers/                 # Offer management
│   ├── packages/               # Package system (30+ components)
│   ├── pipeline/               # Kanban pipeline
│   ├── providers/              # React providers
│   ├── public/                 # Public-facing components
│   ├── qualification/          # Qualification flow steps
│   ├── reservations/           # Reservation cards
│   ├── trips/                  # Trip management
│   └── ui/                     # Base UI components
│
├── contexts/
│   ├── ChatContext.tsx
│   └── UserContext.tsx
│
├── hooks/
│   ├── use-agency-settings.ts
│   ├── use-bookings.ts
│   ├── use-dashboard-data.ts
│   ├── use-inquiries.ts
│   ├── use-inquiry-response.ts
│   ├── use-landing-settings.ts
│   ├── use-leads.ts
│   ├── use-offers.ts
│   ├── use-organization.ts
│   ├── use-packages.ts
│   ├── use-pipeline.ts
│   ├── use-qualification.ts
│   ├── use-reservations.ts
│   └── use-user.ts
│
├── lib/
│   ├── anthropic.ts            # Claude AI integration
│   ├── formatting.ts           # Data formatting
│   ├── labels.ts               # UI labels
│   ├── matching.ts             # Offer matching logic
│   ├── package-labels.ts       # Package display labels
│   ├── packages/               # Package business logic
│   │   ├── calculate-group-price.ts
│   │   ├── price-calculator.ts
│   │   ├── price-for-date.ts
│   │   └── validators.ts
│   ├── prompts/
│   │   └── document-parse-prompt.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── middleware.ts
│   │   └── server.ts
│   └── utils.ts
│
└── types/
    ├── dashboard.ts
    ├── import.ts
    ├── index.ts                # Core type definitions
    ├── inquiry.ts
    ├── landing.ts
    └── packages.ts             # Package type definitions
```

## 2.3 Multi-Tenant Architecture

TRAK uses organization-based multi-tenancy with Row Level Security (RLS).

```typescript
// Every table has organization_id
interface BaseEntity {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// RLS policies ensure data isolation
-- Example: leads table policy
CREATE POLICY "leads_org_isolation" ON leads
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

## 2.4 Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User visits /login                                       │
│        ↓                                                     │
│  2. Supabase Auth (email/password or magic link)            │
│        ↓                                                     │
│  3. Check if user exists in public.users table              │
│        ↓                                                     │
│  ┌─────┴─────┐                                              │
│  │           │                                              │
│  ↓ EXISTS    ↓ NOT EXISTS                                   │
│  │           │                                              │
│  │           └→ Redirect to /onboarding                     │
│  │                    ↓                                      │
│  │              Create organization                          │
│  │                    ↓                                      │
│  │              Create user record                           │
│  │                    ↓                                      │
│  └──────────→ Redirect to /dashboard                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```


---

# 3. DATABASE SCHEMA

## 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              TRAK DATABASE SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐               │
│  │  organizations  │────▶│      users      │────▶│ pipeline_stages │               │
│  │  (7 rows)       │     │  (7 rows)       │     │  (42 rows)      │               │
│  └────────┬────────┘     └─────────────────┘     └─────────────────┘               │
│           │                                                                         │
│           ├──────────────────────────────────────────────────────────┐              │
│           │                                                          │              │
│           ▼                                                          ▼              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │     leads       │────▶│ lead_activities │     │        packages             │   │
│  │  (13 rows)      │     │  (9 rows)       │     │        (37 rows)            │   │
│  └────────┬────────┘     └─────────────────┘     └────────────┬────────────────┘   │
│           │                                                   │                     │
│           │                                      ┌────────────┼────────────┐       │
│           │                                      │            │            │       │
│           │                                      ▼            ▼            ▼       │
│           │                              ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│           │                              │room_types │ │price_     │ │children_  │ │
│           │                              │(122 rows) │ │intervals  │ │policies   │ │
│           │                              └─────┬─────┘ │(238 rows) │ │(97 rules) │ │
│           │                                    │       └─────┬─────┘ └───────────┘ │
│           │                                    │             │                     │
│           │                                    └──────┬──────┘                     │
│           │                                           ▼                            │
│           │                                    ┌─────────────┐                     │
│           │                                    │hotel_prices │                     │
│           │                                    │(1087 rows)  │                     │
│           │                                    └─────────────┘                     │
│           │                                                                        │
│           ▼                                                                        │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐              │
│  │custom_inquiries │────▶│  reservations   │────▶│    bookings     │              │
│  │  (15 rows)      │     │  (0 rows)       │     │  (0 rows)       │              │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘              │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Core Tables

### organizations (7 rows)
Multi-tenant root table. All other tables reference this.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  industry VARCHAR,
  team_size VARCHAR,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  language_region TEXT DEFAULT 'ba' CHECK (language_region IN ('rs', 'ba', 'hr')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### users (7 rows)
Team members within an organization.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url TEXT,
  role VARCHAR DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### leads (13 rows)
Core CRM entity - potential customers.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  source_id UUID REFERENCES lead_sources(id),
  source_type VARCHAR,
  source_channel TEXT CHECK (source_channel IN ('email', 'messenger', 'instagram', 'whatsapp', 'web', 'manual')),
  source_inquiry_id UUID REFERENCES custom_inquiries(id),
  stage_id UUID REFERENCES pipeline_stages(id),
  assigned_to UUID REFERENCES users(id),
  destination VARCHAR,
  travel_date VARCHAR,
  guests INTEGER,
  budget NUMERIC,
  currency VARCHAR DEFAULT 'EUR',
  value NUMERIC,
  original_message TEXT,
  notes TEXT,
  tags TEXT[],
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  awaiting_response BOOLEAN DEFAULT false,
  response_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 3.3 Package System Tables

### packages (37 rows)
Core package entity with complex pricing support.

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Type: 'fiksni' (fixed inventory) or 'na_upit' (on-request)
  package_type VARCHAR NOT NULL CHECK (package_type IN ('fiksni', 'na_upit')),
  
  -- Basic info
  name VARCHAR NOT NULL,
  slug VARCHAR,
  description TEXT,
  destination_country VARCHAR NOT NULL,
  destination_city VARCHAR,
  hotel_name VARCHAR,
  hotel_stars INTEGER CHECK (hotel_stars >= 1 AND hotel_stars <= 5),
  accommodation_name VARCHAR,
  
  -- Travel details
  board_type VARCHAR,  -- 'all_inclusive', 'polupansion', 'dorucak', 'bez_ishrane'
  transport_type VARCHAR,  -- 'autobus', 'avion', 'sopstveni', 'brod'
  departure_location VARCHAR,
  meal_plans VARCHAR[] DEFAULT '{}',  -- Array of enabled meal plans
  
  -- Sale mode (for fiksni packages)
  sale_mode VARCHAR CHECK (sale_mode IN ('GRUPNO_SMENA', 'GRUPNO', 'INDIVIDUALNO')),
  
  -- Date ranges
  rental_period_start DATE,
  rental_period_end DATE,
  available_from DATE,
  available_to DATE,
  valid_from DATE,  -- Derived from price_intervals
  valid_to DATE,    -- Derived from price_intervals
  
  -- Transport pricing
  transport_price_fixed BOOLEAN DEFAULT false,
  transport_price_per_person NUMERIC,
  allow_own_transport BOOLEAN DEFAULT false,
  transport_price_list_id UUID REFERENCES transport_price_lists(id),
  
  -- Pricing metadata
  price_from NUMERIC,
  currency VARCHAR DEFAULT 'EUR',
  original_currency TEXT DEFAULT 'EUR',
  exchange_rate NUMERIC,
  prices_are_net BOOLEAN DEFAULT false,
  margin_percent NUMERIC,
  price_type TEXT DEFAULT 'per_person_per_stay' CHECK (price_type IN (
    'per_person_per_night', 'per_person_per_stay', 'per_room_per_night', 'per_unit'
  )),
  base_occupancy INTEGER DEFAULT 2,
  
  -- Import metadata
  supplier_name TEXT,
  source_document_url TEXT,
  included_services TEXT[],
  parsed_metadata JSONB DEFAULT '{}',
  
  -- Hotel details (from AI parsing)
  hotel_amenities TEXT[],
  distance_from_beach INTEGER,
  distance_from_center INTEGER,
  single_surcharge_percent NUMERIC,
  tax_disclaimer TEXT,
  
  -- Status flags
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

### room_types (122 rows)
Room configurations for na_upit packages.

```sql
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  code VARCHAR NOT NULL,  -- '1/2', '1/3', '1/4', '1/1'
  name VARCHAR NOT NULL,  -- 'Dvokrevetna', 'Trokrevetna'
  max_persons INTEGER NOT NULL CHECK (max_persons > 0),
  min_adults INTEGER DEFAULT 1,
  min_occupancy INTEGER DEFAULT 1,
  description TEXT,
  warnings TEXT[],
  single_surcharge_percent NUMERIC,
  distance_from_beach INTEGER,
  size_sqm INTEGER,
  has_elevator BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### price_intervals (238 rows)
Seasonal pricing periods.

```sql
CREATE TABLE price_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR,  -- 'Jun', 'Jul-Avg', 'Septembar'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### hotel_prices (1087 rows)
Per-person-per-night prices by room type, interval, and meal plan.

```sql
CREATE TABLE hotel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id),
  interval_id UUID NOT NULL REFERENCES price_intervals(id),
  room_type_id UUID NOT NULL REFERENCES room_types(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Price per person per night for each meal plan
  price_nd NUMERIC,  -- No meal (noćenje bez doručka)
  price_bb NUMERIC,  -- Bed & Breakfast
  price_hb NUMERIC,  -- Half Board (polupansion)
  price_fb NUMERIC,  -- Full Board
  price_ai NUMERIC,  -- All Inclusive
  
  -- Original prices before conversion
  original_price_nd NUMERIC,
  original_price_bb NUMERIC,
  original_price_hb NUMERIC,
  original_price_fb NUMERIC,
  original_price_ai NUMERIC,
  original_currency TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### children_policy_rules (97 rows)
Complex child discount rules with conditions.

```sql
CREATE TABLE children_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  rule_name TEXT,
  priority INTEGER DEFAULT 0,
  
  -- Conditions
  min_adults INTEGER,
  max_adults INTEGER,
  child_position INTEGER,  -- 1st child, 2nd child, etc.
  room_type_codes TEXT[],  -- ['1/2', '1/3']
  bed_type TEXT CHECK (bed_type IN ('any', 'separate', 'shared', 'extra')),
  
  -- Age range
  age_from NUMERIC DEFAULT 0,
  age_to NUMERIC DEFAULT 17.99,
  
  -- Discount
  discount_type TEXT NOT NULL CHECK (discount_type IN ('FREE', 'PERCENT', 'FIXED')),
  discount_value NUMERIC,
  
  source_text TEXT,  -- Original text from document
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```


## 3.4 Booking Flow Tables

### offers (52 rows)
Simplified offer representation for public display.

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Basic info
  name VARCHAR NOT NULL,
  description TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  
  -- Destination
  country VARCHAR NOT NULL,
  city VARCHAR,
  
  -- Dates
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Pricing
  price_per_person NUMERIC NOT NULL,
  original_price NUMERIC,
  currency VARCHAR DEFAULT 'EUR',
  
  -- Capacity
  total_spots INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  
  -- Details
  accommodation_type VARCHAR,  -- 'hotel', 'apartment', 'villa', 'any'
  board_type VARCHAR,          -- 'all_inclusive', 'half_board', 'breakfast', 'room_only', 'any'
  transport_type VARCHAR,      -- 'flight', 'bus', 'none', 'own'
  
  -- Inventory type (KEY FEATURE)
  inventory_type VARCHAR DEFAULT 'inquiry' CHECK (inventory_type IN ('owned', 'inquiry')),
  
  -- Status
  is_recommended BOOLEAN DEFAULT false,
  views_total INTEGER DEFAULT 0,
  views_last_24h INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'archived')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### reservations (0 rows - NOT YET IMPLEMENTED)
Temporary holds on offers (72h expiration).

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  offer_id UUID NOT NULL REFERENCES offers(id),
  lead_id UUID REFERENCES leads(id),
  
  code VARCHAR UNIQUE,  -- Human-readable reservation code
  
  -- Customer info
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR NOT NULL,
  customer_email VARCHAR,
  
  -- Guests
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[] DEFAULT '{}',
  
  -- Pricing
  total_price NUMERIC NOT NULL,
  deposit_amount NUMERIC,
  amount_paid NUMERIC DEFAULT 0,
  currency VARCHAR DEFAULT 'EUR',
  
  -- Payment
  payment_option VARCHAR,  -- 'deposit', 'full', 'agency', 'contact'
  
  -- Status
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'converted')),
  
  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_48h_sent BOOLEAN DEFAULT false,
  
  -- Qualification data
  qualification_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT
);
```

### bookings (0 rows - NOT YET IMPLEMENTED)
Confirmed travel bookings.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  offer_id UUID REFERENCES offers(id),
  reservation_id UUID REFERENCES reservations(id),
  lead_id UUID REFERENCES leads(id),
  closed_by UUID REFERENCES users(id),
  
  -- Customer info
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR,
  customer_email VARCHAR,
  
  -- Guests
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[] DEFAULT '{}',
  
  -- Pricing
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  currency VARCHAR DEFAULT 'EUR',
  
  -- Payment
  payment_method VARCHAR CHECK (payment_method IN ('card', 'bank', 'cash', 'mixed')),
  payment_status VARCHAR DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  
  -- Dates
  travel_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Status
  status VARCHAR DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  
  -- External booking support
  is_external BOOLEAN DEFAULT false,
  external_reference VARCHAR,
  external_destination VARCHAR,
  external_accommodation VARCHAR,
  external_dates VARCHAR,
  external_value NUMERIC,
  
  -- Cancellation
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  refund_amount NUMERIC,
  
  -- Timestamps
  booked_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### payments (0 rows - NOT YET IMPLEMENTED)
Payment records for reservations and bookings.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  reservation_id UUID REFERENCES reservations(id),
  booking_id UUID REFERENCES bookings(id),
  
  amount NUMERIC NOT NULL,
  currency VARCHAR DEFAULT 'EUR',
  
  payment_method VARCHAR CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'online')),
  status VARCHAR DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  transaction_id VARCHAR,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 3.5 Integration Tables

### custom_inquiries (15 rows)
Website form submissions from qualification flow.

```sql
CREATE TABLE custom_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  lead_id UUID REFERENCES leads(id),
  
  -- Customer info
  customer_name VARCHAR NOT NULL,
  customer_phone VARCHAR NOT NULL,
  customer_email VARCHAR,
  customer_note TEXT,
  
  -- Qualification data (full qualification flow data)
  qualification_data JSONB NOT NULL,
  
  -- Status
  status VARCHAR DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  source VARCHAR DEFAULT 'qualification_flow',
  
  -- Response tracking
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  response_type VARCHAR CHECK (response_type IN ('can_help', 'cannot_help', 'need_info')),
  response_message TEXT,
  internal_notes TEXT,
  
  -- Conversion tracking
  converted_to_lead_id UUID REFERENCES leads(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  contacted_at TIMESTAMPTZ
);
```

### meta_integrations (2 rows)
Facebook/Instagram/WhatsApp integration configuration.

```sql
CREATE TABLE meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  
  -- Facebook Page
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_access_token TEXT NOT NULL,
  
  -- Instagram
  instagram_account_id TEXT,
  instagram_username TEXT,
  
  -- WhatsApp
  whatsapp_phone_number_id TEXT,
  whatsapp_business_account_id TEXT,
  
  -- Security
  webhook_verify_token TEXT NOT NULL,
  
  -- Feature flags
  messenger_enabled BOOLEAN DEFAULT true,
  instagram_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Status
  last_webhook_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  connected_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### email_integrations (3 rows)
Gmail/Outlook email integration.

```sql
CREATE TABLE email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  
  provider TEXT DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'smtp')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Gmail-specific
  history_id TEXT,
  watch_expiration TIMESTAMPTZ,
  
  -- SMTP fallback
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  connected_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 3.6 Settings Tables

### agency_booking_settings (4 rows)
Public booking page configuration.

```sql
CREATE TABLE agency_booking_settings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id),
  
  -- URL slug
  slug VARCHAR UNIQUE,  -- /a/[slug]
  
  -- Agency branding
  agency_name VARCHAR,
  agency_logo_url TEXT,
  agency_description TEXT,
  
  -- Contact
  contact_phone VARCHAR,
  contact_email VARCHAR,
  contact_address TEXT,
  
  -- Working hours (JSONB)
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "13:00"},
    "sunday": {"enabled": false, "start": null, "end": null}
  }',
  
  -- Response times (minutes)
  response_time_working INTEGER DEFAULT 10,
  response_time_outside INTEGER DEFAULT 60,
  
  -- Reservation settings
  reservation_hold_hours INTEGER DEFAULT 72,
  deposit_percentage INTEGER DEFAULT 30,
  
  -- Abandoned cart settings
  abandoned_cart_enabled BOOLEAN DEFAULT true,
  abandoned_cart_discount_percent INTEGER DEFAULT 5,
  abandoned_cart_discount_hours INTEGER DEFAULT 72,
  abandoned_cart_email_1_hours INTEGER DEFAULT 2,
  abandoned_cart_email_2_hours INTEGER DEFAULT 24,
  abandoned_cart_email_3_hours INTEGER DEFAULT 72,
  
  -- Custom inquiry settings
  allow_custom_inquiries BOOLEAN DEFAULT true,
  show_inquiry_with_results BOOLEAN DEFAULT true,
  inquiry_response_text VARCHAR DEFAULT 'Javićemo vam se u roku od 24 sata',
  inquiry_notification_email VARCHAR,
  inquiry_notification_phone VARCHAR,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### agency_landing_settings (2 rows)
Landing page customization.

```sql
CREATE TABLE agency_landing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES organizations(id),
  
  -- Branding
  logo_url TEXT,
  logo_initials VARCHAR,
  primary_color VARCHAR DEFAULT '#0F766E',
  background_image_url TEXT,
  
  -- Copy
  headline TEXT DEFAULT 'Pronađite savršeno putovanje',
  subtitle TEXT DEFAULT 'Recite nam šta tražite, a mi ćemo vam pronaći idealne ponude za vas — za manje od 60 sekundi.',
  cta_text VARCHAR DEFAULT 'Započni pretragu',
  
  -- Specialization badge
  show_specialization BOOLEAN DEFAULT false,
  specialization_emoji VARCHAR,
  specialization_text VARCHAR,
  
  -- Stats section
  show_stats BOOLEAN DEFAULT false,
  stat_travelers INTEGER,
  stat_years INTEGER,
  stat_rating NUMERIC,
  stat_destinations INTEGER,
  
  -- Trust badges
  is_yuta_member BOOLEAN DEFAULT false,
  is_licensed BOOLEAN DEFAULT true,
  license_number VARCHAR,
  show_installments BOOLEAN DEFAULT false,
  show_secure_booking BOOLEAN DEFAULT true,
  
  -- Footer
  legal_name VARCHAR,
  footer_text VARCHAR,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```


---

# 4. USER FLOWS

## 4.1 Customer Journey (Public)

### Qualification Flow (~20 seconds, all taps)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUALIFICATION FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STEP 1: DESTINATION (2s)                                          │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                          │
│  │ 🇬🇷    │ │ 🇹🇷    │ │ 🇪🇬    │ │ 🇲🇪    │                          │
│  │Grčka  │ │Turska │ │Egipat │ │Crna G.│                          │
│  └───────┘ └───────┘ └───────┘ └───────┘                          │
│  → After country: City selection or "Svejedno mi je"              │
│                                                                     │
│  STEP 2: GUESTS (3s)                                               │
│  Adults: [1] [2] [3] [4] [5] [6+]                                  │
│  Children: [Nema] [1] [2] [3+]                                     │
│  → If kids: Age brackets [0-2] [3-6] [7-12] [13-17]               │
│                                                                     │
│  STEP 3: DATES (2s)                                                │
│  Month: [Jun] [Jul] [Avg] [Sept]                                   │
│  Duration: [7 noći] [10 noći] [14 noći] [Fleksibilno]             │
│  ☐ Fleksibilan sam ±3 dana                                        │
│                                                                     │
│  STEP 4: ACCOMMODATION (4s)                                        │
│  Type: [🏨 Hotel] [🏠 Apartman] [🏡 Vila] [Svejedno]               │
│  Board: [🍽️ All Inc.] [🥗 Polupansion] [☕ BB] [Svejedno]          │
│  Transport: [✈️ Sa prevozom] [🚗 Bez - idem sam]                   │
│                                                                     │
│  STEP 5: BUDGET (2s)                                               │
│  [do €300] [€300-500] [€500-700] [€700+] [💰 Nije bitna]          │
│                                                                     │
│  STEP 6: CONTACT (5s - only step with typing)                      │
│  Name: _______________                                             │
│  Phone: _______________                                            │
│  Email (optional): _______________                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Results Page - Two Inventory Types

After qualification, results are split into two sections:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🎉 10 aranžmana za vas                                            │
│  Grčka, Halkidiki • 2+2 • Jul • All Inclusive                      │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  ⚡ REZERVIŠITE ODMAH (3)                                          │
│  Garantovana dostupnost • Cena zaključana 72h                      │
│  ─────────────────────────────────────────────────────────────────  │
│  [Shows inventory_type = 'owned' offers]                           │
│  - Capacity bars visible: █████████░ 10/12                        │
│  - CTA: "Rezerviši odmah →"                                        │
│  - Urgency labels: "🔥 POSLEDNJA 2 MESTA"                         │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════   │
│                                                                     │
│  📋 NA UPIT (7)                                                    │
│  Proveravamo dostupnost • ⚡ Odgovor u roku od 10 min              │
│  ─────────────────────────────────────────────────────────────────  │
│  [Shows inventory_type = 'inquiry' offers]                         │
│  - No capacity bars (availability unknown)                         │
│  - CTA: "Pošalji upit →"                                          │
│  - Shows response time based on working hours                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Reservation Flow (for 'owned' inventory)

```
Customer clicks "Rezerviši odmah"
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    RESERVATION FORM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Offer Summary Card]                                               │
│  Hotel Azul ★★★★ • Halkidiki, Grčka                               │
│  15-22. jul • 7 noći • All Inclusive                               │
│  2 odraslih + 2 dece (5, 8 god)                                    │
│  ────────────────────────────                                      │
│  Ukupno: €2,196                                                    │
│                                                                     │
│  ⏱️ Ova cena važi još 23:59:42                                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Contact info (pre-filled from qualification)                      │
│  Name: _______________                                             │
│  Phone: _______________                                            │
│  Email: _______________                                            │
│                                                                     │
│  Payment option:                                                    │
│  ○ Depozit 30% (€659) - kartično                                  │
│  ○ Puna cena (€2,196) - kartično                                  │
│  ○ Plaćanje u agenciji                                            │
│  ○ Agent neka me kontaktira                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        🔒 REZERVIŠI - Besplatno, bez obaveze               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
        ↓
Creates reservation with:
- 72h hold (expires_at = now + 72h)
- status = 'pending'
- Decrements available_spots on offer
        ↓
Automated follow-up sequence:
- +24h: reminder_24h_sent (email/SMS)
- +48h: reminder_48h_sent (email/SMS)
- +72h: Expires or converts to booking
```

### Inquiry Flow (for 'inquiry' inventory)

```
Customer clicks "Pošalji upit"
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    INQUIRY FORM                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Pošaljite upit za Villa Sunset                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Photo]  Villa Sunset ★★★★                                  │   │
│  │          Krf, Grčka • 18-28. jul • €489/os                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Contact (pre-filled):                                             │
│  Ime i prezime: _______________                                    │
│  Telefon: _______________                                          │
│  Email: _______________                                            │
│                                                                     │
│  Poruka (opciono):                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Interesuje me soba sa pogledom na more...                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ℹ️ Vaši podaci o putovanju su sačuvani                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              📋 POŠALJI UPIT                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
        ↓
Creates offer_inquiry with status = 'pending'
        ↓
Agent receives notification
        ↓
Agent checks with supplier
        ↓
Agent responds:
- Available → Creates reservation for customer
- Unavailable → Suggests alternatives
```

## 4.2 Agent Dashboard Flows

### Daily Workflow

```
Agent logs in to /dashboard
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT DASHBOARD                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔔 ATTENTION REQUIRED (Priority)                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 3 inquiries waiting > 1h                                    │   │
│  │ 2 reservations expiring today                               │   │
│  │ 5 leads awaiting response                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📥 NEW EMAILS (Inbox Widget)                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 12 new emails • 3 potential leads                           │   │
│  │ [Accept] [Dismiss] for each                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📋 INQUIRIES WAITING                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Marko P. - Grčka, jul, 2+2 - 45min ago                     │   │
│  │ [Respond] [Convert to Lead]                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📞 LEADS TO CALL                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Ana M. - Follow-up overdue by 2 days                       │   │
│  │ Stefan K. - New, not contacted                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ✈️ TODAY'S DEPARTURES                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 3 groups departing • 47 travelers                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🏠 TODAY'S RETURNS                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2 groups returning • 31 travelers                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📊 CAPACITY OVERVIEW                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Next 7 days: 85% filled                                    │   │
│  │ Low availability: Hotel Azul (2 spots)                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Lead Pipeline (Kanban)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PIPELINE VIEW                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Novi (5)    │ Kontaktiran │ Ponuda      │ Zatvoreno  │ Izgubljeno │
│  ──────────  │ (8)         │ poslata (3) │ ✓ (12)     │ ✗ (4)      │
│              │             │             │            │            │
│  ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌────────┐ │ ┌────────┐ │
│  │ Marko P.│ │ │ Ana M.  │ │ │Stefan K.│ │ │ Ivan   │ │ │ Dragan │ │
│  │ 🇬🇷 Jul  │ │ │ 🇹🇷 Aug  │ │ │ 🇪🇬 Sep  │ │ │ €2,400 │ │ │ No resp│ │
│  │ €500-700│ │ │ €300-500│ │ │ €700+   │ │ │ ✓      │ │ │        │ │
│  └─────────┘ │ └─────────┘ │ └─────────┘ │ └────────┘ │ └────────┘ │
│              │             │             │            │            │
│  ┌─────────┐ │ ┌─────────┐ │             │            │            │
│  │ Jelena  │ │ │ Nikola  │ │             │            │            │
│  │ 🇲🇪 Jun  │ │ │ 🇭🇷 Jul  │ │             │            │            │
│  └─────────┘ │ └─────────┘ │             │            │            │
│              │             │             │            │            │
│  [Drag & Drop to move leads between stages]                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```


---

# 5. FEATURE MODULES

## 5.1 Package System (HEAVILY IMPLEMENTED)

The most complex module in TRAK. Supports two package types:

### Package Types

| Type | Code | Use Case | Pricing Model |
|------|------|----------|---------------|
| **Fiksni** | `fiksni` | Pre-contracted inventory (apartments) | Per-night by apartment type |
| **Na Upit** | `na_upit` | On-request hotel packages | Per-person-per-night by room type + meal plan |

### Sale Modes (for Fiksni)

| Mode | Description |
|------|-------------|
| `GRUPNO_SMENA` | Group tours with fixed shifts (ture) |
| `GRUPNO` | Group bookings without shifts |
| `INDIVIDUALNO` | Individual apartment rentals |

### Pricing System

```typescript
// Na Upit pricing calculation
interface NaUpitPriceCalculation {
  // Inputs
  package_id: string;
  check_in: Date;
  check_out: Date;
  room_type_id: string;
  meal_plan: 'ND' | 'BB' | 'HB' | 'FB' | 'AI';
  adults: number;
  children: { age: number }[];
  
  // Process
  // 1. Find applicable price_intervals for date range
  // 2. Get hotel_prices for room_type + interval
  // 3. Select price by meal_plan (price_nd, price_bb, etc.)
  // 4. Multiply by nights in each interval
  // 5. Apply children_policy_rules discounts
  // 6. Add transport_prices if applicable
  
  // Output
  accommodation_total: number;
  transport_total: number;
  total: number;
  breakdown: PriceBreakdownItem[];
}
```

### Children Policy Rules

Complex conditional discounts:

```typescript
interface ChildrenPolicyRule {
  rule_name: string;           // "Dete do 2g besplatno uz 2 odraslih"
  priority: number;            // Rule matching order
  
  // Conditions
  min_adults?: number;         // e.g., 2
  max_adults?: number;
  child_position?: number;     // 1st child, 2nd child
  room_type_codes?: string[];  // ['1/2', '1/3']
  bed_type?: 'any' | 'separate' | 'shared' | 'extra';
  
  // Age range
  age_from: number;            // 0
  age_to: number;              // 1.99
  
  // Discount
  discount_type: 'FREE' | 'PERCENT' | 'FIXED';
  discount_value?: number;     // 50 for 50%, or fixed amount
}
```

### Document Import Flow (AI-Powered)

```
Agent uploads PDF/Image
        ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT IMPORT                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Upload document (drag & drop)                                   │
│        ↓                                                            │
│  2. AI parses with Anthropic Claude                                 │
│     - Extracts hotel info, room types, prices                      │
│     - Recognizes price intervals (seasonal)                        │
│     - Parses children policies                                     │
│     - Identifies supplements and fees                              │
│        ↓                                                            │
│  3. Review parsed data (ImportReviewScreen)                        │
│     - Shows extracted package data                                 │
│     - Allows corrections before import                             │
│        ↓                                                            │
│  4. Import creates:                                                │
│     - Package record                                               │
│     - Room types                                                   │
│     - Price intervals                                              │
│     - Hotel prices (per room × interval × meal plan)              │
│     - Children policy rules                                        │
│     - Supplements, fees, policies, notes                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 5.2 Lead Management (CRM)

### Pipeline Stages (default)

| Position | Name | Slug | Color | Type |
|----------|------|------|-------|------|
| 1 | Novi | novi | Gray | Default |
| 2 | Kontaktiran | kontaktiran | Blue | - |
| 3 | Ponuda poslata | ponuda-poslata | Purple | - |
| 4 | Pregovaranje | pregovaranje | Yellow | - |
| 5 | Zatvoreno | zatvoreno | Green | Won |
| 6 | Izgubljeno | izgubljeno | Red | Lost |

### Lead Sources

| Type | Channel | Description |
|------|---------|-------------|
| `web` | web | Qualification flow on landing page |
| `email` | email | Gmail/Outlook integration |
| `messenger` | messenger | Facebook Messenger |
| `instagram` | instagram | Instagram DMs |
| `whatsapp` | whatsapp | WhatsApp Business |
| `manual` | manual | Manually created |

### Lead Scoring (Planned)

```typescript
interface LeadScore {
  // Engagement signals
  emailOpens: number;
  linkClicks: number;
  reservationAttempts: number;
  
  // Fit signals
  budgetMatch: boolean;
  destinationAvailable: boolean;
  dateFlexibility: boolean;
  
  // Urgency signals
  travelDateProximity: number;  // days until travel
  competitorMentions: boolean;
  
  totalScore: number;  // 0-100
  priority: 'hot' | 'warm' | 'cold';
}
```

## 5.3 Communication Hub

### Email Integration

```
Gmail OAuth Flow
        ↓
email_integrations record created
        ↓
Gmail Watch API registered (push notifications)
        ↓
New emails → email_candidates table
        ↓
Agent reviews in Inbox Widget
        ↓
[Accept] → Creates lead + links messages
[Dismiss] → Archives candidate
```

### Meta Integration (FB/IG/WhatsApp)

```
Facebook Page connected
        ↓
meta_integrations record created
        ↓
Webhook receives messages
        ↓
meta_conversations record created/updated
        ↓
messages table populated
        ↓
Agent sees in Chat interface
        ↓
Agent responds → Message sent via Meta API
```

## 5.4 Custom Inquiries

For leads that don't match any offer or want custom quotes:

```typescript
interface CustomInquiry {
  id: string;
  organization_id: string;
  
  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_note?: string;
  
  // Full qualification data
  qualification_data: {
    destination: { country: string; city?: string };
    guests: { adults: number; children: number; childAges: number[] };
    dates: { month?: string; duration: number; flexible: boolean };
    accommodation: { type?: string; board?: string; transport?: string };
    budget: { min?: number; max?: number; perPerson: boolean };
  };
  
  // Response flow
  status: 'new' | 'contacted' | 'converted' | 'closed';
  responded_at?: Date;
  responded_by?: string;
  response_type?: 'can_help' | 'cannot_help' | 'need_info';
  response_message?: string;
  
  // Conversion
  converted_to_lead_id?: string;
}
```

## 5.5 Offer Quotes

Send personalized quotes to leads:

```typescript
interface OfferQuote {
  id: string;
  organization_id: string;
  lead_id?: string;
  inquiry_id?: string;
  package_id?: string;
  
  // Snapshot (frozen at send time)
  package_snapshot: {
    name: string;
    hotel_name: string;
    destination: string;
    // ... all relevant package details
  };
  
  // Customer
  customer_name: string;
  customer_email?: string;
  
  // Trip details
  travel_dates: { start: Date; end: Date };
  guests: { adults: number; children: number; childAges: number[] };
  destination: string;
  
  // Pricing
  price_breakdown: PriceBreakdownItem[];
  total_amount: number;
  currency: string;
  
  // Status tracking
  status: 'draft' | 'sent' | 'viewed' | 'confirmed' | 'rejected' | 'expired';
  sent_at?: Date;
  viewed_at?: Date;
  confirmed_at?: Date;
  valid_until?: Date;
  
  // Messaging
  agent_message?: string;
  notes?: string;
}
```


---

# 6. IMPLEMENTATION STATUS

## 6.1 Status Legend

| Icon | Status | Description |
|------|--------|-------------|
| ✅ | Complete | Fully implemented and tested |
| 🔨 | In Progress | Partially implemented |
| ⏳ | Planned | Designed but not started |
| ❌ | Not Started | Database exists, no UI/logic |

## 6.2 Module Status

### Core Infrastructure ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-tenant architecture | ✅ | RLS policies on all tables |
| Authentication (Supabase) | ✅ | Email/password + magic link |
| User management | ✅ | Roles: owner, admin, agent |
| Organization settings | ✅ | language_region support |
| Team invitations | ✅ | Token-based invite flow |

### Package System ✅

| Feature | Status | Data |
|---------|--------|------|
| Package CRUD | ✅ | 37 packages |
| Room types | ✅ | 122 room types |
| Price intervals | ✅ | 238 intervals |
| Hotel prices | ✅ | 1,087 price entries |
| Children policies | ✅ | 97 policy rules |
| Document import (AI) | ✅ | 52 imports processed |
| Transport price lists | ✅ | 9 price lists, 17 prices |
| Supplements | ✅ | 33 supplements |
| Fees | ✅ | 29 fees |
| Policies | ✅ | 23 policies |
| Notes | ✅ | 103 notes |
| Package departures | ✅ | 12 departures |
| Package images | ✅ | 22 images |

### Lead Management (CRM) ✅

| Feature | Status | Data |
|---------|--------|------|
| Pipeline stages | ✅ | 42 stages (6 per org) |
| Lead sources | ✅ | 49 sources |
| Lead CRUD | ✅ | 13 leads |
| Lead activities | ✅ | 9 activities |
| Kanban drag-drop | ✅ | @hello-pangea/dnd |
| Lead detail view | ✅ | Full lead cards |
| Offer quotes | ✅ | 2 quotes |
| Sent offers tracking | ✅ | 4 sent offers |

### Communication Hub 🔨

| Feature | Status | Data |
|---------|--------|------|
| Email integration (Gmail) | ✅ | 3 integrations |
| Email candidates | ✅ | 47 candidates |
| Messages table | ✅ | 33 messages |
| Meta integration | ✅ | 2 integrations |
| Meta conversations | ✅ | 2 conversations |
| Chat interface | 🔨 | Basic implementation |
| Reply to emails | 🔨 | Partial |
| Reply to Messenger | ⏳ | Planned |

### Public Booking Flow 🔨

| Feature | Status | Data |
|---------|--------|------|
| Agency landing page | ✅ | /a/[slug] |
| Landing settings | ✅ | 2 settings |
| Qualification flow | ✅ | All steps |
| Offers display | ✅ | 52 offers |
| Offer images | ✅ | 92 images |
| Custom inquiries | ✅ | 15 inquiries |
| Response time display | ✅ | Dynamic based on hours |
| Booking settings | ✅ | 4 settings |
| Offer views tracking | ❌ | 0 views |
| Offer inquiries | ❌ | 0 inquiries |

### Reservation System ❌

| Feature | Status | Data |
|---------|--------|------|
| Reservations | ❌ | 0 reservations |
| 72h hold timer | ❌ | Not implemented |
| Expiration cron | ❌ | Not implemented |
| Reminder emails | ❌ | Not implemented |
| Reservation form | 🔨 | Component exists |

### Booking System ❌

| Feature | Status | Data |
|---------|--------|------|
| Bookings | ❌ | 0 bookings |
| External bookings | ❌ | Not implemented |
| Booking conversion | ❌ | Not implemented |

### Payment System ❌

| Feature | Status | Data |
|---------|--------|------|
| Payments | ❌ | 0 payments |
| WSpay integration | ❌ | Not implemented |
| Stripe integration | ❌ | Not implemented |
| Payment recording | ❌ | Not implemented |

### Abandoned Cart ❌

| Feature | Status | Data |
|---------|--------|------|
| Abandoned carts | ❌ | 0 carts |
| Discount codes | ❌ | Not implemented |
| Recovery emails | ❌ | Not implemented |

### Analytics ⏳

| Feature | Status | Data |
|---------|--------|------|
| Daily reconciliations | ❌ | 0 records |
| Dashboard stats | 🔨 | Basic stats |
| Conversion tracking | ⏳ | Planned |
| Revenue reports | ⏳ | Planned |

## 6.3 Data Summary (Current State)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE STATISTICS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CORE                          │  PACKAGES                          │
│  ─────────────────────────────│──────────────────────────────────  │
│  organizations:           7   │  packages:               37        │
│  users:                   7   │  room_types:            122        │
│  pipeline_stages:        42   │  price_intervals:       238        │
│  lead_sources:           49   │  hotel_prices:        1,087        │
│                               │  children_policy_rules:  97        │
│  LEADS                        │  transport_price_lists:   9        │
│  ─────────────────────────────│  transport_prices:       17        │
│  leads:                  13   │  package_images:         22        │
│  lead_activities:         9   │  package_supplements:    33        │
│  messages:               33   │  package_fees:           29        │
│  custom_inquiries:       15   │  package_policies:       23        │
│  offer_quotes:            2   │  package_notes:         103        │
│  lead_sent_offers:        4   │  package_departures:     12        │
│                               │  document_imports:       52        │
│  OFFERS                       │                                    │
│  ─────────────────────────────│  INTEGRATIONS                      │
│  offers:                 52   │──────────────────────────────────  │
│  offer_images:           92   │  email_integrations:      3        │
│  offer_views:             0   │  email_candidates:       47        │
│  offer_inquiries:         0   │  meta_integrations:       2        │
│                               │  meta_conversations:      2        │
│  BOOKINGS (NOT IMPLEMENTED)   │                                    │
│  ─────────────────────────────│  SETTINGS                          │
│  reservations:            0   │──────────────────────────────────  │
│  bookings:                0   │  agency_booking_settings: 4        │
│  payments:                0   │  agency_landing_settings: 2        │
│  abandoned_carts:         0   │  team_invitations:        1        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```


---

# 7. API REFERENCE

## 7.1 API Route Structure

All API routes are in `/src/app/api/`. They use Next.js App Router conventions.

### Authentication Required Routes

| Path | Methods | Description |
|------|---------|-------------|
| `/api/agencies/settings` | GET, PATCH | Agency booking settings |
| `/api/analytics/stats` | GET | Dashboard statistics |
| `/api/bookings/[id]` | GET, PATCH, DELETE | Booking management |
| `/api/dashboard/data` | GET | Dashboard aggregated data |
| `/api/departures/[id]` | GET, PATCH, DELETE | Departure management |
| `/api/email/connect` | POST | Connect email integration |
| `/api/email/send` | POST | Send email via integration |
| `/api/inbox/candidates` | GET, PATCH | Email candidates |
| `/api/inquiries/[id]` | GET, PATCH | Custom inquiry management |
| `/api/integrations/meta` | GET, POST | Meta integration |
| `/api/leads/[id]` | GET, PATCH, DELETE | Lead CRUD |
| `/api/leads/[id]/activities` | GET, POST | Lead activities |
| `/api/offer-quotes/[id]` | GET, PATCH | Offer quotes |
| `/api/offers/[id]` | GET, PATCH, DELETE | Offer CRUD |
| `/api/packages/[id]` | GET, PATCH, DELETE | Package CRUD |
| `/api/packages/import` | POST | AI document import |
| `/api/reservations/[id]` | GET, PATCH | Reservation management |
| `/api/team/invite` | POST | Team invitations |
| `/api/team/members` | GET | Team member list |
| `/api/transport-price-lists` | GET, POST | Transport pricing |

### Public Routes (No Auth)

| Path | Methods | Description |
|------|---------|-------------|
| `/api/public/agency/[slug]` | GET | Public agency settings |
| `/api/public/offers` | GET | Matching offers for qualification |
| `/api/public/inquiry` | POST | Submit custom inquiry |
| `/api/public/reservation` | POST | Create reservation |
| `/api/t/[trackingId]` | GET | Track sent offer views |

### Webhook Routes

| Path | Methods | Description |
|------|---------|-------------|
| `/api/webhooks/meta` | GET, POST | Meta (FB/IG) webhooks |
| `/api/webhooks/gmail` | POST | Gmail push notifications |
| `/api/webhooks/stripe` | POST | Stripe payment webhooks |

### Cron Routes

| Path | Description |
|------|-------------|
| `/api/cron/expire-reservations` | Expire old reservations |
| `/api/cron/send-reminders` | Send reminder emails |
| `/api/cron/refresh-tokens` | Refresh OAuth tokens |

## 7.2 Common Response Patterns

### Success Response
```typescript
{
  success: true,
  data: T
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    message: string,
    code?: string,
    details?: any
  }
}
```

### Paginated Response
```typescript
{
  success: true,
  data: T[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    hasMore: boolean
  }
}
```

---

# 8. COMPONENT LIBRARY

## 8.1 Dashboard Components

| Component | Path | Description |
|-----------|------|-------------|
| `AttentionRequired` | `/dashboard/AttentionRequired.tsx` | Priority items widget |
| `CapacityOverview` | `/dashboard/CapacityOverview.tsx` | Inventory status |
| `InboxWidget` | `/dashboard/InboxWidget.tsx` | New emails/messages |
| `InquiriesWaiting` | `/dashboard/InquiriesWaiting.tsx` | Pending inquiries |
| `LeadsToCall` | `/dashboard/LeadsToCall.tsx` | Follow-up queue |
| `TodaysDepartures` | `/dashboard/TodaysDepartures.tsx` | Departing travelers |
| `TodaysReturns` | `/dashboard/TodaysReturns.tsx` | Returning travelers |
| `StatCards` | `/dashboard/StatCards.tsx` | Key metrics |
| `QuickActionButtons` | `/dashboard/QuickActionButtons.tsx` | Common actions |

## 8.2 Package Components

| Component | Path | Description |
|-----------|------|-------------|
| `PackageForm` | `/packages/PackageForm.tsx` | Full package editor |
| `PackageFormWizard` | `/packages/PackageFormWizard.tsx` | Step-by-step creation |
| `PackageCard` | `/packages/PackageCard.tsx` | Package list item |
| `PackagesList` | `/packages/PackagesList.tsx` | Package grid/list |
| `DocumentImportFlow` | `/packages/DocumentImportFlow.tsx` | AI import wizard |
| `ImportReviewScreen` | `/packages/ImportReviewScreen.tsx` | Review parsed data |
| `RoomTypesConfig` | `/packages/RoomTypesConfig.tsx` | Room type editor |
| `HotelPriceMatrix` | `/packages/HotelPriceMatrix.tsx` | Price grid editor |
| `ChildrenPolicyConfig` | `/packages/ChildrenPolicyConfig.tsx` | Discount rules |
| `DeparturesTable` | `/packages/DeparturesTable.tsx` | Departure list |
| `DepartureModal` | `/packages/DepartureModal.tsx` | Departure editor |
| `CapacityBar` | `/packages/CapacityBar.tsx` | Visual capacity indicator |

## 8.3 Public Components

| Component | Path | Description |
|-----------|------|-------------|
| `LandingHero` | `/landing/LandingHero.tsx` | Hero section |
| `FloatingOfferCards` | `/landing/FloatingOfferCards.tsx` | Animated offer cards |
| `LandingStats` | `/landing/LandingStats.tsx` | Trust statistics |
| `LandingTrustBadges` | `/landing/LandingTrustBadges.tsx` | YUTA, license badges |
| `InquiryForm` | `/inquiry/InquiryForm.tsx` | Custom inquiry form |
| `ResultsSection` | `/public/ResultsSection.tsx` | Offer results display |
| `InstantOfferCard` | `/public/InstantOfferCard.tsx` | Owned inventory card |
| `InquiryOfferCard` | `/public/InquiryOfferCard.tsx` | On-request card |
| `ReservationForm` | `/public/ReservationForm.tsx` | Booking form |
| `ResponseTimeDisplay` | `/public/ResponseTimeDisplay.tsx` | Dynamic response time |
| `EmailCapturePopup` | `/public/EmailCapturePopup.tsx` | Exit intent popup |

## 8.4 Qualification Flow Components

All in `/qualification/`:

| Component | Description |
|-----------|-------------|
| `CountryStep` | Destination country selection |
| `CityStep` | City selection or "any" |
| `AdultsStep` | Adult count |
| `ChildrenStep` | Children count |
| `ChildAgesStep` | Age brackets for each child |
| `MonthStep` | Travel month |
| `DurationStep` | Trip duration |
| `FlexibilityStep` | Date flexibility toggle |
| `AccommodationTypeStep` | Hotel/apartment/villa |
| `BoardTypeStep` | Meal plan selection |
| `TransportTypeStep` | Transport preference |
| `BudgetStep` | Budget range |
| `QualificationProgress` | Progress indicator |
| `ChipSelector` | Reusable chip selector |

## 8.5 Pipeline Components

| Component | Path | Description |
|-----------|------|-------------|
| `PipelineBoard` | `/pipeline/PipelineBoard.tsx` | Kanban board |
| `PipelineColumn` | `/pipeline/PipelineColumn.tsx` | Stage column |
| `PipelineCard` | `/pipeline/PipelineCard.tsx` | Lead card |
| `PipelineCardV2` | `/pipeline/PipelineCardV2.tsx` | Enhanced card |

## 8.6 Lead Detail Components

All in `/lead-detail/`:

| Component | Description |
|-----------|-------------|
| `ClientInfoCard` | Contact information |
| `TripDetailsCard` | Travel preferences |
| `PipelineProgress` | Stage progression |
| `CommunicationCard` | Message history |
| `SentOffersCard` | Sent quotes |
| `FinancialsCard` | Value & payments |
| `NotesCard` | Internal notes |
| `ChecklistCard` | To-do items |
| `QuickActionsCard` | Action buttons |
| `AssignedAgentCard` | Agent assignment |


---

# 9. BUSINESS LOGIC

## 9.1 Price Calculation Engine

Located in `/lib/packages/`:

### `price-for-date.ts`
Determines which price interval applies for a given date.

```typescript
export function getPriceIntervalForDate(
  intervals: PriceInterval[],
  date: Date
): PriceInterval | null {
  return intervals.find(interval => {
    const start = new Date(interval.start_date);
    const end = new Date(interval.end_date);
    return date >= start && date <= end;
  }) || null;
}
```

### `price-calculator.ts`
Main pricing engine for na_upit packages.

```typescript
export function calculateNaUpitPrice(input: NaUpitPriceInput): PriceResult {
  // 1. Get all nights in range
  const nights = getNightsBetween(input.check_in, input.check_out);
  
  // 2. Group nights by price interval
  const nightsByInterval = groupNightsByInterval(nights, input.intervals);
  
  // 3. Get price for each interval
  let accommodationTotal = 0;
  const breakdown: PriceBreakdownItem[] = [];
  
  for (const [intervalId, nightCount] of nightsByInterval) {
    const hotelPrice = findHotelPrice(input.hotel_prices, {
      interval_id: intervalId,
      room_type_id: input.room_type_id
    });
    
    const pricePerNight = hotelPrice[`price_${input.meal_plan.toLowerCase()}`];
    const subtotal = pricePerNight * nightCount * input.adults;
    
    accommodationTotal += subtotal;
    breakdown.push({ intervalId, nightCount, pricePerNight, subtotal });
  }
  
  // 4. Calculate children prices with policy rules
  const childrenTotal = calculateChildrenPrice(input);
  
  // 5. Add transport if applicable
  const transportTotal = calculateTransport(input);
  
  return {
    accommodation_total: accommodationTotal + childrenTotal,
    transport_total: transportTotal,
    total: accommodationTotal + childrenTotal + transportTotal,
    breakdown
  };
}
```

### `calculate-group-price.ts`
Group pricing for tours.

## 9.2 Offer Matching Algorithm

Located in `/lib/matching.ts`:

```typescript
export function matchOffers(
  offers: Offer[],
  qualification: QualificationData
): MatchedOffer[] {
  return offers
    .filter(offer => {
      // Destination match
      if (qualification.destination.country !== offer.country) return false;
      if (qualification.destination.city && 
          qualification.destination.city !== offer.city) return false;
      
      // Date match (if exact dates provided)
      if (qualification.dates.exactStart) {
        const offerDate = new Date(offer.departure_date);
        const queryDate = new Date(qualification.dates.exactStart);
        const diffDays = Math.abs(daysBetween(offerDate, queryDate));
        if (!qualification.dates.flexible && diffDays > 0) return false;
        if (qualification.dates.flexible && diffDays > 3) return false;
      }
      
      // Month match
      if (qualification.dates.month) {
        const offerMonth = new Date(offer.departure_date).getMonth();
        const queryMonth = parseMonth(qualification.dates.month);
        if (offerMonth !== queryMonth) return false;
      }
      
      // Budget match
      if (qualification.budget.max) {
        const price = qualification.budget.perPerson 
          ? offer.price_per_person 
          : offer.price_per_person * qualification.guests.adults;
        if (price > qualification.budget.max) return false;
      }
      
      // Accommodation type match
      if (qualification.accommodation.type && 
          qualification.accommodation.type !== 'any' &&
          offer.accommodation_type !== qualification.accommodation.type) {
        return false;
      }
      
      // Board type match
      if (qualification.accommodation.board &&
          qualification.accommodation.board !== 'any' &&
          offer.board_type !== qualification.accommodation.board) {
        return false;
      }
      
      return true;
    })
    .map(offer => ({
      ...offer,
      matchScore: calculateMatchScore(offer, qualification),
      urgencyLabel: calculateUrgencyLabel(offer)
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
```

## 9.3 Urgency Labels System

50% of offers show urgency labels to create FOMO without label fatigue.

```typescript
export function calculateUrgencyLabel(offer: Offer): UrgencyLabel | null {
  // 50% chance to show any label
  if (Math.random() > 0.5) return null;
  
  // Priority order of labels
  if (offer.available_spots <= 2) {
    return { type: 'POSLEDNJA_MESTA', text: `Još samo ${offer.available_spots}!`, color: 'red' };
  }
  
  if (offer.available_spots / offer.total_spots < 0.2) {
    return { type: 'POPUNJAVA_SE', text: 'Popunjava se', color: 'orange' };
  }
  
  if (offer.original_price && offer.price_per_person < offer.original_price) {
    const discount = Math.round((1 - offer.price_per_person / offer.original_price) * 100);
    return { type: 'SNIZENO', text: `-${discount}%`, color: 'green' };
  }
  
  if (isNewOffer(offer)) {
    return { type: 'NOVO', text: 'Novo', color: 'blue' };
  }
  
  if (offer.is_recommended) {
    return { type: 'PREPORUCUJEMO', text: 'Preporučujemo', color: 'purple' };
  }
  
  return null;
}
```

## 9.4 Dynamic Response Time

Based on agency working hours:

```typescript
export function calculateResponseTime(
  workingHours: WorkingHours,
  now: Date = new Date()
): ResponseTimeInfo {
  const dayOfWeek = getDayName(now.getDay());
  const todaySchedule = workingHours[dayOfWeek];
  const currentTime = formatTime(now);
  
  // During working hours
  if (todaySchedule.enabled && 
      currentTime >= todaySchedule.start && 
      currentTime <= todaySchedule.end) {
    return {
      message: 'Odgovor u roku od 10 minuta',
      icon: '⚡',
      isWorkingHours: true
    };
  }
  
  // After hours - find next working day
  const nextWorkingDay = findNextWorkingDay(workingHours, now);
  const nextSchedule = workingHours[nextWorkingDay.day];
  
  if (nextWorkingDay.isTomorrow) {
    return {
      message: `Odgovaramo sutra od ${nextSchedule.start}`,
      icon: '🌙',
      isWorkingHours: false
    };
  }
  
  return {
    message: `Odgovaramo u ${nextWorkingDay.dayName} od ${nextSchedule.start}`,
    icon: '📅',
    isWorkingHours: false
  };
}
```

## 9.5 AI Document Parsing

Located in `/lib/prompts/document-parse-prompt.ts`:

The AI prompt instructs Claude to extract:
- Hotel info (name, stars, location, amenities)
- Room types (codes, descriptions, capacities)
- Price intervals (seasonal periods)
- Price matrix (per room type × interval × meal plan)
- Children policies (age ranges, conditions, discounts)
- Supplements and fees
- Booking policies
- Important notes

Output is structured JSON that maps directly to database tables.

---

# 10. FUTURE ROADMAP

## 10.1 Immediate Priorities (Q1 2026)

### Reservation System (Critical)
- [ ] Implement reservation creation flow
- [ ] Add 72h expiration with cron job
- [ ] Build reminder email system (24h, 48h)
- [ ] Create reservation management UI
- [ ] Add capacity tracking updates

### Payment Integration
- [ ] Integrate WSpay for Serbian market
- [ ] Add Stripe as backup/international
- [ ] Implement deposit vs full payment options
- [ ] Build payment confirmation flow
- [ ] Add refund handling

### Booking Conversion
- [ ] Auto-convert paid reservations
- [ ] Create booking management UI
- [ ] Build traveler list views
- [ ] Add departure/return tracking

## 10.2 Short-term (Q2 2026)

### Abandoned Cart Recovery
- [ ] Track cart abandonment
- [ ] Implement email sequence (2h, 24h, 72h)
- [ ] Generate discount codes
- [ ] Build recovery analytics

### Advanced Analytics
- [ ] Conversion funnel tracking
- [ ] Revenue reports by source
- [ ] Agent performance metrics
- [ ] Package profitability analysis

### Communication Enhancements
- [ ] Reply to Facebook Messenger
- [ ] Reply to Instagram DMs
- [ ] WhatsApp Business integration
- [ ] SMS notifications

## 10.3 Medium-term (Q3-Q4 2026)

### AI Enhancements
- [ ] Message intent detection
- [ ] Auto-suggest responses
- [ ] Lead scoring with ML
- [ ] Screenshot/image parsing

### Mobile App
- [ ] Agent mobile app (React Native)
- [ ] Push notifications
- [ ] Quick actions on-the-go
- [ ] Offline capability

### Contract & Document Generation
- [ ] Auto-generate contracts
- [ ] E-signature integration
- [ ] Invoice generation
- [ ] Receipt emails

## 10.4 Long-term Vision

### Gamification
- [ ] Agent leaderboards
- [ ] Achievement badges
- [ ] Commission tracking
- [ ] Performance goals

### Multi-region Expansion
- [ ] Full Croatian localization
- [ ] Bosnian market features
- [ ] Regional payment methods
- [ ] Local supplier integrations

### API & Integrations
- [ ] Public API for partners
- [ ] Booking.com sync
- [ ] Airline GDS integration
- [ ] Accounting software integration

---

# APPENDIX A: Type Definitions

See `/src/types/index.ts` for complete TypeScript definitions.

Key exports:
- `Organization`, `User`, `PipelineStage`, `LeadSource`, `Lead`
- `Offer`, `OfferImage`, `OfferView`, `OfferInquiry`
- `Reservation`, `Booking`, `Payment`, `AbandonedCart`
- `CustomInquiry`, `QualificationData`
- `AgencyBookingSettings`, `WorkingHours`, `DaySchedule`

See `/src/types/packages.ts` for package-related types:
- `Package`, `PackageType`, `SaleMode`, `PackageStatus`
- `Departure`, `PackageDeparture`
- `RoomType`, `HotelPrice`, `PriceInterval`
- `ChildrenPolicy`, `ChildrenPolicyRule`
- `PackageSupplement`, `PackageFee`, `PackageDiscount`
- `PackagePolicy`, `PackageNote`

---

# APPENDIX B: Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Google (Gmail)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Meta (Facebook/Instagram)
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=

# Payments
WSPAY_SHOP_ID=
WSPAY_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://trak.rs
```

---

# APPENDIX C: Deployment

### Vercel Configuration
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js Version: 20.x

### Supabase Configuration
- Region: eu-central-1 (Frankfurt)
- Database: PostgreSQL 15
- Edge Functions: Enabled
- Realtime: Enabled

---

**Document Version:** 1.0
**Last Updated:** January 23, 2026
**Author:** Claude (AI Assistant)
**Project:** TRAK - Travel Agency Automation Platform

