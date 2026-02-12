// ============================================================================
// TEMPORARY DEBUGGING LOGS - Lead Count Mismatch Investigation
// Add these logs to identify the root cause, then remove after fix
// ============================================================================

// FILE 1: backend/src/controllers/lead.controller.js
// ADD AFTER LINE 1728 (in getReviewStats function, before query execution)

console.log('\n🔍 ========== REVIEW STATS QUERY ==========');
console.log('Filters:', { connection_degree, quality, quality_score, industry, title, company, location, status });
console.log('WHERE Clause:', whereClause);
console.log('Params:', params);

// ADD AFTER LINE 1737 (after standard query execution)

console.log('Query:', `SELECT review_status, COUNT(*) FROM leads ${whereClause} GROUP BY review_status`);
console.log('Raw Results:', result.rows);

// ADD AFTER LINE 1752 (in forEach loop, NULL handling)

if (row.review_status === null) {
    console.log(`⚠️  WARNING: NULL review_status treated as 'approved' (count: ${row.count})`);
}

// ADD AFTER LINE 1761 (before sending response)

console.log('Final Stats:', stats);
console.log('========================================\n');


// FILE 2: backend/src/controllers/lead.controller.js
// ADD AFTER LINE 342 (in getLeads function, before query execution)

console.log('\n🔍 ========== LEADS LIST QUERY ==========');
console.log('Review Status Filter:', req.query.review_status);
console.log('WHERE Clause:', whereClause);
console.log('Params:', params);

// ADD AFTER LINE 355 (after data query execution)

console.log('Data Query:', dataQuery.replace(/\s+/g, ' '));
console.log('Returned Rows:', result.rows.length);

// ADD AFTER LINE 450 (after count query execution)

console.log('Count Query:', countQuery.replace(/\s+/g, ' '));
console.log('Count Result:', countResult.rows[0].count);
console.log('========================================\n');


// FILE 3: frontend/src/components/LeadsTable.jsx
// ADD AFTER LINE 497 (in fetchStats, after API call)

console.log('\n🔍 ========== FRONTEND STATS ==========');
console.log('Review Stats Response:', reviewRes.data);
console.log('Approved:', reviewRes.data.reviewStats?.approved);
console.log('Review:', reviewRes.data.reviewStats?.to_be_reviewed);
console.log('Rejected:', reviewRes.data.reviewStats?.rejected);
console.log('Total:', reviewRes.data.reviewStats?.total);
console.log('=====================================\n');

// ADD AFTER LINE 445 (in fetchLeads, after setting pagination)

console.log('\n🔍 ========== FRONTEND LEADS ==========');
console.log('Tab:', reviewStatusTab);
console.log('Leads Received:', data?.length);
console.log('Pagination Total:', paginationData.total);
console.log('Match:', data?.length === paginationData.total ? '✅ YES' : '❌ NO');
console.log('====================================\n');


// ============================================================================
// QUICK DATABASE QUERIES TO RUN
// ============================================================================

/*
-- Query 1: Check for NULL review_status (MOST LIKELY CULPRIT)
SELECT COUNT(*) as null_count
FROM leads
WHERE review_status IS NULL;

-- Query 2: Count by review_status (including NULL)
SELECT
  COALESCE(review_status, 'NULL') as status,
  COUNT(*) as count
FROM leads
GROUP BY review_status
ORDER BY count DESC;

-- Query 3: Compare approved count (with vs without NULL)
SELECT
  'With NULL handling' as method,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved' OR review_status IS NULL

UNION ALL

SELECT
  'Without NULL handling' as method,
  COUNT(*) as count
FROM leads
WHERE review_status = 'approved';

-- Query 4: Find the ghost lead(s)
SELECT id, full_name, review_status, status, created_at
FROM leads
WHERE review_status IS NULL
ORDER BY created_at DESC
LIMIT 10;
*/


// ============================================================================
// EXPECTED OUTPUT IF HYPOTHESIS 1 IS CORRECT (NULL handling mismatch)
// ============================================================================

/*
BACKEND TERMINAL:

🔍 ========== REVIEW STATS QUERY ==========
WHERE Clause:
Params: []
Query: SELECT review_status, COUNT(*) FROM leads  GROUP BY review_status
Raw Results: [
  { review_status: 'approved', count: '313' },
  { review_status: 'to_be_reviewed', count: '150' },
  { review_status: 'rejected', count: '45' },
  { review_status: null, count: '1' }  ← THE GHOST LEAD
]
⚠️  WARNING: NULL review_status treated as 'approved' (count: 1)
Final Stats: {
  approved: 314,        ← 313 + 1 (NULL counted as approved)
  to_be_reviewed: 150,
  rejected: 45,
  total: 509
}
========================================

🔍 ========== LEADS LIST QUERY ==========
Review Status Filter: approved
WHERE Clause:  WHERE review_status = $1
Params: ['approved']
Data Query: SELECT * FROM leads WHERE review_status = $1 ORDER BY ...
Returned Rows: 50
Count Query: SELECT COUNT(*) FROM leads WHERE review_status = $1
Count Result: 313  ← Excludes NULL (correct)
========================================


BROWSER CONSOLE:

🔍 ========== FRONTEND STATS ==========
Approved: 314  ← Includes NULL (incorrect)
Review: 150
Rejected: 45
Total: 509
=====================================

🔍 ========== FRONTEND LEADS ==========
Tab: approved
Leads Received: 50
Pagination Total: 313  ← Correct count
Match: ✅ YES
====================================

MISMATCH: Stats says 314, Pagination says 313
ROOT CAUSE: NULL review_status counted as 'approved' in stats
*/


// ============================================================================
// THE FIX (if Hypothesis 1 is confirmed)
// ============================================================================

/*
FILE: backend/src/controllers/lead.controller.js
LINE: ~1752

BEFORE:
    result.rows.forEach(row => {
      const status = row.review_status || 'approved';  // ❌ Treats NULL as 'approved'
      if (stats[status] !== undefined) {
        stats[status] = parseInt(row.count, 10);
      }
      stats.total += parseInt(row.count, 10);
    });

AFTER:
    result.rows.forEach(row => {
      const status = row.review_status;
      
      // Only count if review_status is not NULL
      if (status && stats[status] !== undefined) {
        stats[status] = parseInt(row.count, 10);
        stats.total += parseInt(row.count, 10);
      }
      // Optionally: Track NULL separately
      // else if (status === null) {
      //   console.warn(`Lead with NULL review_status found (count: ${row.count})`);
      // }
    });

EXPLANATION:
- Don't treat NULL as 'approved'
- Only count leads with explicit review_status values
- This makes the count query match the list query logic
*/
