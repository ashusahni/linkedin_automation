-- Migration 019: Create Scraping Jobs Tracking Table
-- Purpose: Track global scraping progress for workspace-level visibility
-- Date: 2026-02-07

-- ============================================
-- Create scraping_jobs table
-- ============================================

CREATE TABLE IF NOT EXISTS scraping_jobs (
    id SERIAL PRIMARY KEY,
    
    -- Job identification
    job_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'scrape_1707328800000'
    job_type VARCHAR(50) NOT NULL, -- 'approval_trigger', 'campaign_manual', 'bulk_rescrape'
    
    -- Scope
    campaign_id INT REFERENCES campaigns(id) ON DELETE SET NULL,
    triggered_by_user_id INT, -- References users table if it exists
    
    -- Progress tracking
    total_profiles INT NOT NULL DEFAULT 0,
    processed_profiles INT NOT NULL DEFAULT 0,
    found_contacts INT NOT NULL DEFAULT 0,
    skipped_profiles INT NOT NULL DEFAULT 0, -- Already in cache
    failed_profiles INT NOT NULL DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'running' 
        CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Error tracking
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status 
ON scraping_jobs(status);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_job_id 
ON scraping_jobs(job_id);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_started_at 
ON scraping_jobs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_campaign 
ON scraping_jobs(campaign_id) 
WHERE campaign_id IS NOT NULL;

-- Comments
COMMENT ON TABLE scraping_jobs IS 'Tracks all contact scraping jobs for global progress monitoring';
COMMENT ON COLUMN scraping_jobs.job_id IS 'Unique identifier for the scraping job (e.g., scrape_1707328800000)';
COMMENT ON COLUMN scraping_jobs.job_type IS 'Type: approval_trigger (auto after approval), campaign_manual (user-initiated), bulk_rescrape (admin)';
COMMENT ON COLUMN scraping_jobs.skipped_profiles IS 'Profiles skipped because they already exist in scraped_contacts cache';

-- ============================================
-- Helper function: Get active scraping progress
-- ============================================

CREATE OR REPLACE FUNCTION get_active_scraping_progress()
RETURNS TABLE (
    total_profiles BIGINT,
    processed_profiles BIGINT,
    progress_percentage INT,
    active_jobs_count INT,
    oldest_job_started_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(sj.total_profiles), 0)::BIGINT as total_profiles,
        COALESCE(SUM(sj.processed_profiles), 0)::BIGINT as processed_profiles,
        CASE 
            WHEN SUM(sj.total_profiles) > 0 
            THEN (SUM(sj.processed_profiles)::FLOAT / SUM(sj.total_profiles)::FLOAT * 100)::INT
            ELSE 0
        END as progress_percentage,
        COUNT(*)::INT as active_jobs_count,
        MIN(sj.started_at) as oldest_job_started_at
    FROM scraping_jobs sj
    WHERE sj.status IN ('queued', 'running');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_scraping_progress() IS 'Returns aggregated progress of all active scraping jobs';

-- ============================================
-- Helper function: Get scraping stats
-- ============================================

CREATE OR REPLACE FUNCTION get_scraping_stats()
RETURNS TABLE (
    total_profiles_scraped BIGINT,
    profiles_with_email BIGINT,
    profiles_with_phone BIGINT,
    profiles_with_both BIGINT,
    profiles_na BIGINT,
    profiles_failed BIGINT,
    success_rate NUMERIC(5,2),
    last_scrape_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_profiles_scraped,
        COUNT(email)::BIGINT as profiles_with_email,
        COUNT(phone)::BIGINT as profiles_with_phone,
        COUNT(CASE WHEN email IS NOT NULL AND phone IS NOT NULL THEN 1 END)::BIGINT as profiles_with_both,
        COUNT(CASE WHEN scrape_status = 'na' THEN 1 END)::BIGINT as profiles_na,
        COUNT(CASE WHEN scrape_status = 'failed' THEN 1 END)::BIGINT as profiles_failed,
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(CASE WHEN scrape_status = 'success' THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100)::NUMERIC(5,2)
            ELSE 0
        END as success_rate,
        MAX(last_scraped_at) as last_scrape_at
    FROM scraped_contacts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_scraping_stats() IS 'Returns overall statistics from scraped_contacts cache';

-- ============================================
-- Auto-update trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_scraping_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scraping_jobs_updated_at ON scraping_jobs;
CREATE TRIGGER trigger_update_scraping_jobs_updated_at
    BEFORE UPDATE ON scraping_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_scraping_jobs_updated_at();

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 019 Complete:';
    RAISE NOTICE '   - scraping_jobs table created';
    RAISE NOTICE '   - Helper functions created: get_active_scraping_progress(), get_scraping_stats()';
    RAISE NOTICE '   - Triggers configured';
END $$;
