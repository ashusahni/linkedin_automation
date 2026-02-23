-- Add automation tracking columns to campaign_leads
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS next_action_due TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS linkedin_connect_status VARCHAR(50) DEFAULT 'pending', -- pending, accepted
ADD COLUMN IF NOT EXISTS phantom_container_id VARCHAR(100);

-- Index for finding due actions quickly
CREATE INDEX IF NOT EXISTS idx_campaign_leads_next_action ON campaign_leads(next_action_due);
