-- Migration: 020_email_integration.sql
-- Email integration for inquiry responses: OAuth tokens, templates, response tracking

-- ============================================
-- EMAIL INTEGRATIONS TABLE
-- ============================================
-- Stores OAuth credentials for connected email accounts (Gmail, etc.)

CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider info
  provider TEXT NOT NULL DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'smtp')),

  -- Account info
  email_address TEXT NOT NULL,
  display_name TEXT,                        -- "Moja Agencija" - shown in From field

  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- For SMTP fallback
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,                       -- Encrypted

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,

  -- Audit
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_email_per_org UNIQUE (organization_id)
);

-- ============================================
-- RESPONSE TEMPLATES TABLE
-- ============================================
-- Customizable email templates for inquiry responses

CREATE TABLE IF NOT EXISTS response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template identification
  template_type TEXT NOT NULL CHECK (template_type IN (
    'can_organize',         -- Možemo da organizujemo
    'cannot_organize',      -- Ne možemo
    'need_more_info',       -- Potrebno više informacija
    'custom'                -- Custom template
  )),

  -- Content
  name TEXT NOT NULL,                       -- Display name in dropdown
  subject TEXT NOT NULL,                    -- Email subject line
  body TEXT NOT NULL,                       -- Email body (supports variables)

  -- Variables available:
  -- {{ime}} - Customer first name
  -- {{prezime}} - Customer last name
  -- {{destinacija}} - Destination
  -- {{datum_polaska}} - Departure date
  -- {{paket}} - Package name
  -- {{broj_putnika}} - Number of travelers
  -- {{agencija}} - Agency name
  -- {{agent}} - Agent name
  -- {{telefon_agencije}} - Agency phone
  -- {{email_agencije}} - Agency email

  -- Settings
  is_default BOOLEAN DEFAULT false,         -- Default for this template_type
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,               -- Sort order

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Ensure only one default per type per org
CREATE UNIQUE INDEX idx_response_templates_default
  ON response_templates(organization_id, template_type)
  WHERE is_default = true;

CREATE INDEX idx_response_templates_org ON response_templates(organization_id);
CREATE INDEX idx_response_templates_type ON response_templates(organization_id, template_type);

-- ============================================
-- LEAD RESPONSES TABLE
-- ============================================
-- Track all responses sent to leads/inquiries

CREATE TABLE IF NOT EXISTS lead_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Response details
  response_type TEXT NOT NULL CHECK (response_type IN (
    'can_organize',
    'cannot_organize',
    'need_more_info',
    'custom',
    'follow_up'
  )),

  -- Channel
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'phone', 'manual')),

  -- Email specifics
  template_id UUID REFERENCES response_templates(id),
  subject TEXT,
  body TEXT NOT NULL,                       -- Rendered body (variables replaced)

  -- Recipient
  recipient_email TEXT,
  recipient_phone TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'draft',
    'sending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed'
  )),

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,

  -- Email provider message ID (for tracking)
  external_id TEXT,

  -- Who sent it
  sent_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_responses_lead ON lead_responses(lead_id);
CREATE INDEX idx_lead_responses_org ON lead_responses(organization_id);
CREATE INDEX idx_lead_responses_status ON lead_responses(status);

-- ============================================
-- UPDATE LEADS TABLE
-- ============================================
-- Add response tracking fields

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_response_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0;

-- ============================================
-- DEFAULT TEMPLATES FUNCTION
-- ============================================
-- Creates default templates for new organizations

CREATE OR REPLACE FUNCTION create_default_response_templates(p_org_id UUID)
RETURNS void AS $$
BEGIN
  -- Can organize template
  INSERT INTO response_templates (organization_id, template_type, name, subject, body, is_default, position)
  VALUES (
    p_org_id,
    'can_organize',
    'Možemo da organizujemo',
    'Ponuda za {{destinacija}} - {{agencija}}',
    'Poštovani/a {{ime}},

Hvala Vam na interesovanju za putovanje u {{destinacija}}.

Sa zadovoljstvom Vas obaveštavamo da možemo da organizujemo Vaše putovanje prema sledećim detaljima:

Destinacija: {{destinacija}}
Datum polaska: {{datum_polaska}}
Broj putnika: {{broj_putnika}}

U prilogu Vam šaljemo detaljnu ponudu sa cenama i uslovima.

Za sve dodatne informacije, slobodno nas kontaktirajte.

Srdačan pozdrav,
{{agent}}
{{agencija}}
Tel: {{telefon_agencije}}',
    true,
    1
  );

  -- Cannot organize template
  INSERT INTO response_templates (organization_id, template_type, name, subject, body, is_default, position)
  VALUES (
    p_org_id,
    'cannot_organize',
    'Ne možemo da organizujemo',
    'Odgovor na upit - {{agencija}}',
    'Poštovani/a {{ime}},

Hvala Vam na interesovanju za putovanje u {{destinacija}}.

Nažalost, u ovom trenutku nismo u mogućnosti da organizujemo putovanje prema Vašim željama.

Razlog: [UNESITE RAZLOG]

Međutim, rado bismo Vam ponudili alternativne opcije koje bi mogle da Vam odgovaraju. Molimo Vas da nas kontaktirate kako bismo pronašli najbolje rešenje za Vas.

Srdačan pozdrav,
{{agent}}
{{agencija}}
Tel: {{telefon_agencije}}',
    true,
    2
  );

  -- Need more info template
  INSERT INTO response_templates (organization_id, template_type, name, subject, body, is_default, position)
  VALUES (
    p_org_id,
    'need_more_info',
    'Potrebno više informacija',
    'Dodatne informacije potrebne - {{agencija}}',
    'Poštovani/a {{ime}},

Hvala Vam na interesovanju za putovanje u {{destinacija}}.

Da bismo Vam pripremili najbolju moguću ponudu, potrebne su nam sledeće dodatne informacije:

- [UNESITE PITANJA]

Molimo Vas da nam odgovorite na ova pitanja kako bismo mogli da nastavimo sa pripremom Vaše ponude.

Srdačan pozdrav,
{{agent}}
{{agencija}}
Tel: {{telefon_agencije}}',
    true,
    3
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Create templates for new orgs
-- ============================================

CREATE OR REPLACE FUNCTION trigger_create_default_templates()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_response_templates(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_default_templates ON organizations;
CREATE TRIGGER trigger_org_default_templates
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_templates();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_responses ENABLE ROW LEVEL SECURITY;

-- Email integrations
CREATE POLICY "email_integrations_org_select" ON email_integrations
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "email_integrations_org_all" ON email_integrations
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Response templates
CREATE POLICY "response_templates_org_select" ON response_templates
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "response_templates_org_all" ON response_templates
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Lead responses
CREATE POLICY "lead_responses_org_select" ON lead_responses
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "lead_responses_org_all" ON lead_responses
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- CREATE DEFAULT TEMPLATES FOR EXISTING ORGS
-- ============================================

DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    -- Only create if no templates exist
    IF NOT EXISTS (SELECT 1 FROM response_templates WHERE organization_id = org_record.id) THEN
      PERFORM create_default_response_templates(org_record.id);
    END IF;
  END LOOP;
END $$;
