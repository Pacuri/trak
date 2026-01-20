-- Migration: 022_package_hotel_description.sql
-- Add hotel description, amenities, and location fields to packages table

-- ============================================
-- ADD NEW COLUMNS TO PACKAGES TABLE
-- ============================================

-- Hotel amenities (pool, spa, beach access, parking, WiFi, etc.)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS hotel_amenities TEXT[];

-- Distance from beach/sea in meters
ALTER TABLE packages ADD COLUMN IF NOT EXISTS distance_from_beach INTEGER;

-- Distance from city center in meters
ALTER TABLE packages ADD COLUMN IF NOT EXISTS distance_from_center INTEGER;

-- ============================================
-- INDEXES
-- ============================================

-- Index for distance-based filtering
CREATE INDEX IF NOT EXISTS idx_packages_distance_beach ON packages(distance_from_beach) WHERE distance_from_beach IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN packages.hotel_amenities IS 'List of hotel amenities (pool, spa, beach, etc.) - can be extracted from PDF or entered manually';
COMMENT ON COLUMN packages.distance_from_beach IS 'Distance from beach/sea in meters - helps customers filter and compare packages';
COMMENT ON COLUMN packages.distance_from_center IS 'Distance from city center in meters';
