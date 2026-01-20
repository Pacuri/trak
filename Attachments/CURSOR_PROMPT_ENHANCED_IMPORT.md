# Cursor Prompt: Enhanced Document Import with Universal Pricing Schema

## Executive Summary

This prompt enhances the existing document import feature to capture ALL pricing elements from travel documents, not just basic prices. The current implementation already handles packages, room types, price intervals, price matrices, children policies, and transport. This enhancement adds: supplements, mandatory fees, discounts, room details, policies, and multi-language output support.

---

## Analysis: Current State vs. Required Enhancements

### Already Implemented (Do NOT duplicate)

| Feature | Location | Notes |
|---------|----------|-------|
| Document upload & storage | `src/app/api/packages/import/route.ts` | PDF, images, Excel supported |
| Claude AI parsing | `src/lib/anthropic.ts` | Vision + PDF + structured data |
| Price matrix extraction | Types in `src/types/import.ts` | interval -> room -> meal_plan -> price |
| Children policies | `children_policy_rules` table | Complex conditional rules with bed_type, position |
| Transport pricing | `transport_price_lists`, `transport_prices` | Per-city pricing with child prices |
| Currency handling | `EXCHANGE_RATES` in types | EUR, KM, RSD with conversion |
| Business model detection | `vlastita_marza` vs `posrednik` | Net vs retail pricing |
| Margin application | `applyMarginToResult()` | Applied to net prices |
| Review UI workflow | `DocumentImportFlow.tsx` | Multi-step wizard |
| Confidence scoring | Per-package and overall | With issues array |

### To Be Added (This enhancement)

| Feature | Purpose | Example from Documents |
|---------|---------|------------------------|
| **Supplements** | Optional add-ons | Sea view 7 EUR/person/day, Baby cot 7 EUR/day |
| **Mandatory fees** | Required costs not in base price | Tourist tax 28 BAM, Insurance 20 BAM |
| **Discounts/promotions** | Early bird, long stay | Early booking -10% |
| **Room details** | Physical specs, warnings | Hills - no elevator, 200m from beach |
| **Policies** | Deposit, cancellation | 30% deposit, cancellation rules |
| **Price type detection** | Per night vs per stay | Pearl Beach = per_person_per_night |
| **Included services** | Free amenities | Free sunbeds and umbrellas on beach |
| **Language/region setting** | rs/ba/hr output terminology | Dynamic based on org settings |

---

## Part 1: Database Schema Updates

Create new migration file: `supabase/migrations/017_enhanced_import_schema.sql`

```sql
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
```

---

## Part 2: Enhanced Claude Parsing Prompt

Create new file: `src/lib/prompts/document-parse-prompt.ts`

**IMPORTANT:** This replaces the inline prompts in `src/lib/anthropic.ts`. The existing `SYSTEM_PROMPT` and `OUTPUT_SCHEMA` should be deprecated in favor of this centralized prompt file.

```typescript
// src/lib/prompts/document-parse-prompt.ts
// Centralized AI parsing prompt with multi-language output support
// Replaces inline prompts in src/lib/anthropic.ts

export type LanguageRegion = 'rs' | 'ba' | 'hr';

/**
 * Language-specific output instructions
 * The AI will output field names and descriptions in the selected language
 */
const LANGUAGE_OUTPUT_INSTRUCTIONS = {
  rs: {
    instruction: 'Output all user-facing text (names, descriptions, notes) in Serbian (Latin script). Use Serbian terminology: cena, nocenje, polupansion, deca, smestaj, prevoz, doplata.',
    example_terms: { price: 'cena', child: 'dete', accommodation: 'smestaj', supplement: 'doplata' }
  },
  ba: {
    instruction: 'Output all user-facing text (names, descriptions, notes) in Bosnian (Latin script). Use Bosnian terminology: cijena, nocenje, polupansion, djeca, smjestaj, prijevoz, doplata.',
    example_terms: { price: 'cijena', child: 'dijete', accommodation: 'smjestaj', supplement: 'doplata' }
  },
  hr: {
    instruction: 'Output all user-facing text (names, descriptions, notes) in Croatian (Latin script). Use Croatian terminology: cijena, nocenje, polupansion, djeca, smjestaj, prijevoz, nadoplata.',
    example_terms: { price: 'cijena', child: 'dijete', accommodation: 'smjestaj', supplement: 'nadoplata' }
  }
} as const;

/**
 * Get the complete document parsing prompt with dynamic language output
 */
export function getDocumentParsePrompt(languageRegion: LanguageRegion = 'ba'): string {
  const langConfig = LANGUAGE_OUTPUT_INSTRUCTIONS[languageRegion];

  return `You are an expert AI assistant specialized in parsing travel agency documents from the Balkan region (Serbia, Bosnia and Herzegovina, Croatia).

## OUTPUT LANGUAGE
${langConfig.instruction}
- JSON structure keys remain in English (e.g., "hotel_name", "price_type")
- Values like names, descriptions, and notes should be in the target language
- Preserve original document text in source_text fields exactly as written

---

## TASK

Parse this document and extract ALL pricing information, conditions, and rules.

Return JSON with the structures described below. **ONLY INCLUDE SECTIONS FOR WHICH YOU FIND DATA.**

---

## CRITICAL PARSING RULES

### 1. PRICE TYPE (MOST IMPORTANT!)
Carefully determine if the price is:
- \`per_person_per_night\` - per person per DAY/NIGHT (e.g., "42 EUR per person per day")
- \`per_person_per_stay\` - per person for the ENTIRE STAY (e.g., "559 EUR" for 7 nights)

**Examples from real documents:**
- Pearl Beach: "Cijene su date po osobi i po danu" (Prices are per person per day) -> per_person_per_night
- Albania packages with 7-day intervals and prices like 559+ -> per_person_per_stay

### 2. CHILDREN POLICIES
Extract EVERY rule related to children. Pay attention to complex conditions:
- Number of adults in room: "If 1 adult stays with 1 child in the room"
- Child position: "Third child", "Fourth person is a child"
- Bed type: "on separate bed", "on shared bed", "free on shared bed"
- Age ranges: be precise (0-2.99, 3-11.99, 0-5.99, 6-11.99)
- Specific rooms: "If in Spic room 1/3 there are 2 adults..."

### 3. SUPPLEMENTS
Extract ALL optional and mandatory supplements:
- Sea view: often per person per day
- Single room: often a percentage (70%)
- Baby cot: usually fixed price per day
- Single use: supplement for one person in double room

### 4. MANDATORY FEES
These are costs NOT included in the package price:
- Tourist tax: usually different prices by age
- Travel insurance (PZO): may vary by age (over 60 years higher)
- Destination taxes

### 5. TRANSPORT
If transport price list exists:
- Distinguish "with package" vs "without package" (standalone) pricing
- Extract all departure cities
- Prices for children and adults
- Age limits for children (often 0-3.99 free, 4-11.99 reduced)

### 6. ROOM DETAILS
Extract physical characteristics and WARNINGS:
- Square meters
- Distance from beach/sea
- Bed configuration
- **CRITICAL**: Warnings like "Not suitable for elderly - no elevator"

---

## JSON SCHEMA

\`\`\`json
{
  "document_info": {
    "type": "price_list | contract | offer | unknown",
    "supplier_name": "string or null",
    "season": "e.g., 'Summer 2026'",
    "valid_from": "YYYY-MM-DD or null",
    "valid_to": "YYYY-MM-DD or null",
    "currency": "EUR | BAM | RSD | HRK",
    "source_text": "Original document title"
  },

  "business_model": {
    "type": "vlastita_marza | posrednik",
    "indicator": "What in the document indicates the model (e.g., 'net prices')",
    "notes": "string or null"
  },

  "packages": [
    {
      "hotel_name": "string",
      "stars": "1-5 or null",
      "destination": {
        "country": "string",
        "city": "string or null",
        "region": "string or null"
      },

      "price_type": "per_person_per_night | per_person_per_stay | per_room_per_night",
      "base_occupancy": 2,
      "meal_plan": "AI | FB | HB | BB | ND",

      "room_types": [
        {
          "code": "1/2",
          "name": "Double room (in target language)",
          "name_full": "Standard room with balcony",
          "max_persons": 2,
          "source_text": "string"
        }
      ],

      "price_intervals": [
        {
          "name": "Original name from document",
          "start_date": "YYYY-MM-DD",
          "end_date": "YYYY-MM-DD"
        }
      ],

      "price_matrix": {
        "[interval_name]": {
          "[room_code]": {
            "[meal_plan_code]": 123.00
          }
        }
      },

      "children_policies": [
        {
          "rule_name": "Descriptive rule name (in target language)",
          "priority": 1,
          "conditions": {
            "age_from": 0,
            "age_to": 2.99,
            "min_adults": "null or number",
            "max_adults": "null or number",
            "child_position": "null or 1/2/3/4 (first child, second child...)",
            "room_types": "null or ['1/3', 'SPIC']",
            "bed_type": "any | separate | shared"
          },
          "discount_type": "FREE | PERCENT | FIXED",
          "discount_value": "null for FREE, percentage for PERCENT, amount for FIXED",
          "source_text": "Original text from document"
        }
      ],

      "occupancy_pricing": {
        "base_occupancy": 2,
        "single_supplement_percent": 70,
        "third_person_discount_percent": 30,
        "fourth_person_discount_percent": 30,
        "source_text": "For 3rd and 4th bed 30% discount"
      },

      "room_details": [
        {
          "room_type_code": "HILLS",
          "description": "string",
          "size_sqm": 25,
          "distance_from_beach": 200,
          "bed_config": "string or null",
          "view": "sea | garden | pool | mountain | park | null",
          "max_occupancy": 4,
          "max_adults": 3,
          "min_adults": "null or number",
          "amenities": ["string"],
          "warnings": ["Not suitable for elderly - no elevator", "Stairs only"],
          "source_text": "string"
        }
      ],

      "confidence": "0.0-1.0"
    }
  ],

  "supplements": [
    {
      "code": "SEA_VIEW | BABY_COT | SINGLE_USE | EXTRA_BED | ...",
      "name": "Sea view (in target language)",
      "amount": "7 (fixed amount) or null",
      "percent": "70 (percentage) or null",
      "per": "night | stay | person_night | person_stay",
      "currency": "EUR",
      "mandatory": false,
      "conditions": "{ occupancy: 1 } or null",
      "source_text": "Sea view supplement 7 euros per person per day"
    }
  ],

  "mandatory_fees": [
    {
      "code": "TOURIST_TAX | INSURANCE | RESORT_FEE",
      "name": "Tourist tax (in target language)",
      "rules": [
        { "age_from": 0, "age_to": 1.99, "amount": 0 },
        { "age_from": 2, "age_to": 7.99, "amount": 14 },
        { "age_from": 8, "age_to": 99, "amount": 28 }
      ],
      "currency": "BAM",
      "per": "stay | night",
      "source_text": "string"
    }
  ],

  "discounts": [
    {
      "code": "EARLY_BIRD | LAST_MINUTE | LONG_STAY",
      "name": "Early booking (in target language)",
      "percent": 10,
      "conditions": {
        "book_before": "2026-03-01",
        "min_nights": "null or number"
      },
      "valid_from": "YYYY-MM-DD or null",
      "valid_to": "YYYY-MM-DD or null",
      "source_text": "string"
    }
  ],

  "policies": {
    "deposit": {
      "percent": 30,
      "due": "on_booking | within_3_days | ...",
      "balance_due_days_before": 14,
      "source_text": "30% deposit of total price"
    },
    "cancellation": {
      "rules": [
        { "days_before": 14, "penalty_percent": 0 },
        { "days_before": 7, "penalty_percent": 30 },
        { "days_before": 0, "penalty_percent": 100 }
      ],
      "source_text": "string"
    },
    "restrictions": {
      "min_stay": 7,
      "check_in_days": ["saturday"],
      "min_adults": "null or number",
      "min_advance_booking_days": "null or number",
      "documents_required": ["ID card or passport"],
      "source_text": "string"
    },
    "payment_options": {
      "installments_available": true,
      "card_payment_fee_percent": 5,
      "source_text": "string"
    }
  },

  "transport": {
    "included_in_package_price": false,
    "type": "bus | plane | ferry | own",
    "operator": "Transturist",
    "routes": [
      {
        "departure_city": "Tuzla",
        "departure_point": "string or null",
        "destination": "Durres",
        "adult_price": 129,
        "child_price": 89,
        "child_age_from": 4,
        "child_age_to": 11.99,
        "infant_price": 0,
        "infant_age_to": 3.99,
        "currency": "EUR",
        "standalone_adult_price": 169,
        "standalone_child_price": 109,
        "source_text": "Tuzla Durres 129 FREE 89"
      }
    ]
  },

  "included_services": [
    "Free sunbeds and umbrellas on beach (in target language)",
    "Free sunbeds at 4 pools and Aqua Park",
    "Free parking"
  ],

  "important_notes": [
    {
      "type": "warning | info | promo",
      "text": "Hills not suitable for elderly - no elevator, stairs only (in target language)",
      "applies_to": ["HILLS"]
    },
    {
      "type": "info",
      "text": "New building SPIC - 130 rooms 280m from sea",
      "applies_to": ["SPIC"]
    }
  ],

  "parsing_confidence": {
    "overall": 0.85,
    "issues": [
      "Some prices may have OCR errors",
      "Transport prices extracted from separate section"
    ]
  }
}
\`\`\`

---

## CONFIDENCE SCORE GUIDELINES

- **0.9+** = Clearly parsed, confident in all data
- **0.7-0.9** = Most data OK, some things may need verification
- **<0.7** = Significant uncertainties, needs human review

---

## CRITICAL NOTES

1. **NEVER fabricate data.** If something is unclear, set confidence to low and explain in issues.
2. **If a section doesn't exist in the document, DO NOT include it in JSON.**
3. **Preserve source_text** for all policies and rules - this is the audit trail.
4. **Convert all dates to ISO format** (YYYY-MM-DD). For "18.05.-31.05." assume the context year.
5. **Distinguish meal plans**: ND=room only, BB=breakfast, HB=half board, FB=full board, AI=all inclusive
`;
}

/**
 * Get system prompt for Claude (shorter, role-defining)
 */
export function getSystemPrompt(languageRegion: LanguageRegion = 'ba'): string {
  const langName = languageRegion === 'rs' ? 'Serbian' : languageRegion === 'ba' ? 'Bosnian' : 'Croatian';

  return `You are an expert parser for travel agency documents from the Balkan region (Serbia, Bosnia and Herzegovina, Croatia).

Specialization:
- Hotel price lists with complex children discount rules
- Package deals with transport
- Seasonal prices with date intervals
- Supplements, taxes, and cancellation policies

Your output is EXCLUSIVELY valid JSON without any comments or explanations outside the JSON structure.

Output language for user-facing text: ${langName}`;
}
```

---

## Part 3: Update Import API

Modify `src/app/api/packages/import/route.ts`:

```typescript
// Add to imports
import { getDocumentParsePrompt, getSystemPrompt } from '@/lib/prompts/document-parse-prompt'
import type { LanguageRegion } from '@/lib/prompts/document-parse-prompt'

// In POST handler, after getting organizationId:

// Get organization settings including language
const { data: org } = await supabase
  .from('organizations')
  .select('language_region')
  .eq('id', organizationId)
  .single()

const languageRegion = (org?.language_region || 'ba') as LanguageRegion

// Build prompts with language
const systemPrompt = getSystemPrompt(languageRegion)
const userPrompt = getDocumentParsePrompt(languageRegion)

// Update Claude calls to use new prompts
// In parseDocumentWithVision, parsePdfDocument, parseStructuredData:
// - Replace SYSTEM_PROMPT with systemPrompt
// - Replace OUTPUT_SCHEMA usage with userPrompt

// Return enhanced structure
return NextResponse.json({
  success: true,
  import_id: importRecord.id,
  result: {
    ...parseResult,
    // Ensure all new fields are included (even if null)
    supplements: parseResult.supplements || [],
    mandatory_fees: parseResult.mandatory_fees || [],
    discounts: parseResult.discounts || [],
    policies: parseResult.policies || null,
    included_services: parseResult.included_services || [],
    important_notes: parseResult.important_notes || [],
  }
})
```

---

## Part 4: Update Type Definitions

Add to `src/types/import.ts`:

```typescript
// ============================================
// NEW TYPES FOR ENHANCED PARSING
// ============================================

export type PriceType = 'per_person_per_night' | 'per_person_per_stay' | 'per_room_per_night' | 'per_unit';
export type SupplementPer = 'night' | 'stay' | 'person_night' | 'person_stay';
export type NoteType = 'warning' | 'info' | 'promo';

export interface ParsedSupplement {
  code: string;
  name: string;
  amount?: number;
  percent?: number;
  per: SupplementPer;
  currency: string;
  mandatory: boolean;
  conditions?: Record<string, unknown>;
  source_text: string;
}

export interface FeeRule {
  age_from: number;
  age_to: number;
  amount: number;
}

export interface ParsedMandatoryFee {
  code: string;
  name: string;
  rules: FeeRule[];
  currency: string;
  per: 'stay' | 'night';
  source_text: string;
}

export interface ParsedDiscount {
  code: string;
  name: string;
  percent?: number;
  fixed_amount?: number;
  conditions?: {
    book_before?: string;
    min_nights?: number;
  };
  valid_from?: string;
  valid_to?: string;
  source_text: string;
}

export interface ParsedRoomDetail {
  room_type_code: string;
  description?: string;
  size_sqm?: number;
  distance_from_beach?: number;
  bed_config?: string;
  view?: string;
  max_occupancy?: number;
  max_adults?: number;
  min_adults?: number;
  amenities?: string[];
  warnings?: string[];
  source_text?: string;
}

export interface OccupancyPricing {
  base_occupancy: number;
  single_supplement_percent?: number;
  third_person_discount_percent?: number;
  fourth_person_discount_percent?: number;
  source_text?: string;
}

export interface ParsedPolicies {
  deposit?: {
    percent: number;
    due: string;
    balance_due_days_before?: number;
    source_text: string;
  };
  cancellation?: {
    rules: Array<{ days_before: number; penalty_percent: number }>;
    source_text: string;
  };
  restrictions?: {
    min_stay?: number;
    check_in_days?: string[];
    min_adults?: number;
    documents_required?: string[];
    source_text?: string;
  };
  payment_options?: {
    installments_available?: boolean;
    card_payment_fee_percent?: number;
    source_text?: string;
  };
}

export interface ParsedTransportRoute {
  departure_city: string;
  departure_point?: string;
  destination: string;
  adult_price: number;
  child_price?: number;
  child_age_from?: number;
  child_age_to?: number;
  infant_price?: number;
  infant_age_to?: number;
  currency: string;
  standalone_adult_price?: number;
  standalone_child_price?: number;
  source_text?: string;
}

export interface ParsedImportantNote {
  type: NoteType;
  text: string;
  applies_to?: string[];
}

// Update DocumentParseResult to include new fields
export interface EnhancedDocumentParseResult extends DocumentParseResult {
  supplements?: ParsedSupplement[];
  mandatory_fees?: ParsedMandatoryFee[];
  discounts?: ParsedDiscount[];
  policies?: ParsedPolicies;
  included_services?: string[];
  important_notes?: ParsedImportantNote[];
}

// Update ParsedPackage
export interface EnhancedParsedPackage extends ParsedPackage {
  price_type: PriceType;
  base_occupancy: number;
  occupancy_pricing?: OccupancyPricing;
  room_details?: ParsedRoomDetail[];
}
```

---

## Part 5: Update Save Endpoint

Modify `src/app/api/packages/import/save/route.ts` to save all new entities:

```typescript
// After creating package, save additional entities

// Save supplements
if (parseResult.supplements?.length) {
  const supplements = parseResult.supplements.map(s => ({
    package_id: newPackage.id,
    organization_id: organizationId,
    code: s.code,
    name: s.name,
    amount: s.amount,
    percent: s.percent,
    per: s.per,
    currency: s.currency || 'EUR',
    mandatory: s.mandatory,
    conditions: s.conditions,
    source_text: s.source_text,
  }));
  await supabase.from('package_supplements').insert(supplements);
}

// Save mandatory fees
if (parseResult.mandatory_fees?.length) {
  const fees = parseResult.mandatory_fees.map(f => ({
    package_id: newPackage.id,
    organization_id: organizationId,
    code: f.code,
    name: f.name,
    rules: f.rules,
    currency: f.currency || 'BAM',
    per: f.per,
    source_text: f.source_text,
  }));
  await supabase.from('package_fees').insert(fees);
}

// Save discounts
if (parseResult.discounts?.length) {
  const discounts = parseResult.discounts.map(d => ({
    package_id: newPackage.id,
    organization_id: organizationId,
    code: d.code,
    name: d.name,
    percent: d.percent,
    fixed_amount: d.fixed_amount,
    conditions: d.conditions,
    valid_from: d.valid_from,
    valid_to: d.valid_to,
    source_text: d.source_text,
  }));
  await supabase.from('package_discounts').insert(discounts);
}

// Save room details
for (const pkg of selectedPackages) {
  if (pkg.room_details?.length) {
    const details = pkg.room_details.map(rd => ({
      package_id: newPackage.id,
      organization_id: organizationId,
      room_type_code: rd.room_type_code,
      description: rd.description,
      size_sqm: rd.size_sqm,
      distance_from_beach: rd.distance_from_beach,
      bed_config: rd.bed_config,
      view: rd.view,
      max_occupancy: rd.max_occupancy,
      max_adults: rd.max_adults,
      min_adults: rd.min_adults,
      amenities: rd.amenities,
      warnings: rd.warnings,
      source_text: rd.source_text,
    }));
    await supabase.from('package_room_details').insert(details);
  }
}

// Save policies
if (parseResult.policies) {
  const policyInserts = [];

  if (parseResult.policies.deposit) {
    policyInserts.push({
      package_id: newPackage.id,
      organization_id: organizationId,
      policy_type: 'deposit',
      deposit_percent: parseResult.policies.deposit.percent,
      deposit_due: parseResult.policies.deposit.due,
      balance_due_days_before: parseResult.policies.deposit.balance_due_days_before,
      source_text: parseResult.policies.deposit.source_text,
    });
  }

  if (parseResult.policies.cancellation) {
    policyInserts.push({
      package_id: newPackage.id,
      organization_id: organizationId,
      policy_type: 'cancellation',
      cancellation_rules: parseResult.policies.cancellation.rules,
      source_text: parseResult.policies.cancellation.source_text,
    });
  }

  if (parseResult.policies.restrictions) {
    policyInserts.push({
      package_id: newPackage.id,
      organization_id: organizationId,
      policy_type: 'restriction',
      min_stay: parseResult.policies.restrictions.min_stay,
      check_in_days: parseResult.policies.restrictions.check_in_days,
      min_adults: parseResult.policies.restrictions.min_adults,
      documents_required: parseResult.policies.restrictions.documents_required,
      source_text: parseResult.policies.restrictions.source_text,
    });
  }

  if (policyInserts.length) {
    await supabase.from('package_policies').insert(policyInserts);
  }
}

// Save important notes
if (parseResult.important_notes?.length) {
  const notes = parseResult.important_notes.map(n => ({
    package_id: newPackage.id,
    organization_id: organizationId,
    note_type: n.type,
    text: n.text,
    applies_to: n.applies_to,
    source_text: n.text,
  }));
  await supabase.from('package_notes').insert(notes);
}
```

---

## Part 6: UI Components for Review Screen

### 6.1 Attention Section Component

Create `src/components/packages/import/ImportAttentionSection.tsx`:

```tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import type {
  ParsedSupplement,
  ParsedMandatoryFee,
  ParsedPolicies,
  ParsedRoomDetail,
  ParsedImportantNote,
  PriceType
} from '@/types/import';

interface ImportAttentionSectionProps {
  priceType?: PriceType;
  supplements?: ParsedSupplement[];
  mandatoryFees?: ParsedMandatoryFee[];
  policies?: ParsedPolicies | null;
  includedServices?: string[];
  importantNotes?: ParsedImportantNote[];
  roomDetails?: ParsedRoomDetail[];
}

export function ImportAttentionSection({
  priceType,
  supplements = [],
  mandatoryFees = [],
  policies,
  includedServices = [],
  importantNotes = [],
  roomDetails = [],
}: ImportAttentionSectionProps) {
  // Collect all attention-worthy items
  const items: { text: string; type: 'warning' | 'info' | 'highlight' }[] = [];

  // Price type warning
  if (priceType === 'per_person_per_night') {
    items.push({
      text: 'Prices are per person per NIGHT (not per stay)',
      type: 'highlight'
    });
  }

  // Included services
  includedServices.forEach(s => {
    items.push({ text: s, type: 'info' });
  });

  // Supplements
  supplements.forEach(s => {
    let text = '';
    if (s.percent) {
      text = `${s.percent}% ${s.name.toLowerCase()}`;
    } else if (s.amount) {
      const perText = s.per === 'person_night' ? 'per person per day' :
                      s.per === 'night' ? 'per day' :
                      s.per === 'stay' ? 'per stay' : '';
      text = `${s.amount} ${s.currency} ${perText} - ${s.name.toLowerCase()}`;
    }
    if (text) items.push({ text, type: 'info' });
  });

  // Room warnings (critical!)
  roomDetails.forEach(r => {
    r.warnings?.forEach(w => {
      items.push({ text: w, type: 'warning' });
    });
  });

  // Important notes
  importantNotes.forEach(n => {
    items.push({
      text: n.text,
      type: n.type === 'warning' ? 'warning' : 'info'
    });
  });

  // Restrictions
  if (policies?.restrictions?.min_stay) {
    items.push({
      text: `Minimum ${policies.restrictions.min_stay} nights`,
      type: 'info'
    });
  }
  if (policies?.restrictions?.documents_required?.length) {
    items.push({
      text: `Required documents: ${policies.restrictions.documents_required.join(', ')}`,
      type: 'info'
    });
  }

  // Don't render if no items
  if (items.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 mb-2">Attention Required:</h4>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li
                key={i}
                className={`text-sm flex items-start gap-2 ${
                  item.type === 'warning' ? 'text-red-700 font-medium' :
                  item.type === 'highlight' ? 'text-amber-800 font-medium' :
                  'text-amber-700'
                }`}
              >
                <span>-</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### 6.2 Mandatory Fees Section

Create `src/components/packages/import/MandatoryFeesSection.tsx`:

```tsx
'use client';

import { Receipt } from 'lucide-react';
import type { ParsedMandatoryFee } from '@/types/import';

interface MandatoryFeesSectionProps {
  fees: ParsedMandatoryFee[];
}

export function MandatoryFeesSection({ fees }: MandatoryFeesSectionProps) {
  if (!fees || fees.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h4 className="font-medium mb-3 flex items-center gap-2 text-red-700">
        <Receipt className="w-4 h-4" />
        Mandatory Fees (NOT included in price)
      </h4>

      <div className="space-y-3">
        {fees.map((fee, i) => (
          <div key={i} className="bg-red-50 rounded p-3 border border-red-100">
            <div className="font-medium text-sm text-red-800">{fee.name}</div>
            <div className="text-xs text-red-600 mt-1 space-y-0.5">
              {fee.rules.map((rule, j) => (
                <div key={j}>
                  {rule.age_from === rule.age_to ? (
                    `${rule.age_from} years: ${rule.amount} ${fee.currency}`
                  ) : (
                    `${rule.age_from}-${rule.age_to} years: ${rule.amount} ${fee.currency}`
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {fee.per === 'stay' ? 'Per stay' : 'Per night'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.3 Transport Section

Create `src/components/packages/import/TransportSection.tsx`:

```tsx
'use client';

import { Bus, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ParsedTransport } from '@/types/import';

interface TransportSectionProps {
  transport: ParsedTransport | null | undefined;
}

export function TransportSection({ transport }: TransportSectionProps) {
  if (!transport?.routes?.length) return null;

  const Icon = transport.type === 'plane' ? Plane : Bus;

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        Transport ({transport.routes.length} cities)
        {!transport.included_in_package_price && (
          <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
            Not included in price
          </Badge>
        )}
      </h4>

      <div className="flex flex-wrap gap-2">
        {transport.routes.slice(0, 10).map((route, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-full px-3 py-1 text-sm"
            title={route.source_text}
          >
            <span className="font-medium">{route.departure_city}</span>
            <span className="text-gray-500 mx-1">-></span>
            <span>{route.adult_price} {route.currency}</span>
          </div>
        ))}
        {transport.routes.length > 10 && (
          <div className="text-sm text-gray-500 self-center">
            +{transport.routes.length - 10} more
          </div>
        )}
      </div>

      {transport.operator && (
        <div className="text-xs text-gray-500 mt-2">
          Operator: {transport.operator}
        </div>
      )}
    </div>
  );
}
```

---

## Part 7: Organization Settings UI

Add to settings page or create new component:

```tsx
// In src/app/(dashboard)/settings/page.tsx or similar

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// In component:
const [languageRegion, setLanguageRegion] = useState<string>(organization?.language_region || 'ba');

// In form:
<div className="space-y-2">
  <Label>Region / Language</Label>
  <Select value={languageRegion} onValueChange={setLanguageRegion}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="rs">
        Serbia (Serbian)
      </SelectItem>
      <SelectItem value="ba">
        Bosnia and Herzegovina (Bosnian)
      </SelectItem>
      <SelectItem value="hr">
        Croatia (Croatian)
      </SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Affects AI document parsing output language and system terminology
  </p>
</div>
```

---

## Summary: Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/017_enhanced_import_schema.sql` | **CREATE** | New tables for supplements, fees, discounts, room details, policies, notes |
| `src/lib/prompts/document-parse-prompt.ts` | **CREATE** | Centralized AI prompt with multi-language output support |
| `src/types/import.ts` | **MODIFY** | Add new type definitions |
| `src/app/api/packages/import/route.ts` | **MODIFY** | Use new prompts, return enhanced data |
| `src/app/api/packages/import/save/route.ts` | **MODIFY** | Save all new entities |
| `src/lib/anthropic.ts` | **MODIFY** | Deprecate inline prompts, use centralized prompts |
| `src/components/packages/import/ImportAttentionSection.tsx` | **CREATE** | Attention/warnings display |
| `src/components/packages/import/MandatoryFeesSection.tsx` | **CREATE** | Fees display |
| `src/components/packages/import/TransportSection.tsx` | **CREATE** | Transport display |
| `src/components/packages/ImportReviewScreen.tsx` | **MODIFY** | Integrate new sections |
| Organization settings UI | **MODIFY** | Add language selector |

---

## Key Implementation Notes

1. **Backward Compatibility**: All new fields are optional. Existing imports will continue to work.

2. **Language Handling**:
   - The Cursor prompt (this document) is in English for developers
   - The Claude parsing prompt is in English with instructions to output user-facing text in the selected language
   - JSON keys remain in English; values (names, descriptions) are in the target language based on `language_region`

3. **Price Type Detection**: This is CRITICAL. The AI must correctly identify:
   - Pearl Beach: "po osobi i po danu" -> `per_person_per_night`
   - Albania packages: 7-day stays with total prices -> `per_person_per_stay`

4. **Conditional Display**: Only show sections that have data. Use pattern:
   ```tsx
   {data?.length > 0 && <Component data={data} />}
   ```

5. **Source Text Preservation**: Always preserve original text for audit trail and user reference.

6. **Confidence Communication**: Show parsing confidence clearly and list any issues for user review.
