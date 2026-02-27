-- Add manual_tier to leads and contacts_min_score to preference_settings

ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_tier VARCHAR(20);
ALTER TABLE preference_settings ADD COLUMN IF NOT EXISTS contacts_min_score INTEGER DEFAULT 70;
