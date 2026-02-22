-- Migration 024: Add phantom_status to content_items
-- Tracks whether a scheduled post has been pushed to Google Sheets for Phantom to pick up.
-- Values: 'pending' | 'queued' | 'posted' | 'failed'
-- Default: 'pending' (not yet sent to sheet)

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS phantom_status VARCHAR(50) DEFAULT 'pending';

-- Index for fast lookups in the sync cron
CREATE INDEX IF NOT EXISTS idx_content_items_phantom_status
    ON content_items(phantom_status);

-- Comment for clarity
COMMENT ON COLUMN content_items.phantom_status IS
    'Google Sheets / Phantom queue state: pending → queued → posted | failed';
