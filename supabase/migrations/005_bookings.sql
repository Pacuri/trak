-- Bookings table
-- Confirmed sales (completed transactions)

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  
  -- Who closed the sale
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Customer info (denormalized for history)
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  
  -- Guests
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  child_ages INTEGER[],
  
  -- Pricing
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Payment
  payment_method VARCHAR(50), -- card, bank, cash, mixed
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  
  -- External booking (not in system)
  is_external BOOLEAN DEFAULT false,
  external_destination VARCHAR(255),
  external_accommodation VARCHAR(255),
  external_dates VARCHAR(100),
  external_value DECIMAL(10,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  
  -- Cancellation
  cancellation_reason VARCHAR(255),
  refund_amount DECIMAL(10,2),
  
  -- Dates
  travel_date DATE,
  return_date DATE,
  
  -- Timestamps
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_bookings_organization ON bookings(organization_id);
CREATE INDEX idx_bookings_lead ON bookings(lead_id);
CREATE INDEX idx_bookings_offer ON bookings(offer_id);
CREATE INDEX idx_bookings_closed_by ON bookings(closed_by);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX idx_bookings_booked_at ON bookings(booked_at);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization bookings" ON bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization bookings" ON bookings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
