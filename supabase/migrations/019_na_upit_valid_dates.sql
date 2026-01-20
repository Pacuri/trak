-- Na upit: valid_from, valid_to derived from price_intervals for date picker
ALTER TABLE packages ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS valid_to DATE;

-- Backfill from existing price_intervals
UPDATE packages p SET
  valid_from = (SELECT MIN(pi.start_date) FROM price_intervals pi WHERE pi.package_id = p.id),
  valid_to   = (SELECT MAX(pi.end_date)   FROM price_intervals pi WHERE pi.package_id = p.id)
WHERE EXISTS (SELECT 1 FROM price_intervals pi WHERE pi.package_id = p.id);

-- Public read for price_intervals, room_types, hotel_prices of active packages
DROP POLICY IF EXISTS "Public can view price_intervals of active packages" ON price_intervals;
CREATE POLICY "Public can view price_intervals of active packages" ON price_intervals
  FOR SELECT USING (package_id IN (SELECT id FROM packages WHERE status = 'active' AND is_active = true));

DROP POLICY IF EXISTS "Public can view room_types of active packages" ON room_types;
CREATE POLICY "Public can view room_types of active packages" ON room_types
  FOR SELECT USING (package_id IN (SELECT id FROM packages WHERE status = 'active' AND is_active = true));

DROP POLICY IF EXISTS "Public can view hotel_prices of active packages" ON hotel_prices;
CREATE POLICY "Public can view hotel_prices of active packages" ON hotel_prices
  FOR SELECT USING (package_id IN (SELECT id FROM packages WHERE status = 'active' AND is_active = true));
