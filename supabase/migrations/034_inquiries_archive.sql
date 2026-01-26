-- Add is_archived column to custom_inquiries table
ALTER TABLE custom_inquiries
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add is_archived column to offer_inquiries table
ALTER TABLE offer_inquiries
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_custom_inquiries_archived ON custom_inquiries(is_archived);
CREATE INDEX IF NOT EXISTS idx_offer_inquiries_archived ON offer_inquiries(is_archived);
