-- Add is_active column to agency_booking_settings
-- This allows agencies to be temporarily disabled without deleting them

-- Add the column with default true (all existing records become active)
ALTER TABLE agency_booking_settings
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Also add agency_name column if it doesn't exist (used in some routes)
ALTER TABLE agency_booking_settings
ADD COLUMN IF NOT EXISTS agency_name VARCHAR(255);

-- Create index for faster lookups on is_active
CREATE INDEX IF NOT EXISTS idx_agency_booking_settings_active
ON agency_booking_settings(slug, is_active);

-- Update all existing records to be active (in case column was added with NULL defaults before)
UPDATE agency_booking_settings
SET is_active = true
WHERE is_active IS NULL OR is_active = false;
