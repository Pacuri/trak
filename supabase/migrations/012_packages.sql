-- Packages table
-- Groups departures under a single product (contract/rental)
-- Supports both "vlastita" (owned capacity) and "na_upit" (on-request) types

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Type: vlastita = own capacity, na_upit = on request
  package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('vlastita', 'na_upit')),
  
  -- Basic info
  name VARCHAR(200) NOT NULL,
  description TEXT,
  destination_country VARCHAR(100) NOT NULL,
  destination_city VARCHAR(100),
  hotel_name VARCHAR(200),
  hotel_stars INTEGER CHECK (hotel_stars BETWEEN 1 AND 5),
  
  -- Travel details
  board_type VARCHAR(50), -- all_inclusive, half_board, breakfast, room_only
  transport_type VARCHAR(50), -- flight, bus, none, own
  departure_location VARCHAR(200), -- e.g., "BAS Beograd", "Aerodrom BEG"
  
  -- For vlastita only: rental period
  rental_period_start DATE,
  rental_period_end DATE,
  
  -- Departure pattern (for auto-generating departures)
  departure_pattern VARCHAR(20) CHECK (departure_pattern IN ('weekly', 'custom')),
  departure_day INTEGER CHECK (departure_day BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  default_duration INTEGER, -- nights
  default_capacity INTEGER, -- spots per departure
  
  -- Pricing
  price_from DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_packages_organization ON packages(organization_id);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_type ON packages(package_type);
CREATE INDEX idx_packages_destination ON packages(destination_country, destination_city);

-- RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Users can view own organization packages
CREATE POLICY "Users can view own organization packages" ON packages
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create packages for own organization
CREATE POLICY "Users can create packages for own organization" ON packages
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update own organization packages
CREATE POLICY "Users can update own organization packages" ON packages
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete own organization packages
CREATE POLICY "Users can delete own organization packages" ON packages
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
