-- Migration: 021_lead_inquiry_reference.sql
-- Add reference from leads to their source custom_inquiry for rich data display

-- Add source_inquiry_id to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_inquiry_id UUID REFERENCES custom_inquiries(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_leads_source_inquiry ON leads(source_inquiry_id) WHERE source_inquiry_id IS NOT NULL;

-- Backfill existing leads from custom_inquiries that have converted_to_lead_id
UPDATE leads l
SET source_inquiry_id = ci.id
FROM custom_inquiries ci
WHERE ci.converted_to_lead_id = l.id
  AND l.source_inquiry_id IS NULL;

-- Comment
COMMENT ON COLUMN leads.source_inquiry_id IS 'Reference to original custom_inquiry for rich data display';
