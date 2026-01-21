-- Migration: 029_lead_sent_offers.sql
-- Track offers/packages sent to leads for pipeline card display and analytics

-- ============================================
-- LEAD SENT OFFERS TABLE
-- ============================================
-- Records every offer link sent to a lead, with optional tracking

CREATE TABLE IF NOT EXISTS lead_sent_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Package info (denormalized for quick display on cards)
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  destination TEXT NOT NULL,              -- e.g., "Albanija" - short for card display

  -- Optional: Fully configured offer details
  room_type_id UUID,                      -- References package_room_types if specified
  room_type_name TEXT,                    -- e.g., "Double Room"
  meal_plan TEXT,                         -- e.g., "AI", "HB"
  selected_date DATE,                     -- Specific departure/check-in date
  duration_nights INTEGER,                -- e.g., 7
  guests_adults INTEGER,
  guests_children INTEGER,
  guest_child_ages INTEGER[],             -- e.g., [5, 8]
  price_total DECIMAL(10,2),              -- Calculated total price at time of sending
  currency TEXT DEFAULT 'EUR',

  -- Tracking
  tracking_id TEXT UNIQUE NOT NULL,       -- Short unique ID for tracking URL
  link_url TEXT NOT NULL,                 -- Full URL to the offer page

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ,                  -- When client clicked the tracking link
  inquiry_submitted_at TIMESTAMPTZ,       -- When client submitted inquiry from this offer

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lead_sent_offers_lead ON lead_sent_offers(lead_id);
CREATE INDEX idx_lead_sent_offers_org ON lead_sent_offers(organization_id);
CREATE INDEX idx_lead_sent_offers_tracking ON lead_sent_offers(tracking_id);
CREATE INDEX idx_lead_sent_offers_package ON lead_sent_offers(package_id);

-- ============================================
-- ADD SOURCE CHANNEL TO LEADS (optional enhancement)
-- ============================================
-- Track how the lead originally came in
-- This is optional - we can derive from meta_conversations or messages if needed

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'source_channel'
  ) THEN
    ALTER TABLE leads ADD COLUMN source_channel TEXT
      CHECK (source_channel IN ('email', 'messenger', 'instagram', 'whatsapp', 'web', 'manual'));
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE lead_sent_offers ENABLE ROW LEVEL SECURITY;

-- Select: Users can see offers from their organization
CREATE POLICY "lead_sent_offers_org_select" ON lead_sent_offers
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Insert: Users can create offers for their organization
CREATE POLICY "lead_sent_offers_org_insert" ON lead_sent_offers
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Update: Users can update offers in their organization (for tracking updates)
CREATE POLICY "lead_sent_offers_org_update" ON lead_sent_offers
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Delete: Users can delete offers from their organization
CREATE POLICY "lead_sent_offers_org_delete" ON lead_sent_offers
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- PUBLIC ACCESS FOR TRACKING (no auth required)
-- ============================================
-- Allow anonymous access to update viewed_at via tracking redirect
-- This is handled by the API route with service role, not RLS

-- ============================================
-- HELPER FUNCTION: Generate short tracking ID
-- ============================================
CREATE OR REPLACE FUNCTION generate_tracking_id(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
