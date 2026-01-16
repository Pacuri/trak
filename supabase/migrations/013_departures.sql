-- Departures table
-- Individual departure dates with capacity tracking
-- Linked to packages for "vlastita" type

CREATE TABLE IF NOT EXISTS departures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Dates
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  
  -- Times (optional, for display)
  departure_time TIME,
  arrival_time TIME,
  
  -- Capacity
  total_spots INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  
  -- Pricing override (null = use package price)
  price_override DECIMAL(10,2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_departures_package ON departures(package_id);
CREATE INDEX idx_departures_organization ON departures(organization_id);
CREATE INDEX idx_departures_date ON departures(departure_date);
CREATE INDEX idx_departures_status ON departures(status);
CREATE INDEX idx_departures_available ON departures(available_spots) WHERE status = 'active';

-- Composite index for dashboard queries (today's departures)
CREATE INDEX idx_departures_today ON departures(organization_id, departure_date, status);

-- Index for capacity alerts (last seats)
CREATE INDEX idx_departures_low_capacity ON departures(organization_id, available_spots, departure_date) 
  WHERE status = 'active' AND available_spots <= 3;

-- RLS
ALTER TABLE departures ENABLE ROW LEVEL SECURITY;

-- Users can view own organization departures
CREATE POLICY "Users can view own organization departures" ON departures
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create departures for own organization
CREATE POLICY "Users can create departures for own organization" ON departures
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update own organization departures
CREATE POLICY "Users can update own organization departures" ON departures
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete own organization departures
CREATE POLICY "Users can delete own organization departures" ON departures
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER departures_updated_at
  BEFORE UPDATE ON departures
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();

-- Function to auto-generate weekly departures for a package
CREATE OR REPLACE FUNCTION generate_weekly_departures(
  p_package_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
  pkg RECORD;
  cur_date DATE;
  departure_count INTEGER := 0;
BEGIN
  -- Get package details
  SELECT * INTO pkg FROM packages WHERE id = p_package_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;
  
  IF pkg.departure_pattern != 'weekly' OR pkg.departure_day IS NULL THEN
    RAISE EXCEPTION 'Package is not configured for weekly departures';
  END IF;
  
  -- Start from first occurrence of departure_day on or after start_date
  cur_date := p_start_date;
  WHILE EXTRACT(DOW FROM cur_date) != pkg.departure_day LOOP
    cur_date := cur_date + 1;
  END LOOP;
  
  -- Generate departures
  WHILE cur_date <= p_end_date LOOP
    INSERT INTO departures (
      package_id,
      organization_id,
      departure_date,
      return_date,
      total_spots,
      available_spots,
      status
    ) VALUES (
      p_package_id,
      pkg.organization_id,
      cur_date,
      cur_date + pkg.default_duration,
      pkg.default_capacity,
      pkg.default_capacity,
      'active'
    );
    
    departure_count := departure_count + 1;
    cur_date := cur_date + 7;
  END LOOP;
  
  RETURN departure_count;
END;
$$ LANGUAGE plpgsql;
