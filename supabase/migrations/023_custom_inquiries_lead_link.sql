-- Migration: 023_custom_inquiries_lead_link.sql
-- Add bidirectional link between custom_inquiries and leads

-- Add lead_id to custom_inquiries table
ALTER TABLE custom_inquiries ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_custom_inquiries_lead ON custom_inquiries(lead_id) WHERE lead_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN custom_inquiries.lead_id IS 'Reference to the lead created from this inquiry';
