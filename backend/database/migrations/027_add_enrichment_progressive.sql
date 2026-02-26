-- Migration: Progressive enrichment fields
-- Version: 027

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITHOUT TIME ZONE;

-- Add index for progressive enrichment
CREATE INDEX IF NOT EXISTS idx_leads_enrichment_prog ON leads(email, enrichment_status, preference_score);
