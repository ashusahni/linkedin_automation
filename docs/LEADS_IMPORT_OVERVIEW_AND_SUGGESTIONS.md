# Leads Import: Analysis, Overview & Suggestions

This document answers your questions about imported leads vs Phantom leads, structure, campaign behavior, and whether all imports are saved. It also suggests aligning import format with PhantomBuster so there are no conflicts.

---

## 1. Are all imported leads being saved in the database?

**Yes, with these rules:**

| Source | What gets saved | Duplicates |
|--------|------------------|------------|
| **CSV import** | Every row that has a valid `linkedin_url` is either **inserted** (new) or **updated** (existing same `linkedin_url`). Rows without `linkedin_url` are **not** saved and are counted as errors. | Same `linkedin_url` → update existing row; "saved" count = new inserts only. |
| **Excel import** | Same as CSV: required field is `linkedin_url`. Rows with it go to `saveLead()`; rest are errors. | Same as CSV. |
| **Phantom (connections_export / search_export)** | Parsed rows with a LinkedIn URL are saved via `saveLead()` with `source = 'connections_export'` or `'search_export'`. | Deduplication by `linkedin_url` (ON CONFLICT DO UPDATE). |

So: **every row you import that has a valid LinkedIn URL is stored** (either as a new lead or as an update to an existing one). Rows missing `linkedin_url` are rejected and reported in `errors` / `errorDetails`.

---

## 2. Why Phantom leads “work” in campaigns and imported ones can be “hard”

### How campaigns use leads

- Campaign **launch** loads **pending** campaign_leads from the DB (with `linkedin_url`, `first_name`, `connection_degree`, etc.).
- **Auto Connect (Phantom):** receives an array of profiles and sends `profileUrls = profiles.map(p => p.linkedin_url)` to Phantom. So it only needs **`linkedin_url`** on each lead.
- **Message Sender (Phantom):** for each lead we build a **spreadsheet URL** (our backend serves a small CSV) via `buildSpreadsheetOptions(linkedinUrl, message)`. Again, **`linkedin_url`** is the key.

So **any lead in the DB with a valid `linkedin_url` can be used in campaigns** — both Auto Connect and Message Sender. Source (Phantom vs CSV/Excel) does not change that in code.

### Where the “heavy problem” can come from

1. **`connection_degree`**
   - Campaign logic: if `connection_degree` looks like **1st** → **only Message Sender** (no Auto Connect).
   - If it’s 2nd/3rd or **missing** → lead goes to **Auto Connect** (connection request) and then optionally Message Sender.
   - **Imported leads often have no or wrong `connection_degree`.** Then they’re all treated as “non‑1st” and sent to Auto Connect. If they are actually 1st connections, that can fail or behave badly. Phantom exports usually have a clear “Connection Degree” (or similar) column.

2. **LinkedIn URL format**
   - Import uses `normalizeLinkedInUrl()` so URLs are consistent. Phantom parser already normalizes. If your CSV/Excel has non‑standard URLs (e.g. without `https://` or with extra query params), some rows might still be rejected or mis-handled if they don’t end up with a clean `linkedin_url` in DB.

3. **Phantom “source” (1st connections CSV / spreadsheet)**
   - In Phantom’s UI you can select a **source** (e.g. “1st connections CSV” from their database or a **spreadsheet**). When **we** run a campaign from our app, we **do not** use Phantom’s saved source. We pass **our own list**: the campaign’s pending leads from **our** DB, as `profileUrls` (and for messages, our backend’s CSV URL). So there is **no conflict** between “Phantom’s spreadsheet” and “our CRM”: for campaigns launched from the app, **our CRM is the source**. Using a “spreadsheet” in Phantom for campaigns would mean Phantom reading from a URL we give it; we already do the equivalent by passing the list from our DB and, for Message Sender, a CSV URL we serve. So the real fix is making **our** data (especially `connection_degree` and `linkedin_url`) correct for every lead, not switching Phantom’s source.

---

## 3. Structure: Phantom vs CSV/Excel import

### Phantom (phantomParser.js → leadPipeline → saveLead)

- **Input:** Phantom export (CSV/JSON) with columns such as:
  - `profileUrl` / `linkedinProfileUrl` / `LinkedIn URL` / `profile_url` / …
  - `firstName`, `lastName`, `fullName`, `title`, `headline`, `company`, `location`, `connectionDegree` / `connection_degree` / `Connection Degree`, etc.
- **Output:** CamelCase lead object (`linkedinUrl`, `firstName`, `lastName`, `connectionDegree`, …) plus `source` and `reviewStatus: 'to_be_reviewed'`.
- **DB:** `lead.service.js` maps camelCase → DB columns (`linkedin_url`, `first_name`, `connection_degree`, …).

### CSV/Excel import (lead.controller.js)

- **Template headers:**  
  `linkedin_url`, `full_name`, `first_name`, `last_name`, `title`, `company`, `location`, `email`, `phone`, `connection_degree`
- **Parsing:** `getRecordVal()` accepts several aliases (e.g. `linkedin_url` / `linkedinUrl` / `profileUrl` / `LinkedIn URL`). So we already accept **Phantom‑style column names** in imports.
- **Built object:** camelCase for `saveLead()`: `linkedinUrl`, `firstName`, `lastName`, `source: 'csv_import'` or `'excel_import'`, `connectionDegree` (normalized).

So structurally, **imports and Phantom both end up in the same `leads` table** with the same fields. The main gaps for imported leads are often **missing or inconsistent `connection_degree`** and, sometimes, **URL format**.

---

## 4. Suggestion: align import format with PhantomBuster

To avoid “conflict” and make imported leads behave like Phantom leads in campaigns:

### A. Use the same “shape” as Phantom exports

- **Recommended import columns** (you can keep these as the canonical template and still accept Phantom names via `getRecordVal`):
  - **Profile URL** (or `linkedin_url`, `linkedinUrl`, `profileUrl`) — **required**
  - **First Name**, **Last Name**, **Full Name**
  - **Headline** (or `title`, `jobTitle`) — maps to `title` in DB
  - **Company**
  - **Location**
  - **Connection Degree** — **critical**: `1st` / `2nd` / `3rd` (or normalized equivalent) so campaigns route correctly (1st → message only; 2nd/3rd → Auto Connect + message).
  - **Email**, **Phone** (optional)

- **Normalize `connection_degree`** on import exactly like Phantom:
  - Your code already has `normalizeConnectionDegree()` in the import path. Ensure it accepts the same values Phantom exports (e.g. “1st”, “2nd”, “3rd”, “First”, “Second”, “1st degree”, etc.) and stores one canonical form (e.g. `1st` / `2nd` / `3rd`).

### B. Optional: Phantom-style export then re-import

- Export “1st connections” (or any list) from Phantom in their CSV format.
- Re-import that CSV into your app. Your parser already accepts many Phantom column names; adding **Profile URL** and **Connection Degree** (and any other Phantom headers you use) to the template and to `getRecordVal` alternates ensures **one format** for both Phantom and manual CSV/Excel and no structural conflict.

### C. Ensure every imported lead has `connection_degree`

- In the UI or template, make **Connection Degree** a first-class field (required or strongly recommended).
- In import logic, if the column is missing, you could default to e.g. `2nd` so they go through Auto Connect instead of being treated as 1st (or the opposite, depending on your main use case). Prefer explicit value over “unknown” so campaign logic is predictable.

---

## 5. Short answers to your points

| Your point | Answer |
|------------|--------|
| “Leads from Phantom are easy to use in campaigns; imported are hard” | Campaign code uses **any** lead in DB with `linkedin_url`. The main difference is **`connection_degree`** (and sometimes URL format). Fix that on import and behavior matches Phantom. |
| “In Phantom we select a source (1st connections CSV / spreadsheet)” | When **we** launch a campaign from the app, we don’t use Phantom’s saved source. We send **our** list (campaign leads from our DB). So we can “send messages / auto connect” to **any leads in our CRM**; no need to change Phantom’s source for that. |
| “Use spreadsheet for campaign to send to anyone in CRM” | We already do the equivalent: campaign = list of leads from CRM; we pass that list to Phantom (and for messages we serve a CSV URL). Making imported leads have the same structure (especially `connection_degree`) is what’s needed. |
| “Change format of imported leads to match Phantom so no conflict” | **Recommended.** Use the same column names/aliases and normalization (especially **Connection Degree** and **Profile URL**). Your import already accepts many Phantom-style names; extend template and alternates to match Phantom’s export exactly and normalize `connection_degree` the same way. |
| “Are all leads from imports saved?” | **Yes.** Every row with a valid `linkedin_url` is saved (insert or update by `linkedin_url`). Rows without it are not saved and are reported as errors. |

---

## 6. Suggested code-level changes (concise)

1. **Import template**  
   Add Phantom-style headers as alternates in the template (e.g. **Profile URL**, **Connection Degree**, **Headline**) and in `getRecordVal()` so that a Phantom export CSV can be dropped in without column mapping.

2. **`connection_degree`**  
   - In CSV/Excel import, always parse and normalize `connection_degree` (reuse or mirror Phantom normalization).  
   - If missing, consider a default (e.g. `2nd`) and optionally log “missing connection_degree” for reporting.

3. **Docs**  
   Add a short “Import format” section that says: “For best results and to match Phantom, include **Profile URL** (or linkedin_url), **Connection Degree** (1st/2nd/3rd), **First Name**, **Last Name**, **Company**, **Headline** (or title).”

4. **Validation**  
   Optionally, on import, warn when `connection_degree` is missing so users know campaign behavior (Auto Connect vs message-only) may be wrong until they fix it.

Once imported leads have the same structure and `connection_degree` as Phantom leads, they will behave the same in campaigns (no structural conflict, and correct routing between Auto Connect and Message Sender).
