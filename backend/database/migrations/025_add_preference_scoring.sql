-- Migration 025: Dynamic Preference Scoring System
-- Adds score/tier columns to leads and a preference_settings table

-- 1. Add scoring columns to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS preference_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preference_tier  VARCHAR(20) DEFAULT 'tertiary';

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_preference_score ON leads(preference_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_preference_tier  ON leads(preference_tier);

-- 3. Preference settings table (keyed by a single-row identifier,
--    since this is a single-tenant app with no auth user table yet)
CREATE TABLE IF NOT EXISTS preference_settings (
  id                      SERIAL PRIMARY KEY,
  linkedin_profile_url    VARCHAR(500),
  preferred_companies     TEXT,            -- comma-separated
  preferred_industries    JSONB DEFAULT '[]',  -- array of strings
  preferred_titles        JSONB DEFAULT '[]',  -- array of strings
  preferred_locations     TEXT,
  niche_keywords          TEXT,
  -- Profile metadata extracted from LinkedIn (cached)
  profile_meta            JSONB DEFAULT '{}',
  -- Scoring thresholds
  primary_threshold       INTEGER DEFAULT 120,
  secondary_threshold     INTEGER DEFAULT 60,
  auto_approval_threshold INTEGER DEFAULT 150,
  -- State
  preference_active       BOOLEAN DEFAULT FALSE,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row so GET always returns something
INSERT INTO preference_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
