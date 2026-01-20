-- Migration: 017_enhanced_import_schema.sql
-- Enhanced document import: supplements, fees, discounts, room details, policies
--
-- NOTE: The following already exist and should NOT be recreated:
-- - document_imports, transport_price_lists, transport_prices, children_policy_rules
-- - packages columns: transport_price_list_id, original_currency, exchange_rate, etc.

-- ============================================
-- ORGANIZATION LANGUAGE SETTING
-- ============================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS language_region TEXT DEFAULT 'ba'
  CHECK (language_region IN ('rs', 'ba', 'hr'));

COMMENT ON COLUMN organizations.language_region IS
  'Controls AI parsing output language: rs=Serbian, ba=Bosnian, hr=Croatian';

-- ============================================
-- PACKAGE ENHANCEMENTS
-- ============================================
-- Price type: critically important - Pearl Beach is per_person_per_night, Albania is per_person_per_stay
ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'per_person_per_stay'
  CHECK (price_type IN ('per_person_per_night', 'per_person_per_stay', 'per_room_per_night', 'per_unit'));

ALTER TABLE packages ADD COLUMN IF NOT EXISTS base_occupancy INT DEFAULT 2;

-- Occupancy pricing rules (3rd/4th person discounts, single supplement)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS occupancy_pricing JSONB;
-- Example: { "base": 2, "single_supplement_percent": 70, "third_adult_discount_percent": 30 }

-- Included services array
ALTER TABLE packages ADD COLUMN IF NOT EXISTS included_services TEXT[];
-- Example: ['Free sunbeds and umbrellas', 'Free parking', 'Aqua Park access']

-- Extended parsed metadata for anything not fitting structured fields
ALTER TABLE packages ADD COLUMN IF NOT EXISTS parsed_metadata JSONB DEFAULT '{}';

-- ============================================
-- SUPPLEMENTS TABLE
-- ============================================
-- Examples: Sea view, baby cot, single room supplement
CREATE TABLE IF NOT EXISTS package_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identification
  code TEXT NOT NULL,                    -- 'SEA_VIEW', 'BABY_COT', 'SINGLE_USE'
  name TEXT NOT NULL,                    -- Localized name based on org language

  -- Pricing (either fixed amount OR percentage, not both)
  amount DECIMAL(10,2),                  -- Fixed amount (e.g., 7.00)
  percent DECIMAL(5,2),                  -- Percentage (e.g., 70.00 for 70%)
  currency TEXT DEFAULT 'EUR',

  -- How the price is applied
  per TEXT DEFAULT 'night' CHECK (per IN ('night', 'stay', 'person_night', 'person_stay')),

  -- Is this mandatory or optional?
  mandatory BOOLEAN DEFAULT false,

  -- When does this supplement apply?
  conditions JSONB,                      -- { "occupancy": 1, "room_types": ["1/1"] }

  -- Source tracking
  source_text TEXT,                      -- Original text from document

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT supplement_has_price CHECK (amount IS NOT NULL OR percent IS NOT NULL)
);

-- ============================================
-- MANDATORY FEES TABLE
-- ============================================
-- These are NOT included in package price and must be paid separately
CREATE TABLE IF NOT EXISTS package_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identification
  code TEXT NOT NULL,                    -- 'TOURIST_TAX', 'INSURANCE', 'RESORT_FEE'
  name TEXT NOT NULL,                    -- Localized name

  -- Age-based pricing rules (most fees vary by age)
  -- Example: [{ "age_from": 0, "age_to": 1.99, "amount": 0 }, { "age_from": 2, "age_to": 7.99, "amount": 14 }, { "age_from": 8, "age_to": 99, "amount": 28 }]
  rules JSONB NOT NULL,
  currency TEXT DEFAULT 'BAM',           -- Often in local currency
  per TEXT DEFAULT 'stay' CHECK (per IN ('stay', 'night')),

  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISCOUNTS/PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS package_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,                    -- 'EARLY_BIRD', 'LAST_MINUTE', 'LONG_STAY'
  name TEXT NOT NULL,                    -- Localized name

  -- Discount value
  percent DECIMAL(5,2),                  -- e.g., 10.00 for 10% off
  fixed_amount DECIMAL(10,2),            -- Alternative: fixed discount

  -- Conditions for discount to apply
  conditions JSONB,                      -- { "book_before": "2026-03-01", "min_nights": 10 }

  -- Validity period
  valid_from DATE,
  valid_to DATE,

  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOM/UNIT DETAILS TABLE
-- ============================================
-- Extended room information beyond basic room_types
CREATE TABLE IF NOT EXISTS package_room_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  room_type_code TEXT NOT NULL,          -- Links to room_types.code (e.g., '1/2', 'SPIC', 'HILLS')

  -- Physical details
  description TEXT,
  size_sqm INT,
  distance_from_beach INT,               -- meters
  bed_config TEXT,                       -- e.g., 'french bed + extra bed'
  view TEXT,                             -- 'sea', 'garden', 'pool', 'mountain', 'park'
  floor_info TEXT,

  -- Capacity
  max_occupancy INT,
  max_adults INT,
  max_children INT,
  min_adults INT,                        -- Some rooms require min adults

  -- Features
  amenities TEXT[],                      -- ['AC', 'TV', 'balcony']

  -- CRITICAL: Warnings about the room
  warnings TEXT[],                       -- ['Not suitable for elderly - no elevator', 'Stairs only']

  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POLICIES TABLE (cancellation, deposit, restrictions)
-- ============================================
CREATE TABLE IF NOT EXISTS package_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  policy_type TEXT NOT NULL CHECK (policy_type IN ('cancellation', 'deposit', 'restriction', 'payment', 'general')),

  -- For cancellation policies
  -- Example: [{ "days_before": 14, "penalty_percent": 0 }, { "days_before": 7, "penalty_percent": 30 }, { "days_before": 0, "penalty_percent": 100 }]
  cancellation_rules JSONB,

  -- For deposit policies
  deposit_percent DECIMAL(5,2),          -- e.g., 30.00 for 30%
  deposit_due TEXT,                      -- 'on_booking', 'within_3_days'
  balance_due_days_before INT,           -- e.g., 14 = full payment 14 days before

  -- For restrictions
  min_stay INT,
  max_stay INT,
  check_in_days TEXT[],                  -- ['saturday'] for weekly packages
  min_adults INT,
  min_advance_booking_days INT,

  -- Documents required
  documents_required TEXT[],             -- ['ID card or passport']

  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- IMPORTANT NOTES TABLE
-- ============================================
-- General notes and warnings that don't fit elsewhere
CREATE TABLE IF NOT EXISTS package_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  note_type TEXT DEFAULT 'info' CHECK (note_type IN ('info', 'warning', 'promo')),
  text TEXT NOT NULL,
  applies_to TEXT[],                     -- Room type codes this note applies to, null = all

  source_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_package_supplements_package ON package_supplements(package_id);
CREATE INDEX IF NOT EXISTS idx_package_fees_package ON package_fees(package_id);
CREATE INDEX IF NOT EXISTS idx_package_discounts_package ON package_discounts(package_id);
CREATE INDEX IF NOT EXISTS idx_package_room_details_package ON package_room_details(package_id);
CREATE INDEX IF NOT EXISTS idx_package_policies_package ON package_policies(package_id);
CREATE INDEX IF NOT EXISTS idx_package_notes_package ON package_notes(package_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE package_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_room_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_notes ENABLE ROW LEVEL SECURITY;

-- Supplements
CREATE POLICY "Users can view own org package supplements"
  ON package_supplements FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package supplements"
  ON package_supplements FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Fees
CREATE POLICY "Users can view own org package fees"
  ON package_fees FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package fees"
  ON package_fees FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Discounts
CREATE POLICY "Users can view own org package discounts"
  ON package_discounts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package discounts"
  ON package_discounts FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Room details
CREATE POLICY "Users can view own org package room details"
  ON package_room_details FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package room details"
  ON package_room_details FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Policies
CREATE POLICY "Users can view own org package policies"
  ON package_policies FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package policies"
  ON package_policies FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Notes
CREATE POLICY "Users can view own org package notes"
  ON package_notes FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org package notes"
  ON package_notes FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
