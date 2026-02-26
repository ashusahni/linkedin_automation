-- Migration: Add Hunter.io integration fields to leads table
-- Version: 026

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS email_score INTEGER,
ADD COLUMN IF NOT EXISTS email_verification_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS hunter_confidence INTEGER,
ADD COLUMN IF NOT EXISTS email_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS hunter_attempted BOOLEAN DEFAULT FALSE;

-- Add index for status and attempted flag for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_hunter ON leads(hunter_attempted, email);
