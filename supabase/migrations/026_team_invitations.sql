-- Team Invitations Table
-- Allows organization owners/admins to invite new members via email link

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Tracking
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending invitations to same email for same org
  UNIQUE (organization_id, email, status)
);

-- Index for fast token lookup
CREATE INDEX idx_team_invitations_token ON team_invitations(token) WHERE status = 'pending';

-- Index for listing invitations by org
CREATE INDEX idx_team_invitations_org ON team_invitations(organization_id, status);

-- RLS Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for their organization
CREATE POLICY "Users can view org invitations"
  ON team_invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Only owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owners and admins can update (revoke) invitations
CREATE POLICY "Owners and admins can update invitations"
  ON team_invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow public read access by token (for accepting invitations)
CREATE POLICY "Anyone can read invitation by token"
  ON team_invitations
  FOR SELECT
  USING (true);

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for invitations (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE team_invitations;

COMMENT ON TABLE team_invitations IS 'Stores pending and historical team member invitations';
