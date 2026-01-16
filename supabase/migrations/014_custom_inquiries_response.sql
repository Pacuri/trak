-- Extend custom_inquiries table with response tracking fields
-- For inquiry response flow on dashboard

-- Add response tracking columns
ALTER TABLE custom_inquiries 
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS response_type VARCHAR(30) CHECK (response_type IN ('can_help', 'cannot_help', 'need_info')),
  ADD COLUMN IF NOT EXISTS response_message TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS converted_to_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Update status check constraint to include 'responded'
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE custom_inquiries DROP CONSTRAINT IF EXISTS custom_inquiries_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add updated constraint
ALTER TABLE custom_inquiries 
  ADD CONSTRAINT custom_inquiries_status_check 
  CHECK (status IN ('new', 'contacted', 'converted', 'closed', 'responded'));

-- Create index for pending inquiries (for dashboard query)
CREATE INDEX IF NOT EXISTS idx_custom_inquiries_pending 
ON custom_inquiries(organization_id, status, created_at) 
WHERE status = 'new';

-- Create index for response tracking
CREATE INDEX IF NOT EXISTS idx_custom_inquiries_responded 
ON custom_inquiries(organization_id, responded_at) 
WHERE responded_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN custom_inquiries.response_type IS 'can_help = agent will send quote, cannot_help = no availability, need_info = ask for clarification';
