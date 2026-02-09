# CRM Search Run – Automated LinkedIn Search Flow

When a user runs a search in your CRM (or in this app), the flow:

1. **Get search criteria** – From your CRM API (industry, location, job title, company) or from the request body.
2. **Build LinkedIn URL** – Generated dynamically from criteria (same logic as the Lead Search page).
3. **Run PhantomBuster** – LinkedIn Search Export phantom (`SEARCH_EXPORT_PHANTOM_ID`) runs the search and exports results.
4. **Save to database** – Leads are parsed and saved with source `search_export`.
5. **Push to CRM** – If configured, results are sent back to your CRM via its API.

## Authentication

- **PhantomBuster**: Uses `PHANTOMBUSTER_API_KEY` and `SEARCH_EXPORT_PHANTOM_ID` from `.env`. LinkedIn session is from `LINKEDIN_SESSION_COOKIE` or PhantomBuster dashboard.
- **CRM**: Uses `CRM_BASE_URL` and `CRM_API_KEY` (or `CRM_API_TOKEN`). Optional `CRM_AUTH_HEADER=Bearer` for Bearer token; otherwise `X-API-Key` is sent.

## Endpoint

**POST** `/api/phantom/crm-search-run`

**Request body (optional):**

```json
{
  "criteria": {
    "title": "CEO",
    "jobTitle": "CTO",
    "industry": "Technology",
    "location": "San Francisco",
    "company": "Acme",
    "keywords": "SaaS"
  },
  "limit": 50
}
```

- If **no body** (or no `criteria`) and CRM is configured: backend fetches criteria from CRM (`GET CRM_BASE_URL + CRM_SEARCH_CRITERIA_PATH`).
- If **body.criteria** is provided: used as-is to build the LinkedIn URL.
- `limit`: optional cap for number of profiles (PhantomBuster `numberOfProfiles`).

**Response:**

```json
{
  "success": true,
  "message": "CRM search run completed",
  "criteria": { ... },
  "linkedInUrl": "https://www.linkedin.com/search/results/people/?keywords=...",
  "query": "CEO Technology San Francisco at Acme SaaS",
  "totalLeads": 50,
  "savedToDatabase": 48,
  "duplicates": 2,
  "pushedToCrm": 48,
  "csvFile": "linkedin_leads_....csv",
  "csvPath": "..."
}
```

## Environment (CRM)

| Variable | Description |
|----------|-------------|
| `CRM_BASE_URL` or `CRM_API_URL` | Base URL of your CRM API (e.g. `https://api.yourcrm.com`) |
| `CRM_API_KEY` or `CRM_API_TOKEN` | API key for auth |
| `CRM_SEARCH_CRITERIA_PATH` | Path for GET search criteria (default: `/api/search-criteria`) |
| `CRM_LEADS_IMPORT_PATH` | Path for POST leads import (default: `/api/leads/import`) |
| `CRM_AUTH_HEADER` | Optional: `Bearer` to send key as `Authorization: Bearer <key>`; otherwise `X-API-Key: <key>` |

**CRM criteria GET** should return an object with any of: `industry`, `location`, `jobTitle`, `title`, `company`, `keywords`.

**CRM import POST** receives `{ "leads": [ { "linkedin_url", "first_name", "last_name", "full_name", "title", "company", "location", "profile_image", "source" }, ... ] }`.

## Error handling

- **502** `CRM_CRITERIA_FAILED`: CRM is configured but fetching criteria failed.
- **400** `MISSING_CRITERIA`: No criteria in body and CRM not configured (or returned empty).
- PhantomBuster errors (429 quota, 404 agent, etc.) are returned with the same codes and messages as other phantom endpoints.

## Logging

Each step is logged with the `[CRM-Search]` and `[CRM]` prefixes so you can trace: criteria resolution, LinkedIn URL, PhantomBuster launch, DB save, and CRM push.
