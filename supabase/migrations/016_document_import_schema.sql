-- Migration: 016_document_import_schema.sql
-- Document Import feature: tables for AI-parsed price lists
-- Applied via Supabase MCP on 2026-01-17

-- ============================================
-- DOCUMENT IMPORTS (tracks uploaded documents)
-- ============================================
CREATE TABLE IF NOT EXISTS document_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  file_size_bytes INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  parsed_at TIMESTAMPTZ,
  parse_result JSONB,
  error_message TEXT,
  packages_found INT DEFAULT 0,
  packages_imported INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- TRANSPORT PRICE LISTS (reusable transport configs)
-- ============================================
CREATE TABLE IF NOT EXISTS transport_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supplier_name TEXT,
  transport_type TEXT,
  valid_from DATE,
  valid_to DATE,
  source_document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSPORT PRICES (per-city pricing)
-- ============================================
CREATE TABLE IF NOT EXISTS transport_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES transport_price_lists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  departure_city TEXT NOT NULL,
  departure_location TEXT,
  price_per_person DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  child_price DECIMAL(10,2),
  child_age_limit INT DEFAULT 12,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHILDREN POLICY RULES (complex discount rules)
-- ============================================
CREATE TABLE IF NOT EXISTS children_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name TEXT,
  priority INT DEFAULT 0,
  -- Conditions
  min_adults INT,
  max_adults INT,
  child_position INT,
  room_type_codes TEXT[],
  bed_type TEXT CHECK (bed_type IS NULL OR bed_type IN ('any', 'separate', 'shared', 'extra')),
  -- Age and discount
  age_from NUMERIC DEFAULT 0,
  age_to NUMERIC DEFAULT 17.99,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('FREE', 'PERCENT', 'FIXED')),
  discount_value NUMERIC,
  source_text TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD COLUMNS TO PACKAGES TABLE
-- ============================================
ALTER TABLE packages ADD COLUMN IF NOT EXISTS transport_price_list_id UUID REFERENCES transport_price_lists(id);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS original_currency TEXT DEFAULT 'EUR';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS prices_are_net BOOLEAN DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS margin_percent NUMERIC;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS source_document_url TEXT;

-- ============================================
-- ADD COLUMNS TO HOTEL_PRICES TABLE
-- ============================================
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_price_nd NUMERIC;
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_price_bb NUMERIC;
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_price_hb NUMERIC;
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_price_fb NUMERIC;
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_price_ai NUMERIC;
ALTER TABLE hotel_prices ADD COLUMN IF NOT EXISTS original_currency TEXT;

-- ============================================
-- ADD COLUMNS TO APARTMENT_PRICES TABLE
-- ============================================
ALTER TABLE apartment_prices ADD COLUMN IF NOT EXISTS original_price NUMERIC;
ALTER TABLE apartment_prices ADD COLUMN IF NOT EXISTS original_currency TEXT;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_document_imports_org ON document_imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_imports_status ON document_imports(status);
CREATE INDEX IF NOT EXISTS idx_transport_price_lists_org ON transport_price_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_transport_prices_list ON transport_prices(price_list_id);
CREATE INDEX IF NOT EXISTS idx_children_policy_rules_package ON children_policy_rules(package_id);
CREATE INDEX IF NOT EXISTS idx_children_policy_rules_org ON children_policy_rules(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE document_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_policy_rules ENABLE ROW LEVEL SECURITY;

-- Document imports
CREATE POLICY "Users can view own org document imports"
  ON document_imports FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org document imports"
  ON document_imports FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own org document imports"
  ON document_imports FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Transport price lists
CREATE POLICY "Users can view own org transport price lists"
  ON transport_price_lists FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org transport price lists"
  ON transport_price_lists FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Transport prices
CREATE POLICY "Users can view own org transport prices"
  ON transport_prices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org transport prices"
  ON transport_prices FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Children policy rules
CREATE POLICY "Users can view own org children policy rules"
  ON children_policy_rules FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own org children policy rules"
  ON children_policy_rules FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));
