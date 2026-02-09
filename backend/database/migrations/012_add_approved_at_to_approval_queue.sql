-- Add approved_at column to approval_queue table
-- This tracks when a message was approved

ALTER TABLE approval_queue 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add index for faster queries on approved messages
CREATE INDEX IF NOT EXISTS idx_approval_queue_approved_at 
ON approval_queue(approved_at) 
WHERE approved_at IS NOT NULL;

-- Update existing approved records to have approved_at = created_at
UPDATE approval_queue 
SET approved_at = created_at 
WHERE status = 'approved' AND approved_at IS NULL;
