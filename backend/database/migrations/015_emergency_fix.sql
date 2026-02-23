-- Emergency fix for schema gaps caused by skipped migrations
-- This migration ensures all required tables and columns exist

-- 1. Create automation_logs table (using the complete schema from 009)
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

-- Fix indexes for automation_logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign_lead ON automation_logs(campaign_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_action ON automation_logs(action);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON automation_logs(created_at DESC);

-- 2. Fix missing updated_at in approval_queue (from 008)
ALTER TABLE approval_queue 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Fix missing import_logs (from skipped 005)
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    container_id VARCHAR(255),
    total_leads INTEGER DEFAULT 0,
    saved INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    csv_file VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for import_logs
CREATE INDEX IF NOT EXISTS idx_import_logs_timestamp ON import_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_source ON import_logs(source);

-- 4. Fix missing email in leads (from possibly skipped 005)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE leads ADD COLUMN email VARCHAR(255);
    END IF;
END $$;
 
-- 5. Ensure last_container_id exists (from 009)
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS last_container_id VARCHAR(255);
 
-- 6. Re-apply trigger for approval_queue (from 008)
CREATE OR REPLACE FUNCTION update_approval_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_approval_queue_updated_at ON approval_queue;
CREATE TRIGGER trigger_update_approval_queue_updated_at
    BEFORE UPDATE ON approval_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_queue_updated_at();
    
UPDATE approval_queue 
SET updated_at = created_at 
WHERE updated_at IS NULL;
