# 📋 Lead Count Mismatch - Investigation Checklist

## **Phase 1: Database Verification** ⏱️ 5 minutes

### **Step 1.1: Check for NULL review_status**
```sql
SELECT COUNT(*) as null_count FROM leads WHERE review_status IS NULL;
```
- [ ] Query executed
- [ ] Result recorded: `null_count = _____`
- [ ] If > 0: **Root cause confirmed!** → Skip to Phase 3
- [ ] If = 0: Continue to Step 1.2

### **Step 1.2: Compare count methods**
```sql
SELECT 'With NULL' as method, COUNT(*) FROM leads WHERE review_status = 'approved' OR review_status IS NULL
UNION ALL
SELECT 'Without NULL' as method, COUNT(*) FROM leads WHERE review_status = 'approved';
```
- [ ] Query executed
- [ ] Result recorded: With NULL = _____, Without NULL = _____
- [ ] If different: **Root cause confirmed!** → Skip to Phase 3
- [ ] If same: Continue to Step 1.3

### **Step 1.3: Full diagnostic**
```sql
SELECT COALESCE(review_status, 'NULL') as status, COUNT(*) FROM leads GROUP BY review_status;
```
- [ ] Query executed
- [ ] Results recorded:
  - approved: _____
  - to_be_reviewed: _____
  - rejected: _____
  - NULL: _____

---

## **Phase 2: Add Logging** ⏱️ 10 minutes
*Only if Phase 1 didn't identify root cause*

### **Step 2.1: Backend logging**
- [ ] Open `backend/src/controllers/lead.controller.js`
- [ ] Add logs to `getReviewStats` (line ~1728)
- [ ] Add logs to `getLeads` (line ~342)
- [ ] Save file
- [ ] Backend auto-reloaded

### **Step 2.2: Frontend logging**
- [ ] Open `frontend/src/components/LeadsTable.jsx`
- [ ] Add logs to `fetchStats` (line ~497)
- [ ] Add logs to `fetchLeads` (line ~445)
- [ ] Save file
- [ ] Frontend auto-reloaded

### **Step 2.3: Collect logs**
- [ ] Open browser console (F12)
- [ ] Navigate to Leads page
- [ ] Switch to Qualified tab
- [ ] Backend logs collected from terminal
- [ ] Frontend logs collected from browser console
- [ ] Logs analyzed

---

## **Phase 3: Implement Fix** ⏱️ 5 minutes

### **Step 3.1: Apply code fix**
- [ ] Open `backend/src/controllers/lead.controller.js`
- [ ] Navigate to line ~1752
- [ ] Replace NULL handling logic:
  ```javascript
  // BEFORE
  const status = row.review_status || 'approved';
  
  // AFTER
  const status = row.review_status;
  if (status && stats[status] !== undefined) {
    stats[status] = parseInt(row.count, 10);
    stats.total += parseInt(row.count, 10);
  }
  ```
- [ ] Save file
- [ ] Backend auto-reloaded

### **Step 3.2: (Optional) Fix data**
*Only if you want to clean up NULL values*
```sql
UPDATE leads SET review_status = 'to_be_reviewed' WHERE review_status IS NULL;
```
- [ ] Query executed
- [ ] Rows updated: _____

---

## **Phase 4: Verification** ⏱️ 10 minutes

### **Step 4.1: Browser verification**
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Refresh page (Ctrl+F5)
- [ ] Navigate to Leads page
- [ ] Check Qualified tab:
  - Count shown: _____
  - Visible leads: _____
  - Match: [ ] YES [ ] NO
- [ ] Check Review tab:
  - Count shown: _____
  - Visible leads: _____
  - Match: [ ] YES [ ] NO
- [ ] Check Rejected tab:
  - Count shown: _____
  - Visible leads: _____
  - Match: [ ] YES [ ] NO

### **Step 4.2: Database verification**
```sql
SELECT 'Stats' as source, COUNT(*) FROM leads WHERE review_status = 'approved'
UNION ALL
SELECT 'List' as source, COUNT(*) FROM leads WHERE review_status = 'approved';
```
- [ ] Query executed
- [ ] Both counts match: [ ] YES [ ] NO
- [ ] Count value: _____

### **Step 4.3: Mutation test**
- [ ] Navigate to Review tab
- [ ] Select 5 leads
- [ ] Click "Qualify" button
- [ ] Wait for success toast
- [ ] Check Review tab count decreased by 5: [ ] YES [ ] NO
- [ ] Check Qualified tab count increased by 5: [ ] YES [ ] NO
- [ ] Check visible leads match counts: [ ] YES [ ] NO

### **Step 4.4: Pagination test**
- [ ] Navigate to Qualified tab
- [ ] Scroll to bottom
- [ ] Click "Load More" (if available)
- [ ] Verify no duplicate leads: [ ] YES [ ] NO
- [ ] Verify total count remains consistent: [ ] YES [ ] NO

---

## **Phase 5: Cleanup** ⏱️ 5 minutes

### **Step 5.1: Remove debug logging**
- [ ] Remove logs from `backend/src/controllers/lead.controller.js`
- [ ] Remove logs from `frontend/src/components/LeadsTable.jsx`
- [ ] Save files
- [ ] Servers auto-reloaded

### **Step 5.2: Final verification**
- [ ] Refresh browser
- [ ] No console errors: [ ] YES [ ] NO
- [ ] All counts still match: [ ] YES [ ] NO
- [ ] Application works normally: [ ] YES [ ] NO

### **Step 5.3: Documentation**
- [ ] Update this checklist with findings
- [ ] Note root cause: _________________________________
- [ ] Note fix applied: _________________________________
- [ ] Archive investigation files (optional)

---

## **Results Summary**

### **Root Cause Identified:**
```
[ ] NULL review_status handling mismatch
[ ] Quality scoring divergence
[ ] Pagination boundary error
[ ] Frontend state caching
[ ] Soft delete handling
[ ] Other: _________________________________
```

### **Fix Applied:**
```
[ ] Code change in getReviewStats
[ ] Code change in getLeads
[ ] Database update
[ ] Frontend refetch logic
[ ] Other: _________________________________
```

### **Verification Status:**
```
[ ] ✅ All counts match visible leads
[ ] ✅ Mutations update correctly
[ ] ✅ Pagination works
[ ] ✅ No console errors
[ ] ✅ Database queries confirm consistency
```

### **Time Spent:**
```
Investigation: _____ minutes
Fix: _____ minutes
Verification: _____ minutes
Total: _____ minutes
```

---

## **Quick Reference**

### **If NULL count > 0:**
→ Root cause: NULL handling mismatch
→ Fix: Update line 1752 in lead.controller.js
→ Time: 5 minutes

### **If NULL count = 0 but counts still mismatch:**
→ Add logging (Phase 2)
→ Analyze logs
→ Check other hypotheses

### **If fix doesn't work:**
→ Run full diagnostic (debug_lead_counts.sql)
→ Check LEAD_COUNT_DEBUGGING.md
→ Collect logs and analyze

---

## **Files Created**

- [x] `INVESTIGATION_SUMMARY.md` - Quick summary
- [x] `LEAD_COUNT_DEBUGGING.md` - Detailed guide
- [x] `DEBUG_LOGS_TO_ADD.js` - Logging snippets
- [x] `debug_lead_counts.sql` - SQL queries
- [x] `CHECKLIST.md` - This file

---

## **Status**

**Current Phase:** [ ] 1 [ ] 2 [ ] 3 [ ] 4 [ ] 5

**Overall Status:** 
- [ ] 🔍 Investigating
- [ ] 🔧 Fixing
- [ ] ✅ Verified
- [ ] ❌ Blocked (reason: _________________)

**Last Updated:** _________________

**Updated By:** _________________

---

## **Notes**

```
[Add any additional notes, observations, or findings here]
```
