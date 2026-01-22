-- Enable realtime for custom_inquiries table
-- This allows the dashboard to receive live updates when new inquiries come in
-- Note: leads table is already in supabase_realtime publication

ALTER PUBLICATION supabase_realtime ADD TABLE custom_inquiries;
