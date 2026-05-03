# Client onboarding — information and access we need from you

This document lists what your team should provide so we can configure, run, and maintain the LinkedIn automation platform. For each item we include a short **reason** so stakeholders understand why it is required.

---

## 1. PhantomBuster (LinkedIn automation)

**What we need**

- PhantomBuster **API key** (from your PhantomBuster account).
- **Phantom IDs** for each automation you use (from the PhantomBuster dashboard — each “phantom” has a numeric ID). Typical examples in this project:
  - LinkedIn Search Export (lead search)
  - Connections Export
  - Profile Scraper (if used for enrichment)
  - Message Sender / outreach
  - Auto Connect / network growth
  - LinkedIn Auto Poster (scheduled posts), if you use content posting

**Reason**

PhantomBuster runs the browser automations that interact with LinkedIn on your behalf (search, export, connect, message, post). Without your API key and the correct phantom IDs, the backend cannot launch or monitor those jobs.

---

## 2. LinkedIn session (secure)

**What we need**

- A valid **LinkedIn session cookie** (or your agreed process to refresh it), associated with the LinkedIn account that will perform automation.
- Optionally: **LinkedIn profile URL** for the active account, **preferred company keywords**, and safe **daily limits** (e.g. connection invites) aligned with your risk tolerance.

**Reason**

Phantoms authenticate as your LinkedIn user. The session cookie is how PhantomBuster acts as that account. Limits and targeting settings keep behavior within LinkedIn’s norms and your compliance rules.

---

## 3. Hunter.io (email discovery / verification)

**What we need**

- **Hunter API key** from [hunter.io](https://hunter.io).

**Reason**

When we enrich leads, Hunter is used to find and verify professional email addresses from public signals (domain + name, etc.). Without it, email enrichment for outbound steps may be limited or disabled.

---

## 4. Google Sheets

**What we need**

- **Google Cloud service account** credentials as a JSON key file (we store it securely on the server and point the app to it via `GOOGLE_SHEETS_CREDENTIALS_PATH`, or we use the path you provide).
- **Spreadsheet IDs** for:
  - The main sheet used by the app (e.g. content / sync — `GOOGLE_SHEET_ID`).
  - The **LinkedIn search / lead source** sheet (`LINKEDIN_SEARCH_SHEET_ID`), if you use sheet-driven searches.
- You (or we on your behalf) must **share each spreadsheet** with the service account email from the JSON as **Editor**.

**Reason**

Sheets are used to configure searches, sync data, or manage content pipelines. The service account must have Editor access because the application reads and writes rows programmatically via the Google Sheets API.

**Lead source sheet columns** (for the search sheet): title, search, industry, country, connection_degree, status, created_at, limit — on the tab the integration expects (e.g. `Sheet1`), unless we agree a different layout.

---

## 5. Transactional email (SendGrid or AWS SES)

**What we need**

**Option A — SendGrid (common default)**

- **SendGrid API key** with permission to send mail.
- **Sender email** (`SENDER_EMAIL`) that is **verified** in SendGrid (single sender or domain authentication).

**Option B — Amazon SES**

- AWS **access key**, **secret key**, **region**, and a **verified** sender identity in SES.

**Reason**

The platform sends notifications and campaign-related email through the configured provider. Unverified senders or missing keys cause bounces or API failures.

---

## 6. AI providers (message and content generation)

**What we need**

- At least one of:
  - **OpenAI API key** (and preferred model, e.g. GPT-4o), and/or  
  - **Anthropic API key** (Claude), if you use Claude as the provider.
- Your choice of **default provider** (`AI_PROVIDER`: `openai` or the Anthropic path as configured).

**Reason**

AI is used for drafting messages, personalizing outreach, and content workflows. Keys must belong to your org for billing and data-policy alignment.

---

## 7. Database

**What we need**

- **PostgreSQL connection string** (`DATABASE_URL`) for the environment we deploy to (staging / production), or confirmation that we host the database for you under your agreement.
- SSL preferences if your host requires them (`DB_SSL`, pool settings as needed).

**Reason**

Leads, campaigns, preferences, and run history are persisted in PostgreSQL. Without a reachable database the API cannot store state.

---

## 8. Public URL for the backend (webhooks and callbacks)

**What we need**

- A stable **`BACKEND_PUBLIC_URL`** (HTTPS), e.g. your production API URL or a tunnel URL during testing (such as ngrok), configured to reach the Node server port you use in production.

**Reason**

Some flows (PhantomBuster callbacks, external integrations) expect the backend to be reachable from the internet. A wrong or missing URL breaks those callbacks.

---

## 9. Branding and product settings (optional but recommended)

**What we need**

- Display **name**, **company name**, **logo URL** (or assets we can host), **theme**, **profile image URL** for the app shell, if you want the UI to match your brand.

**Reason**

These map to environment-driven branding in the settings UI so end users see your identity, not placeholders.

---

## 10. CRM integration (optional)

**What we need**

If you connect an external CRM:

- **Base URL**, **API key or token**, and documented paths for search criteria and lead import (or the exact env names your deployment uses: `CRM_BASE_URL`, `CRM_API_KEY`, etc.).

**Reason**

Optional sync of leads or criteria from your CRM into the automation pipeline.

---

## 11. GitHub and “posting” — clarify scope

**In this codebase**, **LinkedIn posting** is handled via **PhantomBuster** (e.g. LinkedIn Auto Poster phantom), not via the GitHub API.

**What we might still need from you regarding GitHub**

- Access to the **repository** (read or write per our agreement) if we deploy from GitHub Actions or you want PR-based releases.
- Any **secrets** configured in GitHub Actions for CI/CD (mirrors the variables above, never committed to the repo).

**Reason**

GitHub is for source control and deployment automation; LinkedIn content delivery itself goes through PhantomBuster + your LinkedIn session as configured above.

---

## 12. Security and handoff checklist

- Prefer **dedicated** API keys per environment (staging vs production).
- **Rotate** any key that was ever pasted in chat, email, or a ticket; share secrets through a **password manager** or your company’s secret store.
- Confirm **who** owns billing for PhantomBuster, Hunter, SendGrid, OpenAI/Anthropic, Google Cloud, and hosting.

---

## Summary table

| Area              | You provide                                      | Used for                                      |
|-------------------|--------------------------------------------------|-----------------------------------------------|
| PhantomBuster     | API key, phantom IDs                             | LinkedIn automations (search, DM, connect, post) |
| LinkedIn          | Session cookie, profile URL, limits              | Authentication and safe daily caps            |
| Hunter.io         | API key                                          | Email find / verify                           |
| Google Sheets     | Service account JSON, sheet IDs, share Editor    | Lead sources, sync, content sheets            |
| SendGrid / SES    | API keys, verified sender                        | Outbound / system email                       |
| OpenAI / Anthropic| API keys, provider choice                        | AI copy and personalization                   |
| PostgreSQL        | `DATABASE_URL`                                   | Application data                              |
| Public URL        | `BACKEND_PUBLIC_URL`                             | Webhooks and external callbacks               |
| Branding          | Names, logos, theme (optional)                   | UI white-label                                |
| CRM               | URL + token (optional)                           | CRM sync                                      |
| GitHub            | Repo access / CI secrets (as agreed)             | Code and deployment, not LinkedIn API itself  |

---

If you want this turned into a **one-page PDF** or a **form** for your client to fill in, say the word and we can produce a shortened version or a fillable checklist.
