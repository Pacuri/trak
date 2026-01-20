-- Migration: 025_email_candidates_realtime.sql
-- Enable Supabase Realtime for email_candidates table

-- Create the table if it doesn't exist (for fresh deployments)
CREATE TABLE IF NOT EXISTS email_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Gmail message info
  gmail_message_id TEXT,
  gmail_thread_id TEXT,

  -- Email fields
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  snippet TEXT,
  content TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),

  -- If converted to lead
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Timestamps
  email_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  -- Prevent duplicates
  CONSTRAINT unique_gmail_message UNIQUE (organization_id, gmail_message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_candidates_org ON email_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_candidates_status ON email_candidates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_email_candidates_email ON email_candidates(from_email);
CREATE INDEX IF NOT EXISTS idx_email_candidates_created ON email_candidates(created_at DESC);

-- Enable RLS
ALTER TABLE email_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to avoid errors)
DROP POLICY IF EXISTS "email_candidates_org_select" ON email_candidates;
DROP POLICY IF EXISTS "email_candidates_org_all" ON email_candidates;

CREATE POLICY "email_candidates_org_select" ON email_candidates
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "email_candidates_org_all" ON email_candidates
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Enable Realtime for email_candidates table
-- This allows Supabase client to subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE email_candidates;
