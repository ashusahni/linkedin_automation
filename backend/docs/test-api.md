# API Testing Guide

## Server Status
Server is running on: http://localhost:3000

## Available Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Export LinkedIn Connections (Complete Flow)
This will launch the phantom, wait for completion, save to DB, and export CSV.

```bash
curl -X POST http://localhost:3000/api/network/export-connections
```

### 3. Search Leads (Complete Flow)
```bash
curl -X POST http://localhost:3000/api/network/search-leads ^
  -H "Content-Type: application/json" ^
  -d "{\"searchQuery\": \"CEO at Tech Company\", \"numberOfResults\": 50}"
```

### 4. Enrich Profiles (Complete Flow)
```bash
curl -X POST http://localhost:3000/api/network/enrich-profiles ^
  -H "Content-Type: application/json" ^
  -d "{\"profileUrls\": [\"https://www.linkedin.com/in/example1/\", \"https://www.linkedin.com/in/example2/\"]}"
```

## What Changed?

### Fixed Issue:
The `waitForCompletion` function was only checking for `status === "finished"`, but PhantomBuster returns different status values:
- `"success"` - when the phantom completes successfully
- `"finished"` - alternative completion status
- `exitCode: 0` - indicates successful completion

### Solution:
Updated the status checking logic to handle all possible completion statuses:
```javascript
const isFinished = container.status === "finished" || 
                  container.status === "success" ||
                  (container.exitCode !== undefined && container.exitCode !== null);
```

Now the system will properly detect when PhantomBuster completes instead of timing out after 15 minutes.

## Expected Behavior

When you run the export connections endpoint:
1. ✅ Phantom launches (you'll see this in PhantomBuster UI)
2. ✅ Server polls every 10 seconds for status
3. ✅ When phantom completes (~2 minutes), server detects it immediately
4. ✅ Downloads the result data
5. ✅ Saves to database
6. ✅ Exports to CSV file in `exports/` folder
7. ✅ Returns JSON response with results

## Debugging

If you need to check a specific container status:
```bash
node debug-container.js <containerId>
```

This will show you the exact status values PhantomBuster is returning.
