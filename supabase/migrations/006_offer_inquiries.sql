-- Offer inquiries table
-- For on-request (inquiry) inventory type offers

CREATE TABLE IF NOT EXISTS offer_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  
  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  customer_message TEXT,
  
  -- Qualification data from flow
  qualification_data JSONB,
  
  -- Status workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'checking', 'available', 'unavailable', 'alternative', 'expired')
  ),
  
  -- Response
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_note TEXT,
  
  -- If available, link to reservation
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  
  -- If unavailable, suggested alternative
  alternative_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_offer_inquiries_organization ON offer_inquiries(organization_id);
CREATE INDEX idx_offer_inquiries_offer ON offer_inquiries(offer_id);
CREATE INDEX idx_offer_inquiries_status ON offer_inquiries(status);
CREATE INDEX idx_offer_inquiries_pending ON offer_inquiries(organization_id, status) 
  WHERE status = 'pending';
CREATE INDEX idx_offer_inquiries_created_at ON offer_inquiries(created_at);

-- RLS
ALTER TABLE offer_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization inquiries" ON offer_inquiries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own organization inquiries" ON offer_inquiries
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can create inquiries
CREATE POLICY "Public can create inquiries" ON offer_inquiries
  FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER offer_inquiries_updated_at
  BEFORE UPDATE ON offer_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
