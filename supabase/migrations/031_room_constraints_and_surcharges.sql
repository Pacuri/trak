-- Migration: 031_room_constraints_and_surcharges.sql
-- Add room constraints, warnings, and surcharge fields

-- ============================================
-- ROOM TYPES ENHANCEMENTS
-- ============================================
-- Add constraints and warnings directly to room_types for easier querying

-- Minimum adults required for this room
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS min_adults INT DEFAULT 1;

-- Minimum total occupancy (e.g., apartments require min 3 people)
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS min_occupancy INT DEFAULT 1;

-- Room-specific warnings (e.g., "Not suitable for elderly", "No elevator")
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS warnings TEXT[];

-- Single occupancy surcharge percentage (e.g., 70 means 70% extra when 1 person in double room)
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS single_surcharge_percent DECIMAL(5,2);

-- Distance from beach in meters
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS distance_from_beach INT;

-- Room size in square meters
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS size_sqm INT;

-- Accessibility info
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT true;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS floor_info TEXT;

COMMENT ON COLUMN room_types.min_adults IS 'Minimum adults required (e.g., 2 for apartments)';
COMMENT ON COLUMN room_types.min_occupancy IS 'Minimum total people required (e.g., 3 for some apartments)';
COMMENT ON COLUMN room_types.warnings IS 'Room-specific warnings like "Not suitable for elderly"';
COMMENT ON COLUMN room_types.single_surcharge_percent IS 'Surcharge % when only 1 person books (e.g., 70%)';

-- ============================================
-- PACKAGE-LEVEL SINGLE SURCHARGE
-- ============================================
-- Some packages have a global single occupancy surcharge
ALTER TABLE packages ADD COLUMN IF NOT EXISTS single_surcharge_percent DECIMAL(5,2);

COMMENT ON COLUMN packages.single_surcharge_percent IS 'Default single occupancy surcharge % for the package';

-- ============================================
-- LOCAL TAX DISCLAIMER
-- ============================================
-- Store the local tax disclaimer text
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tax_disclaimer TEXT;

COMMENT ON COLUMN packages.tax_disclaimer IS 'Text about local taxes to display (e.g., "Tourist tax paid at agency")';
