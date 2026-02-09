-- Add updated_at column to approval_queue table
-- This column tracks when approval queue items are modified

ALTER TABLE approval_queue 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create a trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_approval_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_update_approval_queue_updated_at ON approval_queue;
CREATE TRIGGER trigger_update_approval_queue_updated_at
    BEFORE UPDATE ON approval_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_queue_updated_at();

-- Update existing rows to have updated_at = created_at
UPDATE approval_queue 
SET updated_at = created_at 
WHERE updated_at IS NULL;
