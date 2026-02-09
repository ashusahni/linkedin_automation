-- Migration 018: Add LinkedIn Profile ID and Global Scraper Cache
-- Purpose: Enable database-first, profile ID-based contact scraping
-- Date: 2026-02-07

-- ============================================
-- PART 1: Add linkedin_profile_id to leads table
-- ============================================

-- Add column for LinkedIn profile ID (extracted from URL)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS linkedin_profile_id VARCHAR(100);

-- Create unique index (allows NULL values, enforces uniqueness when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_profile_id_unique 
ON leads(linkedin_profile_id) 
WHERE linkedin_profile_id IS NOT NULL;

-- Create regular index for fast lookups
CREATE INDEX IF NOT EXISTS idx_leads_profile_id 
ON leads(linkedin_profile_id);

-- Backfill profile IDs from existing linkedin_url values
-- Extracts profile ID from URLs like: https://www.linkedin.com/in/john-doe-12345678/
UPDATE leads 
SET linkedin_profile_id = LOWER(TRIM(
    REGEXP_REPLACE(linkedin_url, '.*linkedin\.com/in/([^/\?]+).*', '\1')
))
WHERE linkedin_url IS NOT NULL 
  AND linkedin_url ~ 'linkedin\.com/in/'
  AND linkedin_profile_id IS NULL;

COMMENT ON COLUMN leads.linkedin_profile_id IS 'LinkedIn profile ID extracted from URL (e.g., john-doe-12345678). Used for global deduplication.';

-- ============================================
-- PART 2: Create global scraper cache table
-- ============================================

CREATE TABLE IF NOT EXISTS scraped_contacts (
    -- Primary key: LinkedIn profile ID
    linkedin_profile_id VARCHAR(100) PRIMARY KEY,
    
    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    birthday VARCHAR(50),
    website VARCHAR(500),
    
    -- Scraping metadata
    first_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scrape_attempts INT DEFAULT 1,
    
    -- Status tracking
    -- 'success' = found at least one contact field
    -- 'na' = scraped but no contact info found
    -- 'failed' = scraping error occurred
    scrape_status VARCHAR(20) DEFAULT 'success' CHECK (scrape_status IN ('success', 'na', 'failed')),
    
    -- Error tracking
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraped_contacts_status 
ON scraped_contacts(scrape_status);

CREATE INDEX IF NOT EXISTS idx_scraped_contacts_last_scraped 
ON scraped_contacts(last_scraped_at);

CREATE INDEX IF NOT EXISTS idx_scraped_contacts_email 
ON scraped_contacts(email) 
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scraped_contacts_phone 
ON scraped_contacts(phone) 
WHERE phone IS NOT NULL;

-- Comments
COMMENT ON TABLE scraped_contacts IS 'Global cache of scraped LinkedIn contact information. Prevents duplicate scraping across campaigns.';
COMMENT ON COLUMN scraped_contacts.linkedin_profile_id IS 'LinkedIn profile ID (e.g., john-doe-12345678). Primary key for deduplication.';
COMMENT ON COLUMN scraped_contacts.scrape_status IS 'Status: success (found contacts), na (no contacts found), failed (scraping error)';
COMMENT ON COLUMN scraped_contacts.scrape_attempts IS 'Number of times this profile has been scraped. Used for retry logic.';

-- ============================================
-- PART 3: Sync function to update leads from cache
-- ============================================

-- Function to sync contact data from scraped_contacts to leads table
CREATE OR REPLACE FUNCTION sync_contacts_to_leads()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all leads with this profile ID
    UPDATE leads
    SET 
        email = COALESCE(NEW.email, email),
        phone = COALESCE(NEW.phone, phone),
        updated_at = CURRENT_TIMESTAMP
    WHERE linkedin_profile_id = NEW.linkedin_profile_id
      AND (email IS NULL OR phone IS NULL); -- Only update if fields are missing
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync when scraped_contacts is updated
DROP TRIGGER IF EXISTS trigger_sync_contacts_to_leads ON scraped_contacts;
CREATE TRIGGER trigger_sync_contacts_to_leads
    AFTER INSERT OR UPDATE ON scraped_contacts
    FOR EACH ROW
    EXECUTE FUNCTION sync_contacts_to_leads();

COMMENT ON FUNCTION sync_contacts_to_leads() IS 'Automatically syncs contact data from scraped_contacts cache to leads table';

-- ============================================
-- PART 4: Migrate existing contact data to cache
-- ============================================

-- Populate scraped_contacts with existing email/phone data from leads
INSERT INTO scraped_contacts (
    linkedin_profile_id,
    email,
    phone,
    scrape_status,
    scrape_attempts,
    first_scraped_at,
    last_scraped_at
)
SELECT DISTINCT ON (linkedin_profile_id)
    linkedin_profile_id,
    email,
    phone,
    CASE 
        WHEN email IS NOT NULL OR phone IS NOT NULL THEN 'success'
        ELSE 'na'
    END as scrape_status,
    1 as scrape_attempts,
    created_at as first_scraped_at,
    updated_at as last_scraped_at
FROM leads
WHERE linkedin_profile_id IS NOT NULL
  AND (email IS NOT NULL OR phone IS NOT NULL)
ON CONFLICT (linkedin_profile_id) DO NOTHING;

-- ============================================
-- Verification queries
-- ============================================

-- Check migration results
DO $$
DECLARE
    leads_with_profile_id INT;
    scraped_contacts_count INT;
    leads_with_email INT;
    leads_with_phone INT;
BEGIN
    SELECT COUNT(*) INTO leads_with_profile_id FROM leads WHERE linkedin_profile_id IS NOT NULL;
    SELECT COUNT(*) INTO scraped_contacts_count FROM scraped_contacts;
    SELECT COUNT(*) INTO leads_with_email FROM leads WHERE email IS NOT NULL;
    SELECT COUNT(*) INTO leads_with_phone FROM leads WHERE phone IS NOT NULL;
    
    RAISE NOTICE '✅ Migration 018 Complete:';
    RAISE NOTICE '   - Leads with profile ID: %', leads_with_profile_id;
    RAISE NOTICE '   - Scraped contacts cache: %', scraped_contacts_count;
    RAISE NOTICE '   - Leads with email: %', leads_with_email;
    RAISE NOTICE '   - Leads with phone: %', leads_with_phone;
END $$;
