-- Add archived field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for filtering archived leads
CREATE INDEX IF NOT EXISTS idx_leads_is_archived ON leads(is_archived);
CREATE INDEX IF NOT EXISTS idx_leads_org_archived ON leads(organization_id, is_archived);
