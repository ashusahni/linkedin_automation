-- ============================================================================
-- RESET WORKFLOW: Move all leads to "To Be Reviewed" status
-- ============================================================================
-- Run this SQL script directly in your PostgreSQL database

-- Step 1: Change default value for future leads
ALTER TABLE leads 
ALTER COLUMN review_status SET DEFAULT 'to_be_reviewed';

-- Step 2: Move all existing approved leads to review queue
UPDATE leads 
SET review_status = 'to_be_reviewed',
    approved_at = NULL,
    approved_by = NULL
WHERE review_status = 'approved' OR review_status IS NULL;

-- Step 3: Verify the results
SELECT 
    review_status,
    COUNT(*) as lead_count
FROM leads
GROUP BY review_status
ORDER BY review_status;

-- Expected output:
-- review_status    | lead_count
-- -----------------+-----------
-- to_be_reviewed   | 935 (or your total count)
