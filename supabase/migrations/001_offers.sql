-- Offers table
-- Travel packages/deals that agencies sell

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  
  -- Destination
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  
  -- Dates
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Pricing
  price_per_person DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2), -- For showing discounts
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Capacity
  total_spots INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  
  -- Details
  accommodation_type VARCHAR(50), -- hotel, apartment, villa
  board_type VARCHAR(50), -- all_inclusive, half_board, breakfast, room_only
  transport_type VARCHAR(50), -- flight, bus, none
  
  -- Inventory type: 'owned' = instant booking, 'inquiry' = on-request
  inventory_type VARCHAR(20) NOT NULL DEFAULT 'inquiry' CHECK (inventory_type IN ('owned', 'inquiry')),
  
  -- Labels & flags
  is_recommended BOOLEAN DEFAULT false,
  
  -- Analytics
  views_total INTEGER DEFAULT 0,
  views_last_24h INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_offers_organization ON offers(organization_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_departure_date ON offers(departure_date);
CREATE INDEX idx_offers_country ON offers(country);
CREATE INDEX idx_offers_inventory_type ON offers(inventory_type);

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Agents can view offers from their organization
CREATE POLICY "Users can view own organization offers" ON offers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Agents can create offers for their organization
CREATE POLICY "Users can create offers for own organization" ON offers
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Agents can update offers from their organization
CREATE POLICY "Users can update own organization offers" ON offers
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Agents can delete offers from their organization
CREATE POLICY "Users can delete own organization offers" ON offers
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can view active offers (for public pages)
CREATE POLICY "Public can view active offers" ON offers
  FOR SELECT USING (status = 'active');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
