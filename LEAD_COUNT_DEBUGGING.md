# 🔍 Lead Count Mismatch - Root Cause Investigation

## **Current Status: INVESTIGATION PHASE**

**Problem:** Count displayed in tabs doesn't match visible leads
- **Primary (Qualified)**: Shows 314, actual visible: 313 (off by +1)
- **Secondary (Review)**: Count appears correct
- **Tertiary (Rejected)**: Shows one less than actual (off by -1)

---

## **System Architecture Analysis**

### **Data Flow**

```
Frontend (LeadsTable.jsx)
    ↓
    ├─ fetchStats() → GET /api/leads/review-stats
    │   └─ Returns: { approved: 314, to_be_reviewed: X, rejected: Y }
    │
    └─ fetchLeads() → GET /api/leads?review_status=approved
        └─ Returns: { leads: [...], pagination: { total: 314 } }
```

### **Backend Query Paths**

**Path 1: Count Query** (`getReviewStats`)
```sql
-- File: lead.controller.js:1730-1737
SELECT 
  review_status,
  COUNT(*) as count
FROM leads
WHERE [filters]
GROUP BY review_status
```

**Path 2: List Query** (`getLeads`)
```sql
-- File: lead.controller.js:345-352 (data query)
SELECT *
FROM leads
WHERE [filters]
ORDER BY created_at DESC
LIMIT 50
OFFSET 0

-- File: lead.controller.js:444-448 (count query)
SELECT COUNT(*) AS count
FROM leads
WHERE [filters]
```

---

## **Root Cause Hypotheses**

### **Hypothesis 1: Different WHERE Clauses** ⭐ MOST LIKELY

**Evidence:**
- `getReviewStats` uses: `review_status` grouping
- `getLeads` uses: `review_status` filter + pagination

**Potential Mismatch:**
```javascript
// getReviewStats (line 1752)
const status = row.review_status || 'approved';  // ❌ NULL → 'approved'

// getLeads (line 396-398)
if (reviewStatusTab) {
  params.set('review_status', reviewStatusTab);  // ✅ Exact match only
}
```

**Issue:** 
- Count query treats `NULL` review_status as `'approved'`
- List query only returns leads where `review_status = 'approved'`
- **Result:** Count includes NULL leads, list doesn't

**Test:**
```sql
-- Check for NULL review_status leads
SELECT COUNT(*) FROM leads WHERE review_status IS NULL;
-- If > 0, this is the mismatch
```

---

### **Hypothesis 2: Quality Scoring Divergence**

**Evidence:**
- `getReviewStats` has quality scoring logic (line 1680-1726)
- `getLeads` has separate quality scoring logic (line 358-442)

**Potential Mismatch:**
```javascript
// getReviewStats uses CTE with PERCENT_RANK
WHERE pct_rank <= 0.20  // Primary

// getLeads uses same logic BUT different execution path
WHERE pct_rank <= 0.20  // Primary
```

**Issue:**
- If quality filter is active, both use scoring
- BUT: Different WHERE clauses before scoring
- **Result:** Different base datasets → different rankings → different counts

---

### **Hypothesis 3: Pagination Boundary Error**

**Evidence:**
- Frontend shows 313 visible leads
- Backend says total: 314
- Difference: Exactly 1

**Potential Mismatch:**
```javascript
// Frontend (LeadsTable.jsx:442-446)
setPagination({
  page: paginationData.page,
  limit: paginationData.limit,
  total: paginationData.total || 0  // Backend says 314
});

// But visible leads array
setLeads(data || []);  // Only 313 items?
```

**Issue:**
- OFFSET calculation: `(page - 1) * limit` ✅ Correct
- But: Last page might have off-by-one
- **Result:** 314 total, but only 313 returned

**Test:**
```sql
-- Check actual count vs returned rows
SELECT COUNT(*) FROM leads WHERE review_status = 'approved';  -- Should be 314
SELECT * FROM leads WHERE review_status = 'approved' LIMIT 50 OFFSET 0;  -- Count rows
```

---

### **Hypothesis 4: Frontend State Caching**

**Evidence:**
- User qualifies leads → count updates → list doesn't

**Potential Mismatch:**
```javascript
// After bulk approve (LeadsTable.jsx:778-779)
fetchLeads();
fetchStats();  // ← Both called, but race condition?
```

**Issue:**
- `fetchStats()` completes first → count = 314
- `fetchLeads()` completes second → list = old data (313)
- **Result:** Stale list, fresh count

---

## **Debugging Steps**

### **Step 1: Add Logging to Backend**

#### **A. Log Review Stats Query**

```javascript
// File: backend/src/controllers/lead.controller.js
// Line: ~1730 (before query execution)

export async function getReviewStats(req, res) {
  try {
    // ... existing filter logic ...
    
    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 🔍 ADD THIS LOGGING
    console.log('\n🔍 ========== REVIEW STATS QUERY ==========');
    console.log('WHERE Clause:', whereClause);
    console.log('Params:', params);
    
    if (qScore) {
      // ... quality scoring logic ...
      console.log('Quality Query:', qualityQuery);
      result = await pool.query(qualityQuery, params);
    } else {
      const query = `
        SELECT 
          review_status,
          COUNT(*) as count
        FROM leads
        ${whereClause}
        GROUP BY review_status
      `;
      console.log('Standard Query:', query);
      result = await pool.query(query, params);
    }
    
    console.log('Raw Results:', result.rows);
    console.log('========================================\n');
    
    // ... rest of function ...
  }
}
```

#### **B. Log Leads List Query**

```javascript
// File: backend/src/controllers/lead.controller.js
// Line: ~343 (before data query)

export async function getLeads(req, res) {
  try {
    // ... existing filter logic ...
    
    const whereClause = conditionClauses.length 
      ? ` WHERE ${conditionClauses.join(" AND ")}` 
      : "";

    // 🔍 ADD THIS LOGGING
    console.log('\n🔍 ========== LEADS LIST QUERY ==========');
    console.log('Review Status Tab:', req.query.review_status);
    console.log('WHERE Clause:', whereClause);
    console.log('Params:', params);
    
    const dataQuery = `
      SELECT *
      FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    
    console.log('Data Query:', dataQuery);
    console.log('Data Params:', [...params, pageLimit, offset]);
    
    const result = await pool.query(dataQuery, dataParams);
    console.log('Returned Rows:', result.rows.length);
    
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM leads
      ${whereClause}
    `;
    
    console.log('Count Query:', countQuery);
    console.log('Count Params:', params);
    
    const countResult = await pool.query(countQuery, params);
    console.log('Count Result:', countResult.rows[0].count);
    console.log('========================================\n');
    
    // ... rest of function ...
  }
}
```

#### **C. Log NULL Review Status Handling**

```javascript
// File: backend/src/controllers/lead.controller.js
// Line: ~1748 (in getReviewStats)

result.rows.forEach(row => {
  const originalStatus = row.review_status;
  const status = row.review_status || 'approved';
  
  // 🔍 ADD THIS LOGGING
  if (originalStatus === null) {
    console.log(`⚠️  NULL review_status treated as 'approved' (count: ${row.count})`);
  }
  
  if (stats[status] !== undefined) {
    stats[status] = parseInt(row.count, 10);
  }
  stats.total += parseInt(row.count, 10);
});
```

---

### **Step 2: Run Direct Database Queries**

#### **A. Check for NULL review_status**

```sql
-- Count leads with NULL review_status
SELECT COUNT(*) as null_count
FROM leads
WHERE review_status IS NULL;

-- If > 0, this is likely the issue
-- These are counted as 'approved' in stats but excluded from list
```

#### **B. Compare Count vs List**

```sql
-- Count query (as backend does)
SELECT 
  review_status,
  COUNT(*) as count
FROM leads
GROUP BY review_status;

-- Expected output:
-- review_status | count
-- --------------|------
-- approved      | 314   ← Includes NULLs?
-- to_be_reviewed| 150
-- rejected      | 45

-- List query (as backend does)
SELECT COUNT(*) 
FROM leads
WHERE review_status = 'approved';

-- Expected: 313 (excludes NULLs)
```

#### **C. Find the Ghost Lead**

```sql
-- If count = 314 but list = 313, find the missing lead
SELECT id, full_name, review_status, created_at
FROM leads
WHERE review_status IS NULL
   OR review_status = 'approved'
ORDER BY created_at DESC;

-- Manually count rows
-- Look for leads with review_status = NULL
```

---

### **Step 3: Frontend Debugging**

#### **A. Log API Responses**

```javascript
// File: frontend/src/components/LeadsTable.jsx
// Line: ~485 (in fetchStats)

const [statsRes, reviewRes] = await Promise.all([
  axios.get('/api/leads/stats'),
  axios.get('/api/leads/review-stats', { params })
]);

// 🔍 ADD THIS LOGGING
console.log('\n🔍 ========== FRONTEND STATS ==========');
console.log('Review Stats Response:', reviewRes.data);
console.log('Approved Count:', reviewRes.data.reviewStats?.approved);
console.log('=====================================\n');

setStats(statsRes.data);
if (reviewRes.data?.reviewStats) {
  setReviewStats(reviewRes.data.reviewStats);
}
```

#### **B. Log Leads Fetch**

```javascript
// File: frontend/src/components/LeadsTable.jsx
// Line: ~432 (in fetchLeads)

const res = await axios.get(`/api/leads?${params.toString()}`);
const data = Array.isArray(res.data) ? res.data : res.data.leads;
const paginationData = res.data.pagination || { page: currentPage, limit: 50, total: data?.length || 0 };

// 🔍 ADD THIS LOGGING
console.log('\n🔍 ========== FRONTEND LEADS ==========');
console.log('Review Status Tab:', reviewStatusTab);
console.log('API Response:', res.data);
console.log('Leads Array Length:', data?.length);
console.log('Pagination Total:', paginationData.total);
console.log('Match:', data?.length === paginationData.total ? '✅' : '❌');
console.log('=====================================\n');

if (append) {
  setLeads(prev => [...prev, ...(data || [])]);
} else {
  setLeads(data || []);
}
```

#### **C. Log Visible Leads**

```javascript
// File: frontend/src/components/LeadsTable.jsx
// Add after leads state update

useEffect(() => {
  console.log('\n🔍 ========== VISIBLE LEADS ==========');
  console.log('Leads State Length:', leads.length);
  console.log('Pagination Total:', pagination.total);
  console.log('Review Stats Approved:', reviewStats.approved);
  console.log('Mismatch:', {
    'Leads vs Pagination': leads.length !== pagination.total,
    'Leads vs Stats': leads.length !== reviewStats.approved,
    'Pagination vs Stats': pagination.total !== reviewStats.approved
  });
  console.log('====================================\n');
}, [leads, pagination, reviewStats]);
```

---

### **Step 4: Test Mutation Behavior**

#### **A. Before Qualifying Leads**

```javascript
// In browser console
console.log('Before Qualify:');
console.log('- Visible leads:', document.querySelectorAll('[data-lead-id]').length);
console.log('- Approved count:', document.querySelector('[data-count="approved"]')?.textContent);
```

#### **B. After Qualifying Leads**

```javascript
// In browser console (after clicking "Qualify")
console.log('After Qualify:');
console.log('- Visible leads:', document.querySelectorAll('[data-lead-id]').length);
console.log('- Approved count:', document.querySelector('[data-count="approved"]')?.textContent);
console.log('- Match:', /* compare */);
```

---

## **Expected Findings**

### **If Hypothesis 1 is Correct (NULL handling)**

**Backend Logs:**
```
🔍 ========== REVIEW STATS QUERY ==========
Raw Results: [
  { review_status: 'approved', count: '313' },
  { review_status: null, count: '1' }  ← The ghost lead
]
⚠️  NULL review_status treated as 'approved' (count: 1)
Final Stats: { approved: 314, ... }  ← 313 + 1 = 314
========================================

🔍 ========== LEADS LIST QUERY ==========
WHERE Clause: WHERE review_status = $1
Params: ['approved']
Count Result: 313  ← Excludes NULL
Returned Rows: 50 (page 1)
========================================
```

**Fix:** Change line 1752 in `lead.controller.js`
```javascript
// BEFORE
const status = row.review_status || 'approved';  // ❌ Treats NULL as approved

// AFTER
const status = row.review_status;  // ✅ Keep NULL as NULL
if (status && stats[status] !== undefined) {
  stats[status] = parseInt(row.count, 10);
}
```

---

### **If Hypothesis 2 is Correct (Quality scoring)**

**Backend Logs:**
```
🔍 ========== REVIEW STATS QUERY ==========
Quality Query: WITH scored_leads AS (...)
WHERE (pct_rank <= 0.20)  ← Primary filter
Raw Results: [{ review_status: 'approved', count: '314' }]
========================================

🔍 ========== LEADS LIST QUERY ==========
Quality Query: WITH scored_leads AS (...)
WHERE (pct_rank <= 0.20)  ← Same filter
Count Result: 313  ← Different result!
========================================
```

**Fix:** Ensure both queries use identical base filters before scoring

---

### **If Hypothesis 3 is Correct (Pagination)**

**Backend Logs:**
```
🔍 ========== LEADS LIST QUERY ==========
Count Result: 314
Returned Rows: 50 (page 1)
... (pages 2-6)
Returned Rows: 14 (page 7)  ← Should be 14, but might be 13
Total across all pages: 313  ← Off by 1
========================================
```

**Fix:** Check OFFSET calculation and last page handling

---

### **If Hypothesis 4 is Correct (State caching)**

**Frontend Logs:**
```
🔍 ========== FRONTEND STATS ==========
Approved Count: 314  ← Updated immediately
=====================================

🔍 ========== FRONTEND LEADS ==========
Leads Array Length: 313  ← Stale data
Pagination Total: 313  ← Stale data
Match: ✅ (but both are stale)
=====================================
```

**Fix:** Ensure atomic refetch or invalidate cache properly

---

## **Action Plan**

### **Phase 1: Add Logging (Today)**

1. ✅ Add backend logging to `getReviewStats`
2. ✅ Add backend logging to `getLeads`
3. ✅ Add frontend logging to `fetchStats` and `fetchLeads`
4. ✅ Run the application and trigger the issue
5. ✅ Collect logs from both backend and frontend

### **Phase 2: Database Verification (Today)**

1. ✅ Run SQL query to check for NULL `review_status`
2. ✅ Compare count query vs list query results
3. ✅ Identify the exact lead(s) causing mismatch

### **Phase 3: Implement Minimal Fix (Tomorrow)**

Based on findings, implement ONE of:

**Option A: Fix NULL handling**
```javascript
// Don't treat NULL as 'approved'
const status = row.review_status;
if (status && stats[status] !== undefined) {
  stats[status] = parseInt(row.count, 10);
}
```

**Option B: Ensure filter consistency**
```javascript
// Use same WHERE clause builder for both queries
const whereClause = buildReviewStatusFilter(reviewStatusTab);
```

**Option C: Fix pagination**
```javascript
// Verify OFFSET calculation
const offset = (pageNumber - 1) * pageLimit;  // ✅ Correct
```

**Option D: Atomic refetch**
```javascript
// Invalidate cache before refetch
await queryClient.invalidateQueries(['leads', 'stats']);
await Promise.all([fetchLeads(), fetchStats()]);
```

### **Phase 4: Verify Fix (Tomorrow)**

1. ✅ Restart application
2. ✅ Check all three tabs (Qualified, Review, Rejected)
3. ✅ Verify count matches visible leads
4. ✅ Test mutation (qualify leads)
5. ✅ Verify count updates correctly
6. ✅ Remove debug logging

---

## **Success Criteria**

✅ **Qualified tab:** Count = 314, Visible = 314
✅ **Review tab:** Count = X, Visible = X
✅ **Rejected tab:** Count = Y, Visible = Y
✅ **After qualifying 5 leads:** Counts update correctly
✅ **No console errors or warnings**
✅ **Pagination works correctly on all pages**

---

## **Next Steps**

1. **Implement logging** (copy code blocks above)
2. **Restart dev servers** (`npm run dev`)
3. **Open browser console** (F12)
4. **Navigate to Leads page**
5. **Switch between tabs** (Qualified, Review, Rejected)
6. **Collect logs** from both terminal and browser
7. **Run database queries** to verify data
8. **Report findings** in this document
9. **Implement minimal fix** based on root cause
10. **Verify fix** and remove logging

---

## **Log Collection Template**

### **Backend Terminal Output**

```
[Paste backend logs here after running the app]
```

### **Browser Console Output**

```
[Paste browser console logs here]
```

### **Database Query Results**

```sql
-- Query 1: Check NULL review_status
SELECT COUNT(*) FROM leads WHERE review_status IS NULL;
-- Result: [paste here]

-- Query 2: Count by review_status
SELECT review_status, COUNT(*) FROM leads GROUP BY review_status;
-- Result: [paste here]

-- Query 3: Approved leads count
SELECT COUNT(*) FROM leads WHERE review_status = 'approved';
-- Result: [paste here]
```

---

## **Conclusion**

**Most Likely Root Cause:** NULL `review_status` handling mismatch

**Evidence:**
- Line 1752 treats NULL as 'approved' in count
- Line 396-398 excludes NULL from list query
- Result: Count includes NULL leads, list doesn't

**Recommended Fix:** Update `getReviewStats` to not treat NULL as 'approved'

**Estimated Time:** 5 minutes to implement, 10 minutes to verify

**Risk:** Low (only affects count display, no data loss)
