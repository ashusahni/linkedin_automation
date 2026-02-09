# Search Export Phantom Workflow

## Overview
This document explains how the LinkedIn Search Export phantom integration works in this project.

## How It Works

### 1. **PhantomBuster Configuration (Dashboard)**
   - Log into your PhantomBuster account
   - Open the LinkedIn Search Export agent (ID: `1817311377100254`)
   - Configure the following in the agent's dashboard:
     - **LinkedIn Connection**: Connect your LinkedIn account directly in PhantomBuster
     - **Search URL**: Set your LinkedIn search URL (e.g., `https://www.linkedin.com/search/results/people/?keywords=CEO`)
     - **Number of Results**: Set the limit (e.g., 100, 500)
   - Save the configuration

### 2. **Application Launch**
   When you click "Run Search Export" in the application:
   
   **Frontend** (`LeadSearchPage.jsx`):
   - User selects "Search Export" option
   - Clicks "Run Search Export" button
   - Sends POST request to `/api/phantom/search-leads-complete`

   **Backend** (`phantom.controller.js`):
   - Receives the request
   - Calls `phantomService.searchLeads(null, null)` (no query/limit parameters)
   
   **PhantomBuster Service** (`phantombuster.service.js`):
   - Calls `launchPhantom()` with `minimalArgsForSearch: true`
   - **CRITICAL**: Sends **ZERO arguments** to PhantomBuster API
   - PhantomBuster uses the configuration saved in its dashboard
   - Waits for phantom to complete
   - Fetches results from PhantomBuster's S3 storage
   - Returns lead data

   **Controller (continued)**:
   - Parses the lead data
   - Saves leads to database with `source: 'search_export'`
   - Exports to CSV file
   - Logs import to `import_logs` table
   - Returns success response to frontend

### 3. **Key Technical Details**

#### Why Zero Arguments?
The LinkedIn Search Export phantom **rejects any launch arguments** when called via API. It expects to use the configuration saved in the PhantomBuster dashboard. Sending cookies, user agents, or search parameters causes an `argument-invalid` error.

#### Code Flow
```javascript
// phantombuster.service.js - launchPhantom()
if (options.minimalArgsForSearch) {
  // Search Export: Send absolutely NO arguments
  launchArgs = {};
  finalArgs = {};
  hasLaunchArgs = false;
}

// API call to PhantomBuster
const body = { id: phantomId }; // NO arguments property
await pbRequest("/agents/launch", {
  method: "POST",
  body: JSON.stringify(body)
});
```

### 4. **Expected Logs (Success)**
```
🎯 === SEARCH & IMPORT REQUEST RECEIVED (search-leads-complete) ===
🎯 FULL LEAD SEARCH: launching PhantomBuster Search Export phantom...
🔵 === STARTING LEAD SEARCH ===
🔍 No custom args sent – phantom uses search URL & limit from PhantomBuster dashboard.
🚀 Launching phantom: 1817311377100254
📝 Using unique result files: result_XXXXX.csv | result_XXXXX.json
📌 Search Export: Using configuration from PhantomBuster dashboard (no arguments sent)
📋 Launch arguments: {}
🚀 Calling PhantomBuster /agents/launch for phantom 1817311377100254 (no args – uses dashboard config)
✅ Phantom launched. Container ID: XXXXX
⏳ Waiting for container XXXXX to complete (max 15 min)...
📊 Status: running | Exit Code: undefined
📊 Status: finished | Exit Code: 0
📊 Found XXX leads
✅ Parsed XXX leads
✅ Saved XXX to database
```

### 5. **Troubleshooting**

#### Error: "argument-invalid"
**Cause**: The code is sending arguments to PhantomBuster
**Fix**: Ensure `options.minimalArgsForSearch` is true and `launchArgs = {}`

#### Error: "cookie-missing"
**Cause**: LinkedIn not connected in PhantomBuster dashboard
**Fix**: Go to PhantomBuster dashboard → Open the agent → Connect LinkedIn account

#### No leads returned
**Cause**: Search URL or limits not configured in dashboard
**Fix**: Configure search URL and limits in PhantomBuster dashboard

### 6. **Environment Variables**
```env
# Required
PHANTOMBUSTER_API_KEY=your_api_key
SEARCH_EXPORT_PHANTOM_ID=1817311377100254

# NOT used for Search Export (dashboard config is used instead)
# SEARCH_EXPORT_USE_ENV_COOKIE=false
# LINKEDIN_SESSION_COOKIE=...
```

### 7. **Database Schema**
Leads are saved with:
- `source`: `'search_export'`
- All standard lead fields (name, headline, company, etc.)
- Import logged in `import_logs` table

### 8. **Files Modified**
- `backend/src/services/phantombuster.service.js` - Launch logic
- `backend/src/controllers/phantom.controller.js` - API endpoint
- `frontend/src/pages/LeadSearchPage.jsx` - UI
- `backend/.env` - Configuration

## Comparison with Working Version
Your working version (`Z:\Linkedin_reach\backend`) uses the same approach:
- Sends zero arguments
- Relies on dashboard configuration
- Completes with `exitCode: 0`
- Successfully retrieves 282 leads

This implementation now matches that behavior exactly.
