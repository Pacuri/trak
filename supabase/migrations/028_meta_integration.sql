-- Migration: 028_meta_integration.sql
-- Meta Business Suite integration for Facebook Messenger, Instagram DMs, and WhatsApp

-- ============================================
-- META INTEGRATIONS TABLE
-- ============================================
-- Stores connection info for Meta Business accounts (one per organization)

CREATE TABLE IF NOT EXISTS meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Meta App credentials
  page_id TEXT NOT NULL,                    -- Facebook Page ID
  page_name TEXT,                           -- Facebook Page name
  page_access_token TEXT NOT NULL,          -- Long-lived Page Access Token

  -- Instagram Business Account (optional, linked to Page)
  instagram_account_id TEXT,                -- Instagram Business Account ID
  instagram_username TEXT,                  -- @username

  -- WhatsApp Business (optional)
  whatsapp_phone_number_id TEXT,            -- WhatsApp Phone Number ID
  whatsapp_business_account_id TEXT,        -- WhatsApp Business Account ID

  -- Webhook verification
  webhook_verify_token TEXT NOT NULL,       -- Random token for webhook verification

  -- Enabled channels
  messenger_enabled BOOLEAN DEFAULT true,
  instagram_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_webhook_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_meta_per_org UNIQUE (organization_id)
);

-- Index for webhook lookups by page_id
CREATE INDEX idx_meta_integrations_page ON meta_integrations(page_id);
CREATE INDEX idx_meta_integrations_instagram ON meta_integrations(instagram_account_id) WHERE instagram_account_id IS NOT NULL;

-- ============================================
-- META CONVERSATIONS TABLE
-- ============================================
-- Track conversation threads from Meta platforms

CREATE TABLE IF NOT EXISTS meta_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meta_integration_id UUID NOT NULL REFERENCES meta_integrations(id) ON DELETE CASCADE,

  -- Platform info
  platform TEXT NOT NULL CHECK (platform IN ('messenger', 'instagram', 'whatsapp')),

  -- Conversation identifiers
  conversation_id TEXT NOT NULL,            -- Meta's conversation/thread ID
  participant_id TEXT NOT NULL,             -- PSID (Page-Scoped User ID) or IGSID or WhatsApp number

  -- Participant info (from Meta API)
  participant_name TEXT,
  participant_profile_pic TEXT,

  -- Link to our lead (once accepted/matched)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored', 'spam')),

  -- Timestamps
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_meta_conversation UNIQUE (organization_id, platform, participant_id)
);

CREATE INDEX idx_meta_conversations_org ON meta_conversations(organization_id);
CREATE INDEX idx_meta_conversations_lead ON meta_conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_meta_conversations_status ON meta_conversations(organization_id, status);

-- ============================================
-- UPDATE MESSAGES TABLE
-- ============================================
-- Add Meta-specific fields to messages table

-- Add external_platform to track message source
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'external_platform') THEN
    ALTER TABLE messages ADD COLUMN external_platform TEXT;
  END IF;
END $$;

-- Add meta_conversation_id for linking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'meta_conversation_id') THEN
    ALTER TABLE messages ADD COLUMN meta_conversation_id UUID REFERENCES meta_conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE meta_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_conversations ENABLE ROW LEVEL SECURITY;

-- Meta integrations policies
CREATE POLICY "meta_integrations_org_select" ON meta_integrations
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "meta_integrations_org_all" ON meta_integrations
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Meta conversations policies
CREATE POLICY "meta_conversations_org_select" ON meta_conversations
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "meta_conversations_org_all" ON meta_conversations
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE meta_conversations;
