# Plan: Keep Quality & Connection Degree After Qualify/Reject/Move

## Problem

When the user is on a **filtered** view (Primary, Secondary, Tertiary, or a connection degree):

1. Example: **Secondary** → Review tab shows 60 leads.
2. User selects 20 leads and clicks **Qualify**.
3. **Expected:** Stay on Secondary; Review = 40 (60 − 20), Qualified increases by 20; list shows the right leads.
4. **Actual:** Quality (and previously URL) was cleared after qualify, so the user was taken to the **unfiltered** view. Counts and list no longer reflected "Secondary only," so it looked like wrong logic (e.g. "total leads minus qualified" instead of "Review = 40").

Same bad behavior for Primary, Tertiary, and connection degree.

## Intended Behavior

| Action | Filters (quality, connection_degree) | Result |
|--------|-------------------------------------|--------|
| Qualify N leads from Review | **Keep** current filters | Stay on same view; Review −N, Qualified +N; list and counts match filter |
| Reject N leads | **Keep** | Stay on same view; counts and list update for current filter |
| Move N to Review | **Keep** | Stay on same view; counts and list update for current filter |

- Counts (Qualified, Review, Rejected, Imported) must always reflect the **current** filter (quality + connection_degree + industry, etc.).
- After any mutation we **refetch** leads and review-stats **with the same params** (no clearing).

## Root Cause (Frontend)

In `LeadsTable.jsx`, `handleBulkApprove` was:

1. Clearing `metaFilters.quality` and `activeQuickFilters` (primary/secondary/tertiary).
2. Removing `quality` from the URL.

So after qualify, the next `fetchLeads()` and `fetchStats()` used **no** quality/connection_degree, i.e. global view.

## Fix

1. **Remove** the logic in `handleBulkApprove` that clears quality and quick filters and that updates the URL. After approve, only:
   - Clear selection.
   - Call `fetchLeads()` and `fetchStats()` (no overrides) so they use current `metaFilters` and `activeQuickFilters`.
2. **Do not** add any clearing in `handleConfirmReject` or `handleMoveToReview` (they already don’t clear).
3. Backend is already correct: when `quality` is set, list and review-stats both use "rank all leads (with base filters), then filter by tier and review_status," so counts and list stay in sync. Connection_degree is applied in both getLeads and getReviewStats.

## Verification

- On Secondary (or Primary/Tertiary or a connection degree), Review tab with 60 leads.
- Qualify 20 → stay on Secondary; Review shows 40, Qualified shows +20; list has 40 in Review.
- Same for reject and move-to-review: counts and list stay consistent with the current filter.
