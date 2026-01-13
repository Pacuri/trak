-- Payments table
-- Track all payment transactions

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Payment details
  payment_type VARCHAR(50), -- deposit, full, partial, refund
  payment_method VARCHAR(50), -- card, bank, cash
  payment_provider VARCHAR(50), -- wspay, stripe, manual
  
  -- Provider reference
  provider_transaction_id VARCHAR(255),
  provider_response JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')
  ),
  
  -- Metadata
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization payments" ON payments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization payments" ON payments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
