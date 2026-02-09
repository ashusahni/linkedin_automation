-- Migration: Create LinkedIn Industries Table
-- This migration creates a table to store LinkedIn industry codes and metadata
-- Replaces the CSV file lookup with database queries

CREATE TABLE IF NOT EXISTS linkedin_industries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  hierarchy TEXT NOT NULL,
  description TEXT,
  top_level_industry VARCHAR(255),
  sub_category VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_industries_code ON linkedin_industries(code);
CREATE INDEX IF NOT EXISTS idx_linkedin_industries_top_level ON linkedin_industries(top_level_industry);
CREATE INDEX IF NOT EXISTS idx_linkedin_industries_sub_category ON linkedin_industries(sub_category);
CREATE INDEX IF NOT EXISTS idx_linkedin_industries_name ON linkedin_industries(name);

-- Add comment
COMMENT ON TABLE linkedin_industries IS 'Stores LinkedIn industry codes and hierarchy metadata';
