-- ============================================================================
-- Lead Count Mismatch - Database Verification Queries
-- Run these queries to identify the exact root cause
-- ============================================================================

-- QUERY 1: Check for NULL review_status (MOST LIKELY CULPRIT)
-- Expected: If count > 0, this is likely the mismatch
-- ============================================================================
SELECT COUNT(*) as leads_with_null_review_status
FROM leads
WHERE review_status IS NULL;

-- If result > 0, these leads are:
-- - Counted as 'approved' in /api/leads/review-stats
-- - Excluded from /api/leads?review_status=approved
-- This causes the mismatch!


-- QUERY 2: Full breakdown by review_status (including NULL)
-- ============================================================================
SELECT 
  COALESCE(review_status, 'NULL') as review_status,
  COUNT(*) as count
FROM leads
GROUP BY review_status
ORDER BY count DESC;

-- Expected output:
-- review_status | count
-- --------------|------
-- approved      | 313   ← Actual approved leads
-- NULL          | 1     ← The ghost lead!
-- to_be_reviewed| 150
-- rejected      | 45


-- QUERY 3: Compare count methods (with vs without NULL handling)
-- ============================================================================
SELECT 
  'Backend getReviewStats (treats NULL as approved)' as method,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved' OR review_status IS NULL

UNION ALL

SELECT 
  'Backend getLeads (excludes NULL)' as method,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved';

-- Expected output:
-- method                                          | count
-- ------------------------------------------------|------
-- Backend getReviewStats (treats NULL as approved)| 314   ← Stats count
-- Backend getLeads (excludes NULL)                | 313   ← List count
-- MISMATCH: 314 vs 313


-- QUERY 4: Find the ghost lead(s) with NULL review_status
-- ============================================================================
SELECT 
  id,
  full_name,
  company,
  title,
  review_status,
  status,
  source,
  created_at,
  updated_at
FROM leads
WHERE review_status IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- This will show you the exact lead(s) causing the mismatch
-- Check when they were created and why review_status is NULL


-- QUERY 5: Verify pagination (check if all pages sum correctly)
-- ============================================================================
-- Page 1
SELECT COUNT(*) as page_1_count
FROM leads
WHERE review_status = 'approved'
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Page 2
SELECT COUNT(*) as page_2_count
FROM leads
WHERE review_status = 'approved'
ORDER BY created_at DESC
LIMIT 50 OFFSET 50;

-- Continue for all pages...
-- Sum should equal total count (313)


-- QUERY 6: Check for soft-deleted leads (if you have deleted_at column)
-- ============================================================================
SELECT 
  'Not deleted' as status,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved'
  AND (deleted_at IS NULL OR deleted_at = '')

UNION ALL

SELECT 
  'Soft deleted' as status,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved'
  AND deleted_at IS NOT NULL
  AND deleted_at != '';

-- If soft-deleted leads exist, they might be counted but not shown


-- QUERY 7: Check for duplicate IDs (should return 0)
-- ============================================================================
SELECT id, COUNT(*) as duplicate_count
FROM leads
WHERE review_status = 'approved'
GROUP BY id
HAVING COUNT(*) > 1;

-- If any rows returned, you have duplicate IDs causing count inflation


-- QUERY 8: Verify exact count vs list query
-- ============================================================================
-- Count query (as backend does)
SELECT COUNT(*) AS count
FROM leads
WHERE review_status = 'approved';

-- List query (as backend does) - count the rows
SELECT id
FROM leads
WHERE review_status = 'approved'
ORDER BY created_at DESC;
-- Manually count rows in result set - should match count above


-- QUERY 9: Check review_status distribution
-- ============================================================================
SELECT 
  review_status,
  status,
  COUNT(*) as count
FROM leads
GROUP BY review_status, status
ORDER BY review_status, status;

-- This shows the relationship between review_status and status
-- Helps identify any unexpected combinations


-- QUERY 10: Find recently updated leads (potential race condition)
-- ============================================================================
SELECT 
  id,
  full_name,
  review_status,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) as seconds_since_update
FROM leads
WHERE review_status = 'approved'
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- If leads were recently updated, might indicate race condition


-- ============================================================================
-- DIAGNOSTIC SUMMARY QUERY
-- ============================================================================
SELECT 
  'Total Leads' as metric,
  COUNT(*)::text as value
FROM leads

UNION ALL

SELECT 
  'Approved (excluding NULL)' as metric,
  COUNT(*)::text as value
FROM leads
WHERE review_status = 'approved'

UNION ALL

SELECT 
  'Approved (including NULL)' as metric,
  COUNT(*)::text as value
FROM leads
WHERE review_status = 'approved' OR review_status IS NULL

UNION ALL

SELECT 
  'NULL review_status' as metric,
  COUNT(*)::text as value
FROM leads
WHERE review_status IS NULL

UNION ALL

SELECT 
  'To Be Reviewed' as metric,
  COUNT(*)::text as value
FROM leads
WHERE review_status = 'to_be_reviewed'

UNION ALL

SELECT 
  'Rejected' as metric,
  COUNT(*)::text as value
FROM leads
WHERE review_status = 'rejected';

-- Expected output:
-- metric                      | value
-- ----------------------------|------
-- Total Leads                 | 509
-- Approved (excluding NULL)   | 313  ← List count
-- Approved (including NULL)   | 314  ← Stats count
-- NULL review_status          | 1    ← The mismatch!
-- To Be Reviewed              | 150
-- Rejected                    | 45


-- ============================================================================
-- FIX VERIFICATION QUERIES (run after implementing fix)
-- ============================================================================

-- After fixing, this should return 0 (or you should update NULL leads)
SELECT COUNT(*) as null_review_status_count
FROM leads
WHERE review_status IS NULL;

-- If you want to fix the data (set NULL to a default value)
-- UNCOMMENT AND RUN CAREFULLY:
/*
UPDATE leads
SET review_status = 'to_be_reviewed'
WHERE review_status IS NULL;
*/

-- Verify counts match after fix
SELECT 
  'Stats Count' as source,
  COUNT(*)::text as approved_count
FROM leads
WHERE review_status = 'approved'

UNION ALL

SELECT 
  'List Count' as source,
  COUNT(*)::text as approved_count
FROM leads
WHERE review_status = 'approved';

-- Both should return the same number


-- ============================================================================
-- EXPECTED RESULTS INTERPRETATION
-- ============================================================================

/*
IF QUERY 1 RETURNS > 0:
  → Root cause: NULL review_status handling mismatch
  → Fix: Update line 1752 in lead.controller.js
  → Don't treat NULL as 'approved'

IF QUERY 1 RETURNS 0:
  → Check QUERY 6 (soft deletes)
  → Check QUERY 7 (duplicates)
  → Check QUERY 10 (race conditions)

IF QUERY 3 SHOWS MISMATCH:
  → Confirms different WHERE clauses between count and list
  → Fix: Ensure both use identical filter logic

IF QUERY 7 RETURNS ROWS:
  → You have duplicate IDs
  → Fix: Add DISTINCT to count query or fix data integrity

IF QUERY 10 SHOWS RECENT UPDATES:
  → Potential race condition
  → Fix: Ensure atomic refetch or proper cache invalidation
*/
