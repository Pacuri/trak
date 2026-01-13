-- Abandoned carts table
-- For email capture and recovery campaigns

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Customer email
  email VARCHAR(255) NOT NULL,
  
  -- Qualification data
  qualification_data JSONB,
  
  -- Offers they viewed
  offers_shown UUID[],
  
  -- Discount code
  discount_code VARCHAR(50),
  discount_percent INTEGER DEFAULT 5,
  discount_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Email sequence tracking
  email_1_sent_at TIMESTAMP WITH TIME ZONE,
  email_2_sent_at TIMESTAMP WITH TIME ZONE,
  email_3_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  
  -- Unsubscribed
  unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_abandoned_carts_organization ON abandoned_carts(organization_id);
CREATE INDEX idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX idx_abandoned_carts_not_converted ON abandoned_carts(organization_id, converted) 
  WHERE converted = false;
CREATE INDEX idx_abandoned_carts_discount_code ON abandoned_carts(discount_code);

-- RLS
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization abandoned carts" ON abandoned_carts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization abandoned carts" ON abandoned_carts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can create abandoned carts
CREATE POLICY "Public can create abandoned carts" ON abandoned_carts
  FOR INSERT WITH CHECK (true);
