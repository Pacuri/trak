-- Migration: 026_leads_awaiting_response.sql
-- Add awaiting_response tracking for inbox functionality

-- Add awaiting_response column to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS awaiting_response BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_customer_message_at TIMESTAMPTZ;

-- Index for quick inbox queries
CREATE INDEX IF NOT EXISTS idx_leads_awaiting_response ON leads(organization_id, awaiting_response) WHERE awaiting_response = true;
CREATE INDEX IF NOT EXISTS idx_leads_last_customer_message ON leads(last_customer_message_at DESC);

-- Enable realtime for messages table (for chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
