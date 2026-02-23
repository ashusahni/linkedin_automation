-- Add industry column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS industry VARCHAR(255);

-- Index for filtering by industry
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
