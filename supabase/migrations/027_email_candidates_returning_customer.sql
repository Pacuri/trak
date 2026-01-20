-- Migration: 027_email_candidates_returning_customer.sql
-- Add flag for returning customers in email candidates

-- Add column to track returning customers
ALTER TABLE email_candidates ADD COLUMN IF NOT EXISTS is_returning_customer BOOLEAN DEFAULT false;

-- Index for filtering returning customers
CREATE INDEX IF NOT EXISTS idx_email_candidates_returning ON email_candidates(organization_id, is_returning_customer) WHERE is_returning_customer = true;
