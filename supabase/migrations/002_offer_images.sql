-- Offer images table
-- Multiple images per offer

CREATE TABLE IF NOT EXISTS offer_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  position INTEGER DEFAULT 0, -- For ordering
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_offer_images_offer ON offer_images(offer_id);
CREATE INDEX idx_offer_images_primary ON offer_images(offer_id, is_primary);

-- RLS
ALTER TABLE offer_images ENABLE ROW LEVEL SECURITY;

-- Same policies as offers (through join)
CREATE POLICY "Users can view offer images from own organization" ON offer_images
  FOR SELECT USING (
    offer_id IN (
      SELECT id FROM offers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage offer images from own organization" ON offer_images
  FOR ALL USING (
    offer_id IN (
      SELECT id FROM offers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Public can view images of active offers
CREATE POLICY "Public can view active offer images" ON offer_images
  FOR SELECT USING (
    offer_id IN (SELECT id FROM offers WHERE status = 'active')
  );
