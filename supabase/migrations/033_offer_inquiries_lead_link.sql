-- Add lead_id column to offer_inquiries table
-- This allows offer inquiries to be linked to leads for CRM inbox integration

ALTER TABLE offer_inquiries
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_offer_inquiries_lead_id ON offer_inquiries(lead_id);

-- Comment for documentation
COMMENT ON COLUMN offer_inquiries.lead_id IS 'Link to the lead created when this inquiry was submitted. Enables CRM inbox integration.';
