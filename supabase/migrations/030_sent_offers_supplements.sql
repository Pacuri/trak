-- Migration: 030_sent_offers_supplements.sql
-- Add supplements/add-ons column to lead_sent_offers table

-- Add supplements column to store selected add-ons (sea view, baby cot, etc.)
ALTER TABLE lead_sent_offers
ADD COLUMN IF NOT EXISTS supplements JSONB;

-- Add departure_city column if not exists
ALTER TABLE lead_sent_offers
ADD COLUMN IF NOT EXISTS departure_city TEXT;

COMMENT ON COLUMN lead_sent_offers.supplements IS 'Selected optional supplements/add-ons like sea view, baby cot, etc. Format: [{id, name, amount, percent, per, currency}]';
COMMENT ON COLUMN lead_sent_offers.departure_city IS 'Departure city for the offer (e.g., Beograd)';
