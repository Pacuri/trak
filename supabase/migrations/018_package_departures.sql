-- package_departures: extended departures with full configurator fields
-- Used by DepartureModal; coexists with legacy departures during transition.

CREATE TABLE IF NOT EXISTS package_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Datum i trajanje
  departure_date date NOT NULL,
  return_date date NOT NULL,
  duration_nights integer NOT NULL,

  -- Status (planiran=scheduled, potvrđen=confirmed, otkazan=cancelled, completed)
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),

  -- Kapacitet
  available_slots integer NOT NULL,
  booked_slots integer NOT NULL DEFAULT 0,
  min_travelers integer,
  booking_deadline date,

  -- Polazak
  departure_time time,
  departure_point text,
  return_time time,
  transport_notes text,

  -- Cijena (optional)
  price_adjustment_percent numeric,
  price_adjustment_type text CHECK (price_adjustment_type IN ('increase', 'decrease')),

  -- Interno (optional)
  internal_notes text,
  supplier_confirmation text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_departures_package ON package_departures(package_id);
CREATE INDEX IF NOT EXISTS idx_package_departures_org ON package_departures(organization_id);
CREATE INDEX IF NOT EXISTS idx_package_departures_date ON package_departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_package_departures_status ON package_departures(status);

-- RLS
ALTER TABLE package_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_departures_org_select" ON package_departures
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "package_departures_org_insert" ON package_departures
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "package_departures_org_update" ON package_departures
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "package_departures_org_delete" ON package_departures
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER package_departures_updated_at
  BEFORE UPDATE ON package_departures
  FOR EACH ROW
  EXECUTE FUNCTION update_offers_updated_at();
