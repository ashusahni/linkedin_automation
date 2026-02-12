# Lead Count Mismatch Fix

## Issue
In the dashboard's Primary Leads section, the Qualified tab was showing 100 leads in the count at the top, but only 20 leads were actually displayed in the list.

## Root Cause
The issue was in the `getReviewStats` function in `backend/src/controllers/lead.controller.js` at line 1752:

```javascript
const status = row.review_status || 'approved';
```

This line was incorrectly treating all leads with `NULL` review_status as 'approved', which inflated the count. The database query correctly counted only leads with `review_status = 'approved'`, but this fallback logic was adding NULL values to the approved count.

## Solution
Changed the logic to only count leads with actual review_status values:

```javascript
const status = row.review_status;
if (status && stats[status] !== undefined) {
  stats[status] = parseInt(row.count, 10);
}
```

Now the count will accurately reflect only the leads that have `review_status = 'approved'`, matching the actual number of leads displayed in the Qualified tab.

## Files Modified
- `backend/src/controllers/lead.controller.js` (lines 1740-1757)

## Testing
After the backend restarts (nodemon should auto-restart), refresh the dashboard and navigate to:
1. Dashboard → Primary Leads → Qualified tab
2. The count shown at the top should now match the actual number of leads displayed in the list

## Impact
This fix ensures that all review status counts (Qualified, Review, Rejected) accurately reflect the actual number of leads in each category, based on their actual database values rather than fallback defaults.
