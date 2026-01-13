-- Offer views table
-- Track individual views for analytics

CREATE TABLE IF NOT EXISTS offer_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  
  -- Session tracking
  session_id VARCHAR(100), -- Anonymous session ID
  user_agent TEXT,
  ip_hash VARCHAR(64), -- Hashed IP for privacy
  
  -- Referrer info
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Qualification context (if from qualification flow)
  qualification_data JSONB,
  
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_offer_views_offer ON offer_views(offer_id);
CREATE INDEX idx_offer_views_viewed_at ON offer_views(viewed_at);
CREATE INDEX idx_offer_views_offer_24h ON offer_views(offer_id, viewed_at) 
  WHERE viewed_at > NOW() - INTERVAL '24 hours';

-- RLS
ALTER TABLE offer_views ENABLE ROW LEVEL SECURITY;

-- Agents can view analytics for their offers
CREATE POLICY "Users can view offer views from own organization" ON offer_views
  FOR SELECT USING (
    offer_id IN (
      SELECT id FROM offers WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Anyone can insert views (public tracking)
CREATE POLICY "Anyone can insert offer views" ON offer_views
  FOR INSERT WITH CHECK (true);

-- Function to update views_last_24h on offers
CREATE OR REPLACE FUNCTION update_offer_view_counts()
RETURNS void AS $$
BEGIN
  UPDATE offers SET 
    views_last_24h = (
      SELECT COUNT(*) FROM offer_views 
      WHERE offer_views.offer_id = offers.id 
      AND viewed_at > NOW() - INTERVAL '24 hours'
    ),
    views_total = views_total + 1
  WHERE id IN (
    SELECT DISTINCT offer_id FROM offer_views 
    WHERE viewed_at > NOW() - INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment views_total immediately
CREATE OR REPLACE FUNCTION increment_offer_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offers SET views_total = views_total + 1 WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offer_view_increment
  AFTER INSERT ON offer_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_offer_views();
