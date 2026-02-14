# Search Export → CRM Troubleshooting

## What is the Container ID in the logs?

The **Container ID** (e.g. `69958288779732`) is **not in your code**. It is returned by PhantomBuster when you launch a phantom:

1. Your app calls PhantomBuster’s `/agents/launch` API.
2. PhantomBuster starts a run and returns a unique `containerId`.
3. The app uses this ID to poll for completion and fetch results.

Each run gets a new Container ID. To find it in PhantomBuster:

- Open the phantom → **Activity** tab → click a run.
- The ID may appear in the run details or in the URL (e.g. `phantombuster.com/.../containers/69958288779732`).

You can use this ID with **Import by Container ID** to import results from that specific run.

---

## Phantom succeeds but returns 0 leads?

**Cause**: PhantomBuster ran the search and saved results, but the app can't fetch them (S3 403, no resultObject in API response, etc.).

**Fixes**:
1. **Try again** – We now use `/containers/fetch-result-object` to fetch results. Restart the backend and run "Explore Beyond My Network" again.
2. **Check PhantomBuster storage** – PhantomBuster dashboard → your agent → Settings. Ensure "Save to PhantomBuster" / "Save to cloud" is enabled so results are stored.
3. **Import by Container ID** – Run the phantom from the PhantomBuster dashboard. When it finishes, copy the **Container ID** from the run. In your app, use the "Import by Container ID" feature (if available) and paste the ID to import those results.
4. **Export from dashboard** – PhantomBuster dashboard → Results tab → Export CSV. Import that CSV into your app manually.

---

## Phantom launches but doesn't run the search?

**Cause**: PhantomBuster creates a container, but the Search Export phantom needs a **search URL** to know what to search. Without it, it may exit immediately or do nothing.

**Fix**: Add to `backend/.env`:
```env
# Full LinkedIn people search URL (required for phantom to run the search)
SEARCH_EXPORT_DEFAULT_URL=https://www.linkedin.com/search/results/people/?keywords=CEO&origin=GLOBAL_SEARCH_HEADER
SEARCH_EXPORT_DEFAULT_LIMIT=50
```

Edit the URL to your desired search (e.g. change `keywords=CEO` to your target). Restart the backend and try again.

---

## Why am I not getting leads from Search Export into my CRM?

This guide covers both the app's **Contacts list** (internal database) and **external CRM** (HubSpot, etc.).

---

## 1. App's Contacts List (Internal)

Leads are saved to the `leads` table with `source = 'search_export'`. View them at **Contacts** in the app.

### Check backend logs when you run Search Export

When you click **Run Explore Beyond My Network**, watch your backend terminal. You should see:

```
🎯 === SEARCH & IMPORT REQUEST RECEIVED ===
🔵 === STARTING LEAD SEARCH ===
✅ Phantom launched. Container ID: XXXXX
⏳ Waiting for container...
✅ Container finished successfully!
📊 Found X leads
✅ Parsed X valid leads
✅ Save complete: X new, Y duplicates
```

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| **"No leads found"** or `totalLeads: 0` | PhantomBuster returned no data | 1. PhantomBuster dashboard → LinkedIn Search Export agent → **Search URL** and **Number of Results** must be set<br>2. LinkedIn quota may be exhausted (Sales Navigator / Recruiter)<br>3. Phantom may have failed – check PhantomBuster dashboard for the run |
| **"Parsed 0 valid leads"** (but raw entries > 0) | PhantomBuster output format doesn't include LinkedIn URL | Parser needs `profileUrl`, `linkedinUrl`, `url`, or similar. Check logs for "Row 1 - Available fields" – if no URL-like field exists, the phantom output format may differ. Report field names for support. |
| **Saved: 0** (but parsed > 0) | All leads are duplicates | Leads already exist in DB (same `linkedin_url`). They are updated, not re-inserted. Filter Contacts by `source: search_export` to confirm. |
| **Phantom fails with cookie/session error** | LinkedIn not connected in PhantomBuster | PhantomBuster dashboard → Your Search Export agent → **Connect LinkedIn** for this agent |
| **argument-invalid** | Phantom rejects launch args | App sends no args by default. Ensure you're not overriding; try running the phantom once manually from PhantomBuster dashboard first |
| **No result data found** | PhantomBuster S3 storage private / result file missing | Check PhantomBuster dashboard: did the run complete? Is there a result file? Export from dashboard and use **Import by Container ID** as fallback |

---

## 2. External CRM (HubSpot, Salesforce, etc.)

The app can push leads to an external CRM after saving them. This only runs if CRM is configured.

### Required .env variables

```env
CRM_BASE_URL=https://your-crm-api.com
CRM_API_KEY=your_api_key
# Optional – defaults shown:
# CRM_SEARCH_CRITERIA_PATH=/api/search-criteria
# CRM_LEADS_IMPORT_PATH=/api/leads/import
```

### Check if CRM push is running

Backend logs:

- **CRM not configured**: `[CRM] CRM import not configured; skipping push.`
- **CRM configured**: `[CRM] POST https://... (X leads)` and `[CRM] Pushed X leads to CRM.`

### If CRM is configured but leads don't appear

1. Verify `CRM_BASE_URL` and `CRM_API_KEY` (or `CRM_API_TOKEN`).
2. Confirm the CRM import endpoint accepts `{ leads: [...] }` with `linkedin_url`, `first_name`, `last_name`, `title`, `company`, etc.
3. Check backend logs for `[CRM] Failed to push` and any HTTP status/error.

---

## 3. Quick diagnostic

1. Run **Explore Beyond My Network** from Lead Search.
2. Check backend logs for the messages above.
3. In the app: **Contacts** → filter by source `search_export`.
4. If CRM is configured: look for `Pushed X leads to CRM` in logs.

---

## 4. PhantomBuster setup checklist

- [ ] **LinkedIn connected** for the Search Export agent in PhantomBuster
- [ ] **Search URL** set (e.g. `https://www.linkedin.com/search/results/people/?keywords=CEO`)
- [ ] **Number of Results** set (e.g. 100)
- [ ] Agent has run successfully at least once from the PhantomBuster dashboard
- [ ] `SEARCH_EXPORT_PHANTOM_ID` in `.env` matches the agent ID in PhantomBuster
