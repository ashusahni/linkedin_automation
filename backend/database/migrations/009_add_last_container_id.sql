-- Add last_container_id column to campaign_leads table if it doesn't exist
-- This column tracks PhantomBuster container IDs for sent messages/connection requests

ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS last_container_id VARCHAR(255);

-- Also ensure automation_logs table exists (from webhook support)
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    lead_id INTEGER,
    action VARCHAR(100), -- 'send_message', 'send_connection_request', 'approval_reviewed', etc.
    status VARCHAR(50), -- 'sent', 'failed', 'approved', etc.
    event_type VARCHAR(100), -- 'webhook_received', 'phantom_launched', 'error'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign_lead ON automation_logs(campaign_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action ON automation_logs(action);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);
