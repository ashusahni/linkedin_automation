# What we need from you — essentials only

Short checklist of **client-provided** items for email enrichment, sheets, outbound email, and repository access.

---

## 1. Hunter.io — API key

**Provide:** Your Hunter.io **API key** (from the Hunter dashboard).

**Why:** The platform uses Hunter’s API to **enrich leads with professional email addresses** (find / verify from public business data). Without the key, that enrichment step cannot run.

---

## 2. Google Sheets

**Provide:**

| Item | What it is |
|------|------------|
| **Service account JSON** | A Google Cloud **service account key** file (JSON). We install it on the server (path configured as `GOOGLE_SHEETS_CREDENTIALS_PATH`) — do not email the raw file in plain text if you can avoid it; use a secure channel. |
| **Sheet IDs** | The ID from each spreadsheet URL (`.../d/<SHEET_ID>/edit`). We need at least the **lead source / search** sheet ID (`LINKEDIN_SEARCH_SHEET_ID`), and any other sheet ID we agreed for sync (`GOOGLE_SHEET_ID`). |
| **Sharing** | In each spreadsheet: **Share → Editor** with the **service account email** shown in the JSON (`client_email`). Without Editor access, the API cannot read or update rows. |

**Lead source sheet — column layout (first tab `Sheet1`, row 1 = headers)**

| Column | Field | Notes |
|--------|--------|--------|
| A | title | Display name for this lead source |
| B | search | LinkedIn search string |
| C | industry | Industry filter (if used) |
| D | country | Country filter (if used) |
| E | connection_degree | e.g. `2nd` |
| F | status | e.g. `pending` / workflow status |
| G | created_at | Timestamp |
| H | limit | Max results (number) |

**Why:** Google Sheets is the **source of truth** for configurable lead searches and related data. The app talks to Google **only through the API**, using that JSON identity — so the sheet must be shared with that identity.

---

## 3. SendGrid — API + verified “from” emails

**Provide:**

1. **SendGrid API key** with permission to send email.  
   **Why:** SendGrid is the **API we call to send mail** (notifications, sequences, system messages). The key is how our server authenticates to SendGrid.

2. **Sender email address(es)** you want mail to come **from** (e.g. `noreply@yourdomain.com`, `outreach@yourdomain.com`).  
   **Why:** SendGrid (and mailbox providers) require **verified sender identities**. Each address or domain must be verified in SendGrid before mail delivers reliably.

**Typical env mapping:** `SENDGRID_API_KEY`, `SENDER_EMAIL` (primary “from”; additional addresses if we configure more templates).

---

## 4. GitHub

**Provide:** Access to the **repository** (and, if we deploy from GitHub, **Actions secrets** or your process for injecting API keys — never committed in code).

**Why:** So we can collaborate on code, review changes, and optionally run **CI/CD** from your org’s repo. GitHub is **not** the system that sends email or enriches contacts; it holds **source and deployment configuration** only.

---

## Quick copy checklist

- [ ] Hunter.io API key  
- [ ] Google service account JSON + both sheet IDs + sheets shared (Editor) to service account email  
- [ ] Lead source sheet uses columns A–H as above on `Sheet1`  
- [ ] SendGrid API key + verified sender email(s)  
- [ ] GitHub repo access (and CI secrets if applicable)  

---

*This document replaces a full platform list — only the items above are in scope here.*
