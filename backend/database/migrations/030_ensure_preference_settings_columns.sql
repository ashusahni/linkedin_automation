-- Migration 030: Ensure preference_settings has columns required for Save Preferences (profile URL + tiers).
-- Fixes: column "secondary_priority_threshold" of relation "preference_settings" does not exist
-- Safe to run: ADD COLUMN IF NOT EXISTS.

-- Tiered preferences (profile-based primary/secondary/tertiary)
ALTER TABLE preference_settings
  ADD COLUMN IF NOT EXISTS preference_tiers JSONB DEFAULT '{"primary":{"titles":[],"industries":[],"company_sizes":[]},"secondary":{"titles":[],"industries":[],"company_sizes":[]},"tertiary":{"titles":[],"industries":[],"company_sizes":[]}}';

-- Legacy threshold columns (no longer used for logic; kept for schema compatibility)
ALTER TABLE preference_settings
  ADD COLUMN IF NOT EXISTS secondary_priority_threshold INTEGER DEFAULT 70;

ALTER TABLE preference_settings
  ADD COLUMN IF NOT EXISTS contacts_min_score INTEGER DEFAULT 70;

-- leads.manual_tier: cleared on rescore so dashboard hierarchy uses preference_tier only
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS manual_tier VARCHAR(20);
