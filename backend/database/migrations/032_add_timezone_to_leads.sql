-- Add timezone to leads for filtering (IANA timezone identifier, e.g. America/New_York)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_leads_timezone ON leads(timezone) WHERE timezone IS NOT NULL;
