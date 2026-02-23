-- Add container_id to track PhantomBuster runs
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS last_container_id VARCHAR(255);

-- Create logs for webhooks and automation events
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100), -- 'webhook_received', 'phantom_launched', 'error'
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
