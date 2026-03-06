-- Migration 031: Phantom columns support (Green/Yellow/Red)
-- Adds phantom_metadata JSONB for all Phantom-specific fields not already in leads table.
-- Green/Yellow fields already in leads: first_name, last_name, full_name, location, linkedin_url,
-- company, title, profile_image, connection_degree, industry (from prior migrations).
-- Yellow/Red fields stored here for display and backend use.

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS phantom_metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN leads.phantom_metadata IS 'Phantom export extras: timestamp, category, query, company_url, company_slug, company_id, company_2, company_url_2, job_title, job_date_range, job_title_2, job_date_range_2, school, school_degree, school_date_range, school_2, school_degree_2, school_date_range_2, search_account_full_name, search_account_profile_id, additional_info, vmid (red)';

CREATE INDEX IF NOT EXISTS idx_leads_phantom_metadata ON leads USING GIN (phantom_metadata);
