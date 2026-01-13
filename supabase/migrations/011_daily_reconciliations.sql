-- Daily reconciliations table
-- Track agent activity and confirm completeness

CREATE TABLE IF NOT EXISTS daily_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  reconciliation_date DATE NOT NULL,
  
  -- Stats for the day
  leads_created INTEGER DEFAULT 0,
  bookings_closed INTEGER DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0,
  
  -- Confirmation
  confirmed_complete BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique per user per day
  UNIQUE(organization_id, user_id, reconciliation_date)
);

-- Indexes
CREATE INDEX idx_daily_reconciliations_organization ON daily_reconciliations(organization_id);
CREATE INDEX idx_daily_reconciliations_user ON daily_reconciliations(user_id);
CREATE INDEX idx_daily_reconciliations_date ON daily_reconciliations(reconciliation_date);

-- RLS
ALTER TABLE daily_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reconciliations" ON daily_reconciliations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own reconciliations" ON daily_reconciliations
  FOR ALL USING (user_id = auth.uid());

-- Managers can view all in organization
CREATE POLICY "Managers can view organization reconciliations" ON daily_reconciliations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = all users in org
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  
  -- Reference to related entity
  reference_type VARCHAR(50), -- lead, reservation, booking, inquiry
  reference_id UUID,
  
  -- Read status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_organization ON notifications(organization_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
