-- Reservations table
-- Temporary holds on offers (72h default)

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Unique reservation code
  code VARCHAR(50) UNIQUE NOT NULL, -- TRK-2026-001234
  
  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  
  -- Guests
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[],
  
  -- Pricing
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Payment selection
  payment_option VARCHAR(50), -- deposit, full, agency, contact
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'converted')),
  
  -- Expiry
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Email reminders sent
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_48h_sent BOOLEAN DEFAULT false,
  
  -- Qualification data from flow
  qualification_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_reservations_organization ON reservations(organization_id);
CREATE INDEX idx_reservations_offer ON reservations(offer_id);
CREATE INDEX idx_reservations_lead ON reservations(lead_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_reservations_code ON reservations(code);

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization reservations" ON reservations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization reservations" ON reservations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can create reservations
CREATE POLICY "Public can create reservations" ON reservations
  FOR INSERT WITH CHECK (true);

-- Public can view their own reservation by code
CREATE POLICY "Public can view reservation by code" ON reservations
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();

-- Function to generate reservation code
CREATE OR REPLACE FUNCTION generate_reservation_code()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_code VARCHAR(50);
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 10 FOR 6) AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM reservations
  WHERE code LIKE 'TRK-' || year_part || '-%';
  
  new_code := 'TRK-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  NEW.code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_code_gen
  BEFORE INSERT ON reservations
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_reservation_code();
