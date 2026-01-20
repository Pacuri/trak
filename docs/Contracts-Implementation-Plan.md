# Contracts (Ugovori) Implementation Plan

> **Purpose:** Complete implementation plan for the contract/booking formalization system in Trak, based on AgTravelSoft's contract model, real contract examples, and detailed business requirements discussion.
>
> **Status:** FINAL - Ready for Implementation
>
> **Last Updated:** January 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [Package Ownership Model](#package-ownership-model)
4. [Contract Types & Flows](#contract-types--flows)
5. [Database Schema](#database-schema)
6. [Contract Numbering](#contract-numbering)
7. [Pricing & Currency](#pricing--currency)
8. [Payment Tracking](#payment-tracking)
9. [Contract Amendments (Anex)](#contract-amendments-anex)
10. [Document Templates](#document-templates)
11. [UI Components](#ui-components)
12. [Auto-Generation Logic](#auto-generation-logic)
13. [Implementation Phases](#implementation-phases)
14. [Technical Specifications](#technical-specifications)

---

## Executive Summary

### What We're Building

A complete contract management system that:
- Generates legally compliant travel contracts (Ugovori) for Serbian/BiH/Croatian markets
- Supports both direct sales (vlastiti paketi) and subagent resales (tuđi paketi)
- Tracks payments linked to contracts with deposit/balance workflow
- Produces PDF documents matching legal requirements
- Auto-generates contracts with zero manual input when data is complete

### Key Decisions Made

| Decision | Choice |
|----------|--------|
| Package Ownership | Toggle: Vlastiti (own) vs Tuđi (external) |
| External Organizer | Free text with legal warning (not all in Trak) |
| Contract Types | B2C (customer) + B2B (agency-to-agency) |
| Contract Numbering | Separate sequences: `1/2026` (B2C), `B-1/2026` (B2B) |
| Currency | Based on organization's operating country |
| Pricing Model | Wholesale + Margin % = Retail (per-package) |
| Capacity Deduction | On B2B confirmation, or B2C creation if no B2B |
| Payment Tracking | Linked to contracts (not separate module) |
| Signatures | Print & sign (MVP), digital signature (future) |
| Amendments | Anex ugovora system (legal paper trail) |
| Templates | Hybrid: locked legal structure + customizable branding |

---

## Business Requirements

### Three-Party Structure

Every travel contract involves up to three parties:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CONTRACT PARTIES                                  │
├────────────────────┬────────────────────┬────────────────────────────────────┤
│    ORGANIZATOR     │      SUBAGENT      │           NOSILAC                 │
│   (Tour Operator)  │   (Selling Agency) │      (Contract Holder)            │
├────────────────────┼────────────────────┼────────────────────────────────────┤
│ Creates packages   │ Sells to customers │ Signs the contract                │
│ Sets wholesale     │ Adds margin        │ Makes payments                    │
│ Confirms bookings  │ Issues contracts   │ Travels with saputnici            │
│                    │ Collects payments  │                                   │
├────────────────────┼────────────────────┼────────────────────────────────────┤
│ Example:           │ Example:           │ Example:                          │
│ TRGO TRAVEL DOO    │ MY TRAVEL          │ SELIMOVIĆ AMIR                    │
│ Sarajevo           │ Gradačac           │ Živinice                          │
└────────────────────┴────────────────────┴────────────────────────────────────┘
```

### Two Sales Scenarios

**Scenario 1: Own Package (Vlastiti)**
- Agency IS the tour operator
- Single contract: Agency → Customer
- Agency keeps 100% of revenue

**Scenario 2: External Package (Tuđi)**
- Agency is reselling another operator's package
- Two linked contracts:
  - B2B: Organizer → Subagent (wholesale price)
  - B2C: Subagent → Customer (retail price)
- Subagent keeps the margin

---

## Package Ownership Model

### UI: Package Form Toggle

When creating/editing a package, agents must specify ownership:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  OSNOVNI PODACI O PAKETU                                                    │
│                                                                             │
│  Naziv paketa: *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Pearl Beach Resort - Ulcinj 2026                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Vlasništvo paketa: *                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ◉ Vlastiti paket                                                   │   │
│  │    Vaša agencija je organizator ovog putovanja                      │   │
│  │                                                                     │   │
│  │  ○ Tuđi paket (preprodaja)                                          │   │
│  │    Prodajete paket drugog organizatora                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When "Tuđi paket" is Selected

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PODACI O ORGANIZATORU                                                      │
│                                                                             │
│  Organizator putovanja: *                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TRGO TRAVEL d.o.o. Sarajevo                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ VAŽNO - ZAKONSKA OBAVEZA                                        │   │
│  │                                                                     │   │
│  │  Unesite TAČAN PRAVNI NAZIV organizatora putovanja kako je         │   │
│  │  registrovan u sudskom registru.                                   │   │
│  │                                                                     │   │
│  │  Netačan naziv može uzrokovati NEVAŽEĆI UGOVOR i pravne probleme.  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CIJENE                                                                     │
│                                                                             │
│  Nabavna cijena (od organizatora): *                                       │
│  ┌──────────────┐                                                          │
│  │ 450.00       │ EUR  (cijena po osobi)                                   │
│  └──────────────┘                                                          │
│                                                                             │
│  Vaša marža: *                                                             │
│  ┌──────────────┐                                                          │
│  │ 12           │ %                                                        │
│  └──────────────┘                                                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  KALKULACIJA:                                                              │
│  Prodajna cijena (za klijenta):     504.00 EUR                             │
│  Vaša zarada po osobi:               54.00 EUR                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database: Package Ownership Fields

```sql
-- Add to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'own'
  CHECK (ownership_type IN ('own', 'resale'));

-- For resale packages: external organizer name (free text, LEGAL requirement)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS external_organizer_name TEXT;

-- Pricing for resale
ALTER TABLE packages ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2);
-- retail price = wholesale_price * (1 + margin_percent/100)

COMMENT ON COLUMN packages.external_organizer_name IS
  'LEGAL REQUIREMENT: Exact registered name of tour operator for resale packages';
```

---

## Contract Types & Flows

### Contract Type Definitions

| Type | Code | Numbering | Purpose |
|------|------|-----------|---------|
| Customer Contract | B2C | `1/2026`, `2/2026`... | Agency → Customer |
| Agency Contract | B2B | `B-1/2026`, `B-2/2026`... | Organizer → Subagent |
| Amendment | ANEX | `Anex #1 uz Ugovor 5/2026` | Changes to existing contract |

### Flow: Own Package (Vlastiti)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OWN PACKAGE SALE FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [Your Agency]                                    [Customer]               │
│   (Organizator & Seller)                           (Putnik)                 │
│         │                                               │                   │
│         │  1. Customer inquires / books                 │                   │
│         │<──────────────────────────────────────────────│                   │
│         │                                               │                   │
│         │  2. Create B2C Contract                       │                   │
│         │   - Contract #: 15/2026                       │                   │
│         │   - Full retail price                         │                   │
│         │   - Your agency as Organizator               │                   │
│         │──────────────────────────────────────────────>│                   │
│         │                                               │                   │
│         │  3. Customer signs & pays deposit             │                   │
│         │<──────────────────────────────────────────────│                   │
│         │                                               │                   │
│         │  4. Capacity deducted from departure          │                   │
│         │                                               │                   │
│         │  5. Customer pays balance                     │                   │
│         │<──────────────────────────────────────────────│                   │
│         │                                               │                   │
│         │  6. Issue voucher, complete travel            │                   │
│         │──────────────────────────────────────────────>│                   │
│                                                                             │
│   RESULT: Agency keeps 100% of revenue                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow: External Package (Tuđi)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL PACKAGE SALE FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [External Organizer]        [Your Agency]              [Customer]         │
│   (TRGO Travel)               (Subagent)                 (Putnik)           │
│         │                          │                          │             │
│         │                          │  1. Customer inquires    │             │
│         │                          │<─────────────────────────│             │
│         │                          │                          │             │
│         │  2. B2B Contract         │                          │             │
│         │     #: B-8/2026          │                          │             │
│         │     Wholesale: 450 EUR   │                          │             │
│         │<─────────────────────────│                          │             │
│         │                          │                          │             │
│         │  3. Organizer confirms   │                          │             │
│         │     (or rejects)         │                          │             │
│         │─────────────────────────>│                          │             │
│         │                          │                          │             │
│         │                          │  4. B2C Contract         │             │
│         │    ┌─────────────────────│     #: 15/2026           │             │
│         │    │ If REJECTED:        │     Retail: 504 EUR      │             │
│         │    │ Both contracts      │     Shows BOTH agencies  │             │
│         │    │ terminate           │─────────────────────────>│             │
│         │    └─────────────────────│                          │             │
│         │                          │                          │             │
│         │  5. Capacity deducted    │  6. Customer pays        │             │
│         │     on B2B confirm       │<─────────────────────────│             │
│         │                          │                          │             │
│         │  7. Subagent pays        │                          │             │
│         │     wholesale to         │                          │             │
│         │     organizer            │                          │             │
│         │<─────────────────────────│                          │             │
│                                                                             │
│   RESULT:                                                                   │
│   - Customer's contract shows: Organizer + Subagent + Retail price         │
│   - B2B contract shows: Wholesale price only                               │
│   - Subagent keeps: 54 EUR margin (12%)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Document Visibility Rules

| Document | Organizer Sees | Subagent Sees | Customer Sees |
|----------|---------------|---------------|---------------|
| B2B Contract | Wholesale price | Wholesale price | ❌ Never |
| B2C Contract | ❌ Never | Full document | Full document |
| Customer Contract Header | - | Listed as Subagent | Both agencies listed |

### Contract Status Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐
│  Draft  │───>│  Sent   │───>│ Signed  │───>│  Completed  │
│ (priprema)   │(poslano)│    │(potpisano)   │  (završeno) │
└─────────┘    └─────────┘    └─────────┘    └─────────────┘
     │              │              │
     │              │              │
     v              v              v
┌─────────────────────────────────────────────────────────┐
│                    Cancelled (storno)                    │
│                    Rejected (odbijeno) - B2B only        │
└─────────────────────────────────────────────────────────┘
```

**Status Definitions:**

| Status | Serbian | Description |
|--------|---------|-------------|
| draft | priprema | Contract being prepared, not yet sent |
| sent | poslano | Sent to customer, awaiting signature |
| signed | potpisano | Customer signed, deposit received |
| completed | završeno | Travel completed, fully paid |
| cancelled | storno | Cancelled before travel |
| rejected | odbijeno | B2B only: Organizer rejected booking |

---

## Database Schema

### Core Tables

#### 1. `contracts` - Main Contract Table

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contract identification
  contract_number TEXT NOT NULL,           -- "15 / 2026" or "B-8 / 2026"
  contract_type TEXT NOT NULL DEFAULT 'b2c' CHECK (contract_type IN ('b2c', 'b2b')),
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Party references
  -- For B2C: customer is the buyer
  -- For B2B: linked_agency_id is the other agency
  customer_id UUID REFERENCES customers(id),
  linked_agency_id UUID,                   -- For B2B: the other agency (may not be in Trak)
  linked_agency_name TEXT,                 -- Free text if agency not in system

  -- Link to package (determines if own or resale)
  package_id UUID REFERENCES packages(id),
  departure_id UUID REFERENCES package_departures(id),

  -- For B2B contracts: link to related B2C
  related_contract_id UUID REFERENCES contracts(id),

  -- Organizer info (from package or manual)
  organizer_name TEXT NOT NULL,            -- Legal requirement
  organizer_address TEXT,
  organizer_pib TEXT,                      -- Tax ID
  organizer_license TEXT,

  -- Accommodation details (snapshot at contract time)
  destination_country TEXT,
  destination_city TEXT,
  hotel_name TEXT,
  hotel_stars INTEGER,
  room_type TEXT,
  room_description TEXT,
  board_type TEXT,                         -- ALL INCLUSIVE, HB, BB, etc.

  -- Dates
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  duration_nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,

  -- Transport
  transport_type TEXT,                     -- 'own', 'bus', 'plane'
  departure_point TEXT,
  departure_time TIME,
  return_time TIME,

  -- Financial
  currency TEXT NOT NULL,                  -- EUR, BAM, RSD
  subtotal DECIMAL(10,2) NOT NULL,         -- Before discounts
  discount_total DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,     -- Final amount
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_remaining DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- For B2B: wholesale vs retail tracking
  wholesale_amount DECIMAL(10,2),          -- What subagent pays organizer
  margin_amount DECIMAL(10,2),             -- Subagent's profit

  -- Payment terms
  deposit_percent DECIMAL(5,2) DEFAULT 30,
  deposit_amount DECIMAL(10,2),
  deposit_due_date DATE,
  balance_due_date DATE,
  payment_deadline DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',      -- priprema
    'sent',       -- poslano
    'signed',     -- potpisano
    'completed',  -- završeno
    'cancelled',  -- storno
    'rejected'    -- odbijeno (B2B only)
  )),

  -- Signature tracking
  signed_at TIMESTAMPTZ,
  signed_by TEXT,                          -- Name of person who signed

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  refund_amount DECIMAL(10,2),

  -- Notes
  internal_notes TEXT,
  special_requests TEXT,
  terms_text TEXT,                         -- Custom terms if any

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_b2c CHECK (
    contract_type != 'b2c' OR customer_id IS NOT NULL
  ),
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Indexes
CREATE UNIQUE INDEX idx_contracts_org_number ON contracts(organization_id, contract_number);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_package ON contracts(package_id);
CREATE INDEX idx_contracts_status ON contracts(organization_id, status);
CREATE INDEX idx_contracts_dates ON contracts(organization_id, check_in_date);
CREATE INDEX idx_contracts_type ON contracts(organization_id, contract_type);
```

#### 2. `contract_passengers` - Travelers

```sql
CREATE TABLE contract_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Position and role
  position INTEGER NOT NULL,               -- 1, 2, 3...
  is_lead BOOLEAN DEFAULT false,           -- Is this the nosilac (contract holder)?

  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F')),

  -- Contact (usually only for lead passenger)
  phone TEXT,
  email TEXT,

  -- Address
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BiH',

  -- Travel documents
  passport_number TEXT,
  passport_expiry DATE,
  id_card_number TEXT,

  -- Passenger category
  passenger_type TEXT DEFAULT 'adult' CHECK (passenger_type IN (
    'adult',    -- odrasli
    'child',    -- dijete
    'infant'    -- beba
  )),
  age_at_travel INTEGER,                   -- Calculated from DOB

  -- For pricing
  price_category TEXT,                     -- Links to room type pricing

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_passengers_contract ON contract_passengers(contract_id);
CREATE INDEX idx_contract_passengers_lead ON contract_passengers(contract_id, is_lead) WHERE is_lead = true;
```

#### 3. `contract_services` - Line Items

```sql
CREATE TABLE contract_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Position on invoice
  position INTEGER NOT NULL,

  -- Service identification
  service_type TEXT NOT NULL CHECK (service_type IN (
    'accommodation',  -- Base room/package price
    'supplement',     -- Sea view, extra bed, etc.
    'fee',            -- Tourist tax, insurance
    'discount',       -- Early booking, etc.
    'transport',      -- Bus fare, etc.
    'other'           -- Manual entries
  )),
  service_code TEXT,                       -- 'ALL_INCLUSIVE', 'SEA_VIEW', etc.
  description TEXT NOT NULL,               -- Display text

  -- Pricing
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,      -- quantity * unit_price (can be negative for discounts)

  -- Discount specifics
  is_discount BOOLEAN DEFAULT false,
  discount_percent DECIMAL(5,2),

  -- Link to package pricing (for traceability)
  price_interval_id UUID REFERENCES price_intervals(id),
  supplement_id UUID REFERENCES package_supplements(id),
  fee_id UUID REFERENCES package_fees(id),
  discount_id UUID REFERENCES package_discounts(id),

  -- Per what?
  price_per TEXT DEFAULT 'person' CHECK (price_per IN (
    'person',         -- per person total
    'person_night',   -- per person per night
    'room',           -- per room total
    'room_night',     -- per room per night
    'booking'         -- flat fee
  )),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_services_contract ON contract_services(contract_id);
```

#### 4. `contract_payments` - Payment Records

```sql
CREATE TABLE contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Payment details
  payment_date DATE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'deposit',        -- akontacija
    'balance',        -- ostatak
    'full',           -- puna uplata
    'refund',         -- povrat
    'adjustment'      -- korekcija
  )),
  description TEXT,                        -- "AVANS", "OSTATAK", custom text

  -- Amount
  amount DECIMAL(10,2) NOT NULL,           -- Positive for payments, negative for refunds
  currency TEXT NOT NULL,

  -- Payment method
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash',           -- gotovina
    'bank_transfer',  -- uplata na račun
    'card',           -- kartica
    'online'          -- online plaćanje
  )),

  -- References
  reference_number TEXT,                   -- Receipt/transaction number
  bank_statement_ref TEXT,

  -- For refunds
  is_refund BOOLEAN DEFAULT false,
  original_payment_id UUID REFERENCES contract_payments(id),
  refund_reason TEXT,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN (
    'pending',        -- očekuje se
    'completed',      -- uplaćeno
    'failed',         -- neuspjelo
    'refunded'        -- vraćeno
  )),

  -- Recorded by
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_payments_contract ON contract_payments(contract_id);
CREATE INDEX idx_contract_payments_date ON contract_payments(organization_id, payment_date);
```

#### 5. `contract_amendments` - Anex Records

```sql
CREATE TABLE contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Amendment identification
  amendment_number INTEGER NOT NULL,       -- 1, 2, 3...
  amendment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'dates',          -- Promjena datuma
    'passengers',     -- Dodatni/uklonjeni putnici
    'room',           -- Promjena smještaja
    'services',       -- Promjena usluga
    'price',          -- Korekcija cijene
    'cancellation',   -- Parcijalni storno
    'other'           -- Ostalo
  )),

  -- Change details
  change_description TEXT NOT NULL,        -- Human-readable description

  -- Before/After snapshots (JSON)
  old_values JSONB,
  new_values JSONB,

  -- Price adjustment
  price_difference DECIMAL(10,2) DEFAULT 0, -- + or -
  new_total DECIMAL(10,2),

  -- Signature
  signed_at TIMESTAMPTZ,
  signed_by TEXT,

  -- Notes
  reason TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_amendment_number UNIQUE (contract_id, amendment_number)
);

CREATE INDEX idx_contract_amendments_contract ON contract_amendments(contract_id);
```

#### 6. `customers` - Customer Database

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,

  -- Contact
  phone TEXT,
  mobile TEXT,
  email TEXT,

  -- Address
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BiH',

  -- Personal
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F')),

  -- Documents
  passport_number TEXT,
  passport_expiry DATE,
  id_card_number TEXT,

  -- Business customer
  is_company BOOLEAN DEFAULT false,
  company_name TEXT,
  company_pib TEXT,
  company_registration TEXT,

  -- Source tracking
  lead_id UUID REFERENCES leads(id),
  source TEXT,                             -- How they found us

  -- Marketing preferences
  accepts_marketing BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Stats (updated by triggers)
  total_contracts INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_travel_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_name ON customers(organization_id, last_name, first_name);
CREATE INDEX idx_customers_phone ON customers(organization_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_email ON customers(organization_id, email) WHERE email IS NOT NULL;
```

### RLS Policies

```sql
-- Contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_org_select" ON contracts
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_org_insert" ON contracts
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_org_update" ON contracts
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "contracts_org_delete" ON contracts
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Similar policies for all related tables:
-- contract_passengers, contract_services, contract_payments,
-- contract_amendments, customers
```

---

## Contract Numbering

### Separate Sequences for B2C and B2B

```sql
-- Function to generate next contract number
CREATE OR REPLACE FUNCTION generate_contract_number(
  p_organization_id UUID,
  p_contract_type TEXT DEFAULT 'b2c'
) RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_prefix TEXT;
  v_pattern TEXT;
  v_last_number INTEGER;
  v_next_number INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- B2B contracts get "B-" prefix
  IF p_contract_type = 'b2b' THEN
    v_prefix := 'B-';
    v_pattern := 'B-% / ' || v_year;
  ELSE
    v_prefix := '';
    v_pattern := '% / ' || v_year;
  END IF;

  -- Find highest number for this org/type/year
  SELECT MAX(
    CASE
      WHEN p_contract_type = 'b2b' THEN
        NULLIF(regexp_replace(contract_number, '^B-(\d+) / \d+$', '\1'), contract_number)::INTEGER
      ELSE
        NULLIF(regexp_replace(contract_number, '^(\d+) / \d+$', '\1'), contract_number)::INTEGER
    END
  )
  INTO v_last_number
  FROM contracts
  WHERE organization_id = p_organization_id
    AND contract_type = p_contract_type
    AND contract_number LIKE v_pattern;

  v_next_number := COALESCE(v_last_number, 0) + 1;

  RETURN v_prefix || v_next_number || ' / ' || v_year;
END;
$$ LANGUAGE plpgsql;
```

### Examples

| Type | Sequence |
|------|----------|
| B2C (Customer) | `1 / 2026`, `2 / 2026`, `3 / 2026`... |
| B2B (Agency) | `B-1 / 2026`, `B-2 / 2026`, `B-3 / 2026`... |
| Amendment | `Anex #1 uz Ugovor 15 / 2026` |

---

## Pricing & Currency

### Currency by Country

```typescript
const CURRENCY_BY_COUNTRY: Record<string, { code: string; symbol: string }> = {
  'ba': { code: 'BAM', symbol: 'KM' },    // Bosnia & Herzegovina
  'rs': { code: 'RSD', symbol: 'RSD' },   // Serbia
  'hr': { code: 'EUR', symbol: '€' },     // Croatia
  'me': { code: 'EUR', symbol: '€' },     // Montenegro
};

function getContractCurrency(organizationCountry: string) {
  return CURRENCY_BY_COUNTRY[organizationCountry] || { code: 'EUR', symbol: '€' };
}
```

### Pricing Calculation for Resale Packages

```typescript
interface ResalePricing {
  wholesalePrice: number;      // What subagent pays organizer
  marginPercent: number;       // Subagent's markup
  retailPrice: number;         // What customer pays
  marginAmount: number;        // Subagent's profit per person
}

function calculateResalePricing(wholesale: number, marginPercent: number): ResalePricing {
  const marginAmount = wholesale * (marginPercent / 100);
  const retailPrice = wholesale + marginAmount;

  return {
    wholesalePrice: wholesale,
    marginPercent,
    retailPrice: Math.round(retailPrice * 100) / 100,
    marginAmount: Math.round(marginAmount * 100) / 100,
  };
}

// Example:
// calculateResalePricing(450, 12)
// => { wholesalePrice: 450, marginPercent: 12, retailPrice: 504, marginAmount: 54 }
```

### Contract Financial Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FINANSIJSKI PREGLED                                                        │
│                                                                             │
│  Usluge:                                                                    │
│  ├── ALL INCLUSIVE (5 noći × 2 osobe)        1,930.00 KM                   │
│  ├── Doplata za dijete (2 × 110.00)            220.00 KM                   │
│  ├── Boravišna taksa (2 × 20.00)                40.00 KM                   │
│  └── RANI BOOKING -10%                        -193.00 KM                   │
│  ─────────────────────────────────────────────────────────                 │
│  UKUPNO:                                     1,997.00 KM                   │
│                                                                             │
│  Uplaćeno:                                   1,165.00 KM                   │
│  PREOSTALO ZA UPLATU:                          832.00 KM                   │
│                                                                             │
│  Rok za konačnu uplatu: 01.07.2026                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Payment Tracking

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Contract Created                                                           │
│       │                                                                     │
│       v                                                                     │
│  ┌─────────────────┐                                                       │
│  │ Deposit Due     │  30% of total (configurable)                          │
│  │ (Akontacija)    │  Due: On signing or within 3 days                     │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           v                                                                 │
│  ┌─────────────────┐                                                       │
│  │ Deposit Paid    │  Record payment, update contract.amount_paid          │
│  │                 │  Status: draft → signed                               │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           v                                                                 │
│  ┌─────────────────┐                                                       │
│  │ Balance Due     │  Remaining 70%                                        │
│  │ (Ostatak)       │  Due: 7-14 days before departure                      │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           v                                                                 │
│  ┌─────────────────┐                                                       │
│  │ Fully Paid      │  amount_remaining = 0                                 │
│  │                 │  Ready for travel                                     │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           v                                                                 │
│  ┌─────────────────┐                                                       │
│  │ Travel Complete │  Status: signed → completed                           │
│  │                 │  Update customer stats                                │
│  └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payment UI Component

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UGOVOR #15/2026 - Marko Marković                                          │
│  Pearl Beach, Crna Gora | 15.07 - 22.07.2026                               │
│                                                                             │
│  UKUPNO: 1,450.00 EUR                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  UPLATE:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Datum        │ Opis            │ Iznos      │ Način     │ Status   │   │
│  ├──────────────┼─────────────────┼────────────┼───────────┼──────────┤   │
│  │ 15.01.2026   │ Akontacija      │ 435.00 EUR │ Račun     │ ✓ Plaćeno│   │
│  │ 08.07.2026   │ Ostatak         │1,015.00 EUR│ -         │ ⏳ Čeka  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STANJE:                                                                    │
│  ███████████░░░░░░░░░░░░░░░░░░░  30%                                       │
│  Uplaćeno: 435.00 / 1,450.00 EUR                                           │
│                                                                             │
│  [+ Dodaj uplatu]                           Rok: 08.07.2026 (za 174 dana)  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Automatic Payment Reminders

```typescript
// Reminder triggers (future feature)
const PAYMENT_REMINDERS = {
  deposit: [
    { daysBefore: 0, type: 'due_today' },
    { daysAfter: 1, type: 'overdue' },
    { daysAfter: 3, type: 'final_warning' },
  ],
  balance: [
    { daysBefore: 14, type: 'upcoming' },
    { daysBefore: 7, type: 'reminder' },
    { daysBefore: 3, type: 'urgent' },
    { daysBefore: 0, type: 'due_today' },
  ],
};
```

---

## Contract Amendments (Anex)

### When to Create an Amendment

| Change Type | Requires Anex? | Example |
|-------------|----------------|---------|
| Date change | ✅ Yes | Moving from July 15 to July 22 |
| Add passenger | ✅ Yes | Adding a child to booking |
| Remove passenger | ✅ Yes | One person can't travel |
| Room upgrade | ✅ Yes | Standard → Sea View |
| Price correction | ✅ Yes | Error in original calculation |
| Contact info update | ❌ No | New phone number |
| Internal notes | ❌ No | Agent notes |

### Amendment Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ANEX #1                                                                    │
│  uz Ugovor broj: 15 / 2026                                                 │
│  od 20.02.2026                                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  IZMJENA: Promjena datuma putovanja                                        │
│                                                                             │
│  PRETHODNI PODACI:                                                         │
│  Termin: 15.07.2026 - 22.07.2026 (7 noći)                                 │
│                                                                             │
│  NOVI PODACI:                                                              │
│  Termin: 22.07.2026 - 29.07.2026 (7 noći)                                 │
│                                                                             │
│  RAZLIKA U CIJENI: +50.00 EUR                                              │
│  (Viša cijena u periodu 22-29.07)                                          │
│                                                                             │
│  NOVI UKUPNI IZNOS: 1,500.00 EUR                                           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Svi ostali uslovi iz osnovnog ugovora ostaju nepromijenjeni.              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  _____________________              _____________________                   │
│  Agencija                           Nosilac ugovora                         │
│  Datum: __________                  Datum: __________                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Amendment History View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UGOVOR #15/2026 - Historija izmjena                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 Originalni ugovor                           10.01.2026           │   │
│  │    Iznos: 1,450.00 EUR                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                      │                                                      │
│                      v                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📝 Anex #1 - Promjena datuma                   20.02.2026           │   │
│  │    Staro: 15.07 - 22.07.2026                                        │   │
│  │    Novo:  22.07 - 29.07.2026                                        │   │
│  │    Razlika: +50.00 EUR                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                      │                                                      │
│                      v                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📝 Anex #2 - Dodatni putnik                    15.03.2026           │   │
│  │    Dodan: Ana Marković (dijete, 8 god)                              │   │
│  │    Razlika: +380.00 EUR                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                      │                                                      │
│                      v                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 💰 TRENUTNI UKUPNI IZNOS: 1,880.00 EUR                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Document Templates

### Hybrid Template System

**Locked Legal Structure** (cannot be modified):
- Contract header with number and date
- Three-party information section
- Passengers table
- Accommodation details
- Services/pricing table
- Financial summary
- Payment specification
- Terms and conditions footer
- Signature section

**Customizable Elements**:
- Agency logo
- Header colors/styling
- Contact information layout
- Additional terms section (can add, not remove required parts)
- Footer notes
- Font preferences (within approved set)

### Template Settings UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POSTAVKE ŠABLONA UGOVORA                                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔒 OBAVEZNI ELEMENTI (zakonski)                                    │   │
│  │     Ovi elementi ne mogu se mijenjati jer su zakonski obavezni      │   │
│  │                                                                     │   │
│  │     ✓ Zaglavlje sa brojem ugovora i datumom                        │   │
│  │     ✓ Podaci o organizatoru, subagent i nosiocu                    │   │
│  │     ✓ Tabela putnika sa ličnim podacima                            │   │
│  │     ✓ Podaci o smještaju i destinaciji                             │   │
│  │     ✓ Tabela usluga sa cijenama                                    │   │
│  │     ✓ Finansijski pregled (ukupno, uplaćeno, preostalo)            │   │
│  │     ✓ Specifikacija uplata                                         │   │
│  │     ✓ Opšti uslovi putovanja                                       │   │
│  │     ✓ Mjesto za potpise                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✏️ PRILAGODLJIVI ELEMENTI                                          │   │
│  │                                                                     │   │
│  │  Logo agencije:                                                     │   │
│  │  ┌──────────────┐                                                   │   │
│  │  │  [LOGO]      │  [Učitaj logo]  [Ukloni]                         │   │
│  │  │  150x50px    │  Preporučeno: PNG, transparentna pozadina         │   │
│  │  └──────────────┘                                                   │   │
│  │                                                                     │   │
│  │  Boja zaglavlja:                                                    │   │
│  │  [#1e40af] ████████  [Odaberi boju]                                │   │
│  │                                                                     │   │
│  │  Dodatni uslovi (dodaju se nakon standardnih):                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Putnik je dužan posjedovati važeću putnu ispravu...         │   │   │
│  │  │                                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  [Uredi dodatne uslove]                                            │   │
│  │                                                                     │   │
│  │  Napomena na kraju ugovora:                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Hvala što ste odabrali našu agenciju!                       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [👁️ Pregled šablona]                              [💾 Sačuvaj postavke]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Required Documents

| Document | Serbian Name | When Generated | Purpose |
|----------|--------------|----------------|---------|
| Contract | Ugovor | On creation | Legal agreement with customer |
| B2B Contract | TRGO Ugovor | For resale packages | Agreement with organizer |
| Amendment | Anex | On changes | Document changes to contract |
| Pro-forma Invoice | Profaktura | For deposit | Request advance payment |
| Invoice | Faktura | After payment | Tax document |
| Voucher | Vaučer | Before travel | Hotel check-in document |
| Confirmation | Potvrda rezervacije | After deposit | Booking confirmation |

---

## UI Components

### 1. Contract List Page (`/dashboard/contracts`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UGOVORI                                                    [+ Novi ugovor] │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📊 Ukupno: 156 │ 💰 Vrijednost: 89,450 EUR │ ⏳ Čeka uplatu: 12,300 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Filteri: [Svi statusi ▼] [Svi tipovi ▼] [Datum ▼] [Pretraga...        ]  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ # │ Broj      │ Klijent          │ Destinacija │ Datum    │ Iznos   │   │
│  ├───┼───────────┼──────────────────┼─────────────┼──────────┼─────────┤   │
│  │   │ 15/2026   │ Marko Marković   │ Crna Gora   │ 15.07.26 │ 1,450€  │   │
│  │   │ ● Potpisan│ 4 putnika        │ Pearl Beach │          │ 70% ███ │   │
│  ├───┼───────────┼──────────────────┼─────────────┼──────────┼─────────┤   │
│  │   │ 14/2026   │ Ana Anić         │ Turska      │ 20.07.26 │ 2,100€  │   │
│  │   │ ○ Poslan  │ 2 putnika        │ Hotel Rixos │          │ 30% █   │   │
│  ├───┼───────────┼──────────────────┼─────────────┼──────────┼─────────┤   │
│  │   │ B-3/2026  │ Alfa Tours       │ Egipat      │ 25.07.26 │ 3,200€  │   │
│  │   │ 🔗 B2B    │ Grupna rez.      │ Sharm       │          │ Čeka    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [← Prethodna]  Stranica 1 od 12  [Sljedeća →]                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Contract Detail Page (`/dashboard/contracts/[id]`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Nazad    UGOVOR #15/2026                          [Uredi] [PDF] [Email]  │
│             Marko Marković                                                  │
│             Pearl Beach, Crna Gora                                          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Status: ● POTPISAN │ Kreiran: 10.01.2026 │ Potpisan: 15.01.2026     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [Pregled] [Putnici] [Usluge] [Uplate] [Dokumenti] [Historija]             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ DETALJI PUTOVANJA           │  │ FINANSIJE                           │  │
│  │                             │  │                                     │  │
│  │ Destinacija: Crna Gora      │  │ Ukupno:        1,450.00 EUR        │  │
│  │ Grad: Ulcinj                │  │ Uplaćeno:        435.00 EUR        │  │
│  │ Hotel: Pearl Beach ★★★★    │  │ Preostalo:     1,015.00 EUR        │  │
│  │ Soba: Studio 1/2+1         │  │                                     │  │
│  │ Usluga: All Inclusive      │  │ ████████░░░░░░░░░░░░ 30%            │  │
│  │                             │  │                                     │  │
│  │ Check-in: 15.07.2026       │  │ Rok za uplatu: 08.07.2026          │  │
│  │ Check-out: 22.07.2026      │  │                                     │  │
│  │ Noći: 7                     │  │ [+ Dodaj uplatu]                    │  │
│  │                             │  │                                     │  │
│  │ Prevoz: Vlastiti           │  └─────────────────────────────────────┘  │
│  └─────────────────────────────┘                                           │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PUTNICI (4)                                              [+ Dodaj]   │  │
│  │                                                                      │  │
│  │ 1. Marko Marković (nosilac) - Odrasli - 15.03.1985                  │  │
│  │ 2. Jana Marković - Odrasli - 22.08.1987                             │  │
│  │ 3. Luka Marković - Dijete (8) - 10.05.2018                          │  │
│  │ 4. Mia Marković - Dijete (5) - 03.11.2021                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. New Contract Modal (Auto-Generation Flow)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KREIRANJE UGOVORA                                                     [X]  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ Paket         ✓ Polazak        ✓ Klijent        ○ Pregled        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ODABRANI PODACI:                                                          │
│                                                                             │
│  Paket: Pearl Beach Resort - All Inclusive                                 │
│  Tip: Vlastiti paket ✓                                                     │
│  Polazak: 15.07.2026 - 22.07.2026 (7 noći)                                │
│  Cijena: 450 EUR / osoba                                                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  NEDOSTAJUĆI PODACI:                                                       │
│                                                                             │
│  ⚠️ Za generisanje ugovora potrebno je unijeti sljedeće podatke:          │
│                                                                             │
│  Nosilac ugovora: *                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ [Odaberi postojećeg klijenta ▼]  ili  [+ Novi klijent]              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Tip sobe: *                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ○ Studio 1/2 (450 EUR)                                              │  │
│  │ ○ Studio 1/2+1 (450 EUR + 380 EUR dijete)                           │  │
│  │ ○ Apartman 1/4 (420 EUR)                                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Broj putnika: *                                                           │
│  Odrasli: [2 ▼]   Djeca: [2 ▼]                                            │
│                                                                             │
│                                            [Nazad]  [Generiši ugovor →]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Missing Fields Modal

When auto-generating a contract but some data is missing:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ NEDOSTAJUĆI PODACI ZA UGOVOR                                       [X]  │
│                                                                             │
│  Za generisanje ugovora potrebno je popuniti sljedeća polja:               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  PODACI O NOSIOCU                                                          │
│                                                                             │
│  Ime: *                          Prezime: *                                │
│  ┌────────────────────────┐     ┌────────────────────────┐                 │
│  │ Marko                  │     │ Marković               │                 │
│  └────────────────────────┘     └────────────────────────┘                 │
│                                                                             │
│  Datum rođenja: *                Telefon: *                                │
│  ┌────────────────────────┐     ┌────────────────────────┐                 │
│  │ 15.03.1985             │     │ +387 61 123 456        │                 │
│  └────────────────────────┘     └────────────────────────┘                 │
│                                                                             │
│  Grad: *                         Adresa:                                   │
│  ┌────────────────────────┐     ┌────────────────────────┐                 │
│  │ Sarajevo               │     │ Titova 15              │                 │
│  └────────────────────────┘     └────────────────────────┘                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  OSTALI PUTNICI (3)                                                        │
│                                                                             │
│  [Putnik 2: Jana Marković - Kompletno ✓]                                   │
│  [Putnik 3: Luka Marković - Nedostaje datum rođenja ⚠️]                    │
│  [Putnik 4: Mia Marković - Kompletno ✓]                                    │
│                                                                             │
│                                           [Otkaži]  [Sačuvaj i generiši]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Generation Logic

### Contract Creation Flow

```typescript
interface ContractGenerationResult {
  success: boolean;
  contract?: Contract;
  missingFields?: MissingField[];
  error?: string;
}

interface MissingField {
  section: 'customer' | 'passengers' | 'accommodation' | 'pricing';
  field: string;
  label: string;
  required: boolean;
  currentValue?: any;
}

async function generateContract(
  packageId: string,
  departureId: string,
  customerId: string | null,
  passengers: PassengerInput[],
  roomTypeCode: string,
  options: ContractOptions
): Promise<ContractGenerationResult> {

  // 1. Load package data
  const pkg = await loadPackage(packageId);
  const departure = await loadDeparture(departureId);
  const organization = await loadOrganization(pkg.organization_id);

  // 2. Check for missing required fields
  const missingFields: MissingField[] = [];

  // Customer validation
  if (!customerId) {
    missingFields.push({
      section: 'customer',
      field: 'customer_id',
      label: 'Nosilac ugovora',
      required: true,
    });
  } else {
    const customer = await loadCustomer(customerId);
    if (!customer.phone) {
      missingFields.push({
        section: 'customer',
        field: 'phone',
        label: 'Telefon nosioca',
        required: true,
      });
    }
    if (!customer.city) {
      missingFields.push({
        section: 'customer',
        field: 'city',
        label: 'Grad nosioca',
        required: true,
      });
    }
  }

  // Passenger validation
  for (const [index, passenger] of passengers.entries()) {
    if (!passenger.date_of_birth) {
      missingFields.push({
        section: 'passengers',
        field: `passengers[${index}].date_of_birth`,
        label: `Datum rođenja - ${passenger.first_name} ${passenger.last_name}`,
        required: true,
      });
    }
  }

  // 3. If missing fields, return them for UI to collect
  if (missingFields.length > 0) {
    return {
      success: false,
      missingFields,
    };
  }

  // 4. Generate contract number
  const contractNumber = await generateContractNumber(
    organization.id,
    pkg.ownership_type === 'resale' ? 'b2b' : 'b2c'
  );

  // 5. Calculate pricing
  const pricing = calculateContractPricing(pkg, departure, roomTypeCode, passengers);

  // 6. Determine currency
  const currency = getCurrencyForCountry(organization.operating_country);

  // 7. Create contract record
  const contract = await createContract({
    organization_id: organization.id,
    contract_number: contractNumber,
    contract_type: pkg.ownership_type === 'resale' ? 'b2b' : 'b2c',
    customer_id: customerId,
    package_id: packageId,
    departure_id: departureId,

    // Organizer info
    organizer_name: pkg.ownership_type === 'resale'
      ? pkg.external_organizer_name
      : organization.legal_name,

    // Accommodation snapshot
    destination_country: pkg.destination_country,
    destination_city: pkg.destination_city,
    hotel_name: pkg.hotel_name,
    hotel_stars: pkg.hotel_stars,
    room_type: roomTypeCode,
    board_type: pkg.board_type,

    // Dates
    check_in_date: departure.departure_date,
    check_out_date: departure.return_date,

    // Transport
    transport_type: pkg.transport_type,
    departure_point: departure.departure_point,

    // Financial
    currency: currency.code,
    subtotal: pricing.subtotal,
    discount_total: pricing.discountTotal,
    total_amount: pricing.total,

    // For resale
    wholesale_amount: pkg.ownership_type === 'resale' ? pricing.wholesale : null,
    margin_amount: pkg.ownership_type === 'resale' ? pricing.margin : null,

    // Payment terms
    deposit_percent: 30,
    deposit_amount: pricing.total * 0.3,
    payment_deadline: calculatePaymentDeadline(departure.departure_date),

    status: 'draft',
  });

  // 8. Create passenger records
  await createPassengers(contract.id, passengers);

  // 9. Create service line items
  await createServices(contract.id, pricing.lineItems);

  // 10. For resale packages, create linked B2B contract
  if (pkg.ownership_type === 'resale') {
    await createB2BContract(contract, pkg);
  }

  // 11. Deduct capacity (if no B2B confirmation needed)
  if (pkg.ownership_type === 'own') {
    await deductDepartureCapacity(departure.id, passengers.length);
  }

  return {
    success: true,
    contract,
  };
}
```

### Pricing Calculation

```typescript
interface PricingResult {
  lineItems: ServiceLineItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  wholesale?: number;
  margin?: number;
}

function calculateContractPricing(
  pkg: Package,
  departure: Departure,
  roomTypeCode: string,
  passengers: PassengerInput[]
): PricingResult {
  const lineItems: ServiceLineItem[] = [];
  let subtotal = 0;
  let discountTotal = 0;

  // 1. Base accommodation price
  const roomPrice = getRoomPrice(pkg, roomTypeCode, departure.departure_date);
  const adults = passengers.filter(p => p.passenger_type === 'adult').length;
  const children = passengers.filter(p => p.passenger_type === 'child').length;

  // Adult prices
  if (adults > 0) {
    const adultTotal = roomPrice.adult_price * adults * (pkg.price_type === 'per_person_per_night' ? departure.duration_nights : 1);
    lineItems.push({
      service_type: 'accommodation',
      description: `${pkg.board_type} - Odrasli`,
      quantity: adults,
      unit_price: roomPrice.adult_price,
      total_price: adultTotal,
    });
    subtotal += adultTotal;
  }

  // Child prices
  if (children > 0) {
    const childTotal = roomPrice.child_price * children * (pkg.price_type === 'per_person_per_night' ? departure.duration_nights : 1);
    lineItems.push({
      service_type: 'accommodation',
      description: `${pkg.board_type} - Djeca`,
      quantity: children,
      unit_price: roomPrice.child_price,
      total_price: childTotal,
    });
    subtotal += childTotal;
  }

  // 2. Supplements
  const supplements = getApplicableSupplements(pkg, roomTypeCode, passengers);
  for (const supp of supplements) {
    lineItems.push({
      service_type: 'supplement',
      service_code: supp.code,
      description: supp.name,
      quantity: supp.quantity,
      unit_price: supp.amount,
      total_price: supp.total,
      supplement_id: supp.id,
    });
    subtotal += supp.total;
  }

  // 3. Mandatory fees
  const fees = getApplicableFees(pkg, passengers);
  for (const fee of fees) {
    lineItems.push({
      service_type: 'fee',
      service_code: fee.code,
      description: fee.name,
      quantity: fee.quantity,
      unit_price: fee.amount,
      total_price: fee.total,
      fee_id: fee.id,
    });
    subtotal += fee.total;
  }

  // 4. Discounts
  const discounts = getApplicableDiscounts(pkg, departure.departure_date, subtotal);
  for (const discount of discounts) {
    const discountAmount = discount.percent
      ? subtotal * (discount.percent / 100)
      : discount.fixed_amount;

    lineItems.push({
      service_type: 'discount',
      service_code: discount.code,
      description: discount.name,
      quantity: 1,
      unit_price: -discountAmount,
      total_price: -discountAmount,
      is_discount: true,
      discount_percent: discount.percent,
      discount_id: discount.id,
    });
    discountTotal += discountAmount;
  }

  const total = subtotal - discountTotal;

  // 5. For resale: calculate wholesale and margin
  let wholesale: number | undefined;
  let margin: number | undefined;

  if (pkg.ownership_type === 'resale' && pkg.wholesale_price && pkg.margin_percent) {
    const totalPersons = adults + children;
    wholesale = pkg.wholesale_price * totalPersons;
    margin = total - wholesale;
  }

  return {
    lineItems,
    subtotal,
    discountTotal,
    total,
    wholesale,
    margin,
  };
}
```

---

## Implementation Phases

### Phase 1: Database & Core (Week 1-2)

**Priority: CRITICAL**

- [ ] Create migration file `020_contracts_schema.sql`
  - [ ] contracts table
  - [ ] contract_passengers table
  - [ ] contract_services table
  - [ ] contract_payments table
  - [ ] contract_amendments table
  - [ ] customers table
  - [ ] All indexes and RLS policies

- [ ] Add package ownership fields
  - [ ] ownership_type column
  - [ ] external_organizer_name column
  - [ ] wholesale_price, margin_percent columns

- [ ] Create contract number generation function

- [ ] Create TypeScript types
  - [ ] Contract, ContractPassenger, ContractService types
  - [ ] ContractPayment, ContractAmendment types
  - [ ] Customer type

### Phase 2: Customer Management (Week 2-3)

**Priority: HIGH**

- [ ] Customer list page `/dashboard/customers`
- [ ] Customer detail page `/dashboard/customers/[id]`
- [ ] Customer form (create/edit)
- [ ] Customer search component (for contract creation)
- [ ] Lead → Customer conversion logic

### Phase 3: Contract CRUD (Week 3-4)

**Priority: HIGH**

- [ ] Contract list page `/dashboard/contracts`
  - [ ] Filters: status, type, date range
  - [ ] Search by customer, contract number
  - [ ] Stats bar (totals, pending payments)

- [ ] Contract detail page `/dashboard/contracts/[id]`
  - [ ] Overview tab
  - [ ] Passengers tab
  - [ ] Services tab
  - [ ] Payments tab
  - [ ] Documents tab
  - [ ] History tab

- [ ] Contract creation wizard
  - [ ] Package selection step
  - [ ] Departure selection step
  - [ ] Customer selection/creation step
  - [ ] Passengers step
  - [ ] Services step
  - [ ] Summary & generate step

- [ ] Missing fields modal

- [ ] Contract edit form

### Phase 4: Package Ownership (Week 4-5)

**Priority: HIGH**

- [ ] Add vlastiti/tuđi toggle to package form
- [ ] External organizer name field with legal warning
- [ ] Wholesale price + margin % fields
- [ ] Retail price auto-calculation
- [ ] B2B contract creation for resale packages
- [ ] Linked contracts view

### Phase 5: Payments (Week 5-6)

**Priority: HIGH**

- [ ] Payment list component on contract detail
- [ ] Record payment modal
  - [ ] Payment type (deposit, balance, full)
  - [ ] Amount and currency
  - [ ] Payment method
  - [ ] Reference number

- [ ] Payment status indicators
- [ ] Auto-update contract amount_paid
- [ ] Overdue payment highlighting
- [ ] Payment reminders (future: email integration)

### Phase 6: PDF Generation (Week 6-7)

**Priority: HIGH**

- [ ] Set up @react-pdf/renderer
- [ ] Contract PDF template
  - [ ] Header with contract number
  - [ ] Three-party section
  - [ ] Passengers table
  - [ ] Accommodation section
  - [ ] Services table
  - [ ] Financial summary
  - [ ] Payment specification
  - [ ] Terms footer
  - [ ] Signature section

- [ ] B2B Contract PDF (wholesale version)
- [ ] Amendment (Anex) PDF
- [ ] Voucher PDF
- [ ] Pro-forma Invoice PDF

### Phase 7: Template Customization (Week 7-8)

**Priority: MEDIUM**

- [ ] Template settings page
- [ ] Logo upload
- [ ] Color customization
- [ ] Additional terms editor
- [ ] Template preview

### Phase 8: Amendments (Week 8-9)

**Priority: MEDIUM**

- [ ] Create amendment flow
- [ ] Amendment form (change type, description, price diff)
- [ ] Amendment history view
- [ ] Amendment PDF generation
- [ ] Update contract totals on amendment

### Phase 9: Integration & Polish (Week 9-10)

**Priority: MEDIUM**

- [ ] Create contract from inquiry flow
- [ ] Dashboard stats integration
- [ ] Calendar/departures integration
- [ ] Capacity deduction logic
- [ ] Email sending (future)
- [ ] Export functionality

---

## Technical Specifications

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React, TypeScript |
| UI Components | shadcn/ui, Tailwind CSS |
| State Management | React Query, Zustand |
| Database | Supabase (PostgreSQL) |
| PDF Generation | @react-pdf/renderer |
| Form Handling | React Hook Form, Zod |
| Date Handling | date-fns |

### File Structure

```
src/
├── app/
│   └── dashboard/
│       ├── contracts/
│       │   ├── page.tsx              # Contract list
│       │   ├── [id]/
│       │   │   └── page.tsx          # Contract detail
│       │   └── new/
│       │       └── page.tsx          # New contract wizard
│       └── customers/
│           ├── page.tsx              # Customer list
│           └── [id]/
│               └── page.tsx          # Customer detail
├── components/
│   ├── contracts/
│   │   ├── ContractList.tsx
│   │   ├── ContractDetail.tsx
│   │   ├── ContractWizard/
│   │   │   ├── index.tsx
│   │   │   ├── PackageStep.tsx
│   │   │   ├── CustomerStep.tsx
│   │   │   ├── PassengersStep.tsx
│   │   │   └── SummaryStep.tsx
│   │   ├── ContractPDF/
│   │   │   ├── ContractDocument.tsx
│   │   │   ├── B2BContractDocument.tsx
│   │   │   ├── AmendmentDocument.tsx
│   │   │   └── VoucherDocument.tsx
│   │   ├── PassengerList.tsx
│   │   ├── ServiceList.tsx
│   │   ├── PaymentList.tsx
│   │   ├── AmendmentHistory.tsx
│   │   └── MissingFieldsModal.tsx
│   └── customers/
│       ├── CustomerList.tsx
│       ├── CustomerForm.tsx
│       └── CustomerSearch.tsx
├── lib/
│   ├── contracts/
│   │   ├── generate-contract.ts
│   │   ├── calculate-pricing.ts
│   │   ├── contract-number.ts
│   │   └── validation.ts
│   └── pdf/
│       ├── styles.ts
│       └── components/
├── types/
│   ├── contract.ts
│   ├── customer.ts
│   └── payment.ts
└── hooks/
    ├── useContracts.ts
    ├── useCustomers.ts
    └── useContractPDF.ts
```

### API Endpoints (Supabase Functions)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/contracts` | GET | List contracts with filters |
| `/contracts` | POST | Create new contract |
| `/contracts/:id` | GET | Get contract detail |
| `/contracts/:id` | PATCH | Update contract |
| `/contracts/:id/passengers` | POST | Add passenger |
| `/contracts/:id/services` | POST | Add service |
| `/contracts/:id/payments` | POST | Record payment |
| `/contracts/:id/amendments` | POST | Create amendment |
| `/contracts/:id/pdf` | GET | Generate PDF |
| `/customers` | GET/POST | Customer CRUD |
| `/customers/:id` | GET/PATCH | Customer detail |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Contract creation time | < 3 minutes (with complete data) |
| Missing field completion | < 2 minutes additional |
| PDF generation time | < 5 seconds |
| Payment recording time | < 30 seconds |
| Amendment creation time | < 2 minutes |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Legal compliance | Locked template sections, required fields |
| Data migration | Customer import tool from AgTravelSoft |
| Performance | Pagination, lazy loading, indexed queries |
| PDF complexity | Component-based templates, caching |

---

*Document Version: 2.0*
*Created: January 2026*
*Based on: AgTravelSoft analysis, My Travel contract example, detailed business requirements discussion*
