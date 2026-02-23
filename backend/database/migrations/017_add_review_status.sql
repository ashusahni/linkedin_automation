-- ============================================================================
-- PHASE 4: Lead Approval & CRM - Review Status System
-- ============================================================================
-- Adds lead review workflow with approval/rejection tracking
-- Maintains backward compatibility with existing outreach status field

-- Add review_status field for lead approval workflow
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'approved';

-- Add rejection tracking fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS rejected_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_by INTEGER;

-- Add approval tracking fields
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by INTEGER;

-- Create index for performance (review_status will be heavily queried)
CREATE INDEX IF NOT EXISTS idx_leads_review_status ON leads(review_status);

-- Set default timestamps for existing approved leads
-- All existing leads are assumed approved (backward compatibility)
UPDATE leads 
SET approved_at = created_at 
WHERE review_status = 'approved' AND approved_at IS NULL;

-- Add column comments for clarity
COMMENT ON COLUMN leads.review_status IS 'Lead review state: to_be_reviewed, approved, rejected';
COMMENT ON COLUMN leads.status IS 'Outreach state: new, contacted, replied';
COMMENT ON COLUMN leads.rejected_reason IS 'Reason for rejection: not_icp, low_quality, duplicate, wrong_geography, other';

-- ============================================================================
-- Audit Table for Status Changes
-- ============================================================================
-- Tracks every review status change for debugging and CRM trust

CREATE TABLE IF NOT EXISTS lead_review_audit (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INTEGER,
    reason VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying audit history by lead
CREATE INDEX IF NOT EXISTS idx_lead_review_audit_lead_id ON lead_review_audit(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_review_audit_changed_at ON lead_review_audit(changed_at);

COMMENT ON TABLE lead_review_audit IS 'Audit log for lead review status changes';
