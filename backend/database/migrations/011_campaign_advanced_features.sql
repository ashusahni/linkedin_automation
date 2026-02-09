-- Campaign advanced features: goals, scheduling, limits, targeting, tags
-- Run after 010_add_unique_lead_enrichment.sql

-- Campaigns: add rich metadata and controls
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS goal VARCHAR(100) DEFAULT 'connections',  -- connections, meetings, pipeline, brand_awareness, event_promotion
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS schedule_start TIMESTAMP,
  ADD COLUMN IF NOT EXISTS schedule_end TIMESTAMP,
  ADD COLUMN IF NOT EXISTS daily_cap INTEGER DEFAULT 0,  -- 0 = no cap
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(32) DEFAULT 'normal',  -- low, normal, high, urgent
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',  -- flexible: auto_approve, require_reply_before_next, etc.
  ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Indexes for filtering and scheduling
CREATE INDEX IF NOT EXISTS idx_campaigns_goal ON campaigns(goal);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON campaigns(priority);
CREATE INDEX IF NOT EXISTS idx_campaigns_schedule_start ON campaigns(schedule_start) WHERE schedule_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_tags ON campaigns USING GIN(tags);

-- Sequences: send windows and retries
ALTER TABLE sequences
  ADD COLUMN IF NOT EXISTS send_window_start TIME DEFAULT '09:00',  -- e.g. only send between 9am-5pm
  ADD COLUMN IF NOT EXISTS send_window_end TIME DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_delay_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS subject_line VARCHAR(500),  -- for email steps
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Campaign leads: segment and scoring (optional use)
ALTER TABLE campaign_leads
  ADD COLUMN IF NOT EXISTS segment VARCHAR(64),
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Campaign templates table (optional: save campaign configs as reusable templates)
CREATE TABLE IF NOT EXISTS campaign_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal VARCHAR(100),
  type VARCHAR(50) DEFAULT 'standard',
  sequence_config JSONB NOT NULL DEFAULT '[]',  -- array of { type, delay_days, content_preview }
  settings JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_goal ON campaign_templates(goal);
