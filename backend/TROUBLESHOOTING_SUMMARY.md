# Troubleshooting & Fix Summary

## 1. Database Schema & Migration Runner Fixes

### Issue
The application was crashing with `relation "automation_logs" does not exist` and `column "updated_at" does not exist`. This happened because the migration runner was looking in the wrong directory (`../../../database/migrations` instead of `../../database/migrations`), causing it to silently skip recent migrations.

### Fixes Applied
1.  **Fixed Migration Paths**: Updated `backend/src/db/migrations.js` to correctly locate SQL files.
2.  **Emergency Migration**: Created `backend/database/migrations/015_emergency_fix.sql` to catch up on all missing schema elements:
    *   Created `automation_logs` table.
    *   Added `updated_at` column to `approval_queue`.
    *   Added `email` column to `leads`.

## 2. PhantomBuster "Invalid/Missing Cookie" Fix

### Issue
Launching the **LinkedIn Message Sender** phantom failed with two alternating errors:
1.  `Exit Code 1: Cookie missing`: When we tried to be safe and *not* send a cookie via API (assuming PhantomBuster would use its default), the API override behavior caused it to receive *no* cookie.
2.  `Exit Code 87: Network cookie invalid`: When we forced the local `.env` cookie, LinkedIn flagged the request because the IP address jumped from your local machine (where the `.env` cookie was created) to PhantomBuster's cloud server.

### The Code Solution: "Fetch & Inject" Strategy
We implemented a smart hybrid approach in `backend/src/services/phantombuster.service.js`:

1.  **Fetch**: Before launching, the backend queries the PhantomBuster API to get the *current configuration* of your agent.
2.  **Extract**: It looks for the `sessionCookie` that you saved in the PhantomBuster dashboard (which is trusted by LinkedIn).
3.  **Inject**: It explicitly passes this trusted cookie back into the launch arguments.

**Why this works:**
*   It satisfies the API's requirement for a cookie parameter (fixing Exit Code 1).
*   It uses the server-trusted cookie instead of your local one (fixing Exit Code 87).

### Key Code Change
```javascript
// backend/src/services/phantombuster.service.js

// 1. Fetch current agent config
const agentConfig = await this.fetchAgent(phantomId);
// ... parsing logic ...
dashboardCookieValue = savedArgs.sessionCookie;

// 2. Inject dashboard cookie into launch arguments
if (hasDashboardCookie && dashboardCookieValue) {
   console.log("✅ Injecting dashboard cookie into launch arguments");
   launchArgs.sessionCookie = dashboardCookieValue;
   launchOptions = { noSessionCookie: true }; // Don't use .env
}
```

## 3. Operational Workflow

For smooth operation moving forward, follow this workflow:

### Step 1: Connect in Dashboard (One Time)
1.  Log in to **PhantomBuster**.
2.  Go to your **LinkedIn Message Sender** agent.
3.  Click **"Connect to LinkedIn"**.
4.  Ensure you see the **Green Checkmark ✅ (Connected)**.
5.  Click **Save**.

### Step 2: Public URL (Every Session)
The phantom needs to download your message instructions from a CSV. Since your backend is local, we use **ngrok**.
1.  Run `ngrok http 5000` in a terminal.
2.  Copy the `https://....ngrok-free.app` URL.
3.  Update `BACKEND_PUBLIC_URL` in `backend/.env`.

### Step 3: Run Server
1.  Restart the backend: `npm run dev`.
2.  The logs should verify the database connection and migrations: `✅ All migrations completed`.
3.  Send a message via the frontend. The backend will now automatically use the safe dashboard cookie.
