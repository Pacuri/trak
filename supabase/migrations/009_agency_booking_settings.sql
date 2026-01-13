-- Agency booking settings table
-- Public-facing settings for each agency

CREATE TABLE IF NOT EXISTS agency_booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Public URL slug
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Agency display info
  display_name VARCHAR(255),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  
  -- Contact info (shown on public pages)
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_address TEXT,
  
  -- Working hours per day
  -- Format: { "monday": { "enabled": true, "start": "09:00", "end": "17:00" }, ... }
  working_hours JSONB DEFAULT '{
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": true, "start": "09:00", "end": "14:00"},
    "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
  }'::JSONB,
  
  -- Response time settings (in minutes)
  response_time_working INTEGER DEFAULT 10, -- During working hours
  response_time_outside INTEGER DEFAULT 60, -- Outside working hours (next open)
  
  -- Reservation settings
  reservation_hold_hours INTEGER DEFAULT 72,
  deposit_percent INTEGER DEFAULT 20,
  
  -- Abandoned cart settings
  abandoned_cart_enabled BOOLEAN DEFAULT false,
  abandoned_cart_discount_percent INTEGER DEFAULT 5,
  abandoned_cart_discount_hours INTEGER DEFAULT 72,
  abandoned_cart_email_1_hours INTEGER DEFAULT 2,
  abandoned_cart_email_2_hours INTEGER DEFAULT 24,
  abandoned_cart_email_3_hours INTEGER DEFAULT 72,
  
  -- Feature flags
  allow_online_payment BOOLEAN DEFAULT false,
  allow_deposit_payment BOOLEAN DEFAULT true,
  allow_agency_payment BOOLEAN DEFAULT true,
  allow_contact_request BOOLEAN DEFAULT true,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agency_booking_settings_slug ON agency_booking_settings(slug);
CREATE INDEX idx_agency_booking_settings_organization ON agency_booking_settings(organization_id);

-- RLS
ALTER TABLE agency_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization settings" ON agency_booking_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization settings" ON agency_booking_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can view settings by slug (for public pages)
CREATE POLICY "Public can view settings by slug" ON agency_booking_settings
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER agency_booking_settings_updated_at
  BEFORE UPDATE ON agency_booking_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
