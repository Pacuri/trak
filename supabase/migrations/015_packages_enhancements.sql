-- Packages Module Enhancements
-- Adds additional fields, package_images table, helper views, and public RLS policies

-- ============================================
-- 1. EXTEND PACKAGES TABLE
-- ============================================

-- Add slug for URL-friendly identifiers
ALTER TABLE packages ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Add is_featured flag for recommended packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add is_active flag (soft delete support)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add created_by for tracking who created the package
ALTER TABLE packages ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create unique index for org + slug combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_org_slug ON packages(organization_id, slug) WHERE slug IS NOT NULL;

-- Index for featured packages
CREATE INDEX IF NOT EXISTS idx_packages_featured ON packages(organization_id, is_featured) WHERE is_featured = true;

-- Index for active packages
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(organization_id, is_active, status);

-- ============================================
-- 2. EXTEND DEPARTURES TABLE
-- ============================================

-- Add child_price for optional child pricing
ALTER TABLE departures ADD COLUMN IF NOT EXISTS child_price DECIMAL(10,2);

-- Add original_price for showing discounts
ALTER TABLE departures ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

-- Add is_visible flag (for hiding departures without deleting)
ALTER TABLE departures ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- ============================================
-- 3. CREATE PACKAGE_IMAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS package_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_package_images_package ON package_images(package_id);
CREATE INDEX IF NOT EXISTS idx_package_images_primary ON package_images(package_id, is_primary);

-- RLS
ALTER TABLE package_images ENABLE ROW LEVEL SECURITY;

-- Users can view package images from own organization
CREATE POLICY "Users can view package images from own organization" ON package_images
  FOR SELECT USING (
    package_id IN (
      SELECT id FROM packages WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Users can manage package images from own organization
CREATE POLICY "Users can manage package images from own organization" ON package_images
  FOR ALL USING (
    package_id IN (
      SELECT id FROM packages WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Public can view images of active packages
CREATE POLICY "Public can view active package images" ON package_images
  FOR SELECT USING (
    package_id IN (SELECT id FROM packages WHERE status = 'active' AND is_active = true)
  );

-- ============================================
-- 4. ADD PUBLIC READ POLICIES FOR PACKAGES
-- ============================================

-- Public can view active packages
CREATE POLICY "Public can view active packages" ON packages
  FOR SELECT USING (status = 'active' AND is_active = true);

-- Public can view active departures
CREATE POLICY "Public can view active departures" ON departures
  FOR SELECT USING (
    status = 'active' 
    AND is_visible = true
    AND package_id IN (SELECT id FROM packages WHERE status = 'active' AND is_active = true)
  );

-- ============================================
-- 5. CREATE HELPER VIEWS
-- ============================================

-- View: Packages with next departure info
CREATE OR REPLACE VIEW packages_with_next_departure AS
SELECT 
  p.*,
  nd.id AS next_departure_id,
  nd.departure_date AS next_departure_date,
  nd.return_date AS next_return_date,
  nd.price_override AS next_price,
  nd.available_spots AS next_available_spots,
  nd.total_spots AS next_total_spots,
  stats.active_departures_count,
  stats.min_price,
  stats.total_capacity,
  stats.available_capacity
FROM packages p
LEFT JOIN LATERAL (
  SELECT * FROM departures 
  WHERE package_id = p.id 
    AND status = 'active' 
    AND is_visible = true
    AND departure_date >= CURRENT_DATE
  ORDER BY departure_date ASC
  LIMIT 1
) nd ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*)::int AS active_departures_count,
    MIN(COALESCE(price_override, p.price_from))::decimal AS min_price,
    SUM(total_spots)::int AS total_capacity,
    SUM(available_spots)::int AS available_capacity
  FROM departures 
  WHERE package_id = p.id 
    AND status = 'active'
    AND is_visible = true
    AND departure_date >= CURRENT_DATE
) stats ON true;

-- View: Departures with package info
CREATE OR REPLACE VIEW departures_with_package AS
SELECT 
  d.*,
  p.name AS package_name,
  p.destination_country,
  p.destination_city,
  p.hotel_name,
  p.hotel_stars,
  p.package_type,
  p.board_type,
  p.transport_type,
  p.departure_location,
  p.is_featured,
  p.price_from AS package_base_price,
  COALESCE(d.price_override, p.price_from) AS effective_price,
  d.return_date - d.departure_date AS duration_nights,
  CASE 
    WHEN d.available_spots IS NOT NULL AND d.available_spots <= 2 THEN 'last_seats'
    WHEN d.available_spots IS NOT NULL AND d.total_spots > 0 
      AND (d.available_spots::float / d.total_spots) <= 0.3 THEN 'filling_up'
    WHEN d.original_price IS NOT NULL AND d.original_price > COALESCE(d.price_override, p.price_from) THEN 'discounted'
    WHEN d.created_at > NOW() - INTERVAL '7 days' THEN 'new'
    ELSE NULL
  END AS urgency_label,
  -- Primary image from package
  (SELECT url FROM package_images WHERE package_id = p.id AND is_primary = true LIMIT 1) AS primary_image_url
FROM departures d
JOIN packages p ON d.package_id = p.id;

-- ============================================
-- 6. UPDATE GENERATE WEEKLY DEPARTURES FUNCTION
-- ============================================

-- Drop and recreate to include new columns
CREATE OR REPLACE FUNCTION generate_weekly_departures(
  p_package_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_price DECIMAL DEFAULT NULL,
  p_capacity INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  pkg RECORD;
  cur_date DATE;
  departure_count INTEGER := 0;
  v_price DECIMAL;
  v_capacity INTEGER;
BEGIN
  -- Get package details
  SELECT * INTO pkg FROM packages WHERE id = p_package_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;
  
  IF pkg.departure_pattern != 'weekly' OR pkg.departure_day IS NULL THEN
    RAISE EXCEPTION 'Package is not configured for weekly departures';
  END IF;
  
  -- Use provided values or package defaults
  v_price := COALESCE(p_price, pkg.price_from);
  v_capacity := COALESCE(p_capacity, pkg.default_capacity);
  
  -- Start from first occurrence of departure_day on or after start_date
  cur_date := p_start_date;
  WHILE EXTRACT(DOW FROM cur_date) != pkg.departure_day LOOP
    cur_date := cur_date + 1;
  END LOOP;
  
  -- Generate departures
  WHILE cur_date <= p_end_date LOOP
    -- Skip if departure already exists for this date
    IF NOT EXISTS (
      SELECT 1 FROM departures 
      WHERE package_id = p_package_id 
        AND departure_date = cur_date
    ) THEN
      INSERT INTO departures (
        package_id,
        organization_id,
        departure_date,
        return_date,
        total_spots,
        available_spots,
        price_override,
        status,
        is_visible
      ) VALUES (
        p_package_id,
        pkg.organization_id,
        cur_date,
        cur_date + pkg.default_duration,
        v_capacity,
        v_capacity,
        CASE WHEN v_price != pkg.price_from THEN v_price ELSE NULL END,
        'active',
        true
      );
      
      departure_count := departure_count + 1;
    END IF;
    
    cur_date := cur_date + 7;
  END LOOP;
  
  RETURN departure_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. HELPER FUNCTION FOR SLUG GENERATION
-- ============================================

CREATE OR REPLACE FUNCTION generate_package_slug(p_name TEXT, p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from name
  base_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure uniqueness within organization
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM packages WHERE organization_id = p_org_id AND slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TRIGGER FOR AUTO-SLUG GENERATION
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_package_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_package_slug(NEW.name, NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_package_slug ON packages;
CREATE TRIGGER trigger_package_slug
  BEFORE INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_package_slug();

-- ============================================
-- 9. TRIGGER FOR AUTO-UPDATE DEPARTURE STATUS
-- ============================================

CREATE OR REPLACE FUNCTION auto_update_departure_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark as sold_out when no spots left
  IF NEW.available_spots = 0 AND NEW.status = 'active' THEN
    NEW.status := 'sold_out';
  END IF;
  
  -- Auto-mark completed departures
  IF NEW.departure_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_departure_status ON departures;
CREATE TRIGGER trigger_departure_status
  BEFORE UPDATE ON departures
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_departure_status();
