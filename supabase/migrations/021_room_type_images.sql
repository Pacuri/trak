-- Migration: 021_room_type_images.sql
-- Add images support for room types (apartments inside hotels/villas)

-- ============================================
-- ROOM TYPE IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_type_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_type_images_room ON room_type_images(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_type_images_primary ON room_type_images(room_type_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_room_type_images_org ON room_type_images(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE room_type_images ENABLE ROW LEVEL SECURITY;

-- Users can view room type images from own organization
CREATE POLICY "Users can view room type images from own organization" ON room_type_images
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can manage room type images from own organization
CREATE POLICY "Users can manage room type images from own organization" ON room_type_images
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Public can view images of active packages' room types
CREATE POLICY "Public can view active room type images" ON room_type_images
  FOR SELECT USING (
    room_type_id IN (
      SELECT rt.id FROM room_types rt
      JOIN packages p ON rt.package_id = p.id
      WHERE p.status = 'active' AND p.is_active = true
    )
  );

-- ============================================
-- ALSO ADD IMAGES TO APARTMENTS TABLE (for FIKSNI packages)
-- ============================================
CREATE TABLE IF NOT EXISTS apartment_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apartment_images_apartment ON apartment_images(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_images_primary ON apartment_images(apartment_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_apartment_images_org ON apartment_images(organization_id);

-- RLS for apartment images
ALTER TABLE apartment_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view apartment images from own organization" ON apartment_images
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage apartment images from own organization" ON apartment_images
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view active apartment images" ON apartment_images
  FOR SELECT USING (
    apartment_id IN (
      SELECT a.id FROM apartments a
      JOIN packages p ON a.package_id = p.id
      WHERE p.status = 'active' AND p.is_active = true
    )
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE room_type_images IS 'Images for room types in NA_UPIT (hotel) packages';
COMMENT ON TABLE apartment_images IS 'Images for apartments in FIKSNI packages (villas, individual units)';
