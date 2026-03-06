# Prompts and logic reference (My Contacts, campaign messages, Settings Analyze)

Use this file as a single reference for how My Contacts scoring works, what prompts drive LinkedIn/Gmail message generation, and how the Settings > LinkedIn preferences **Analyze** button works. No code changes—documentation only.

---

## 1. My Contacts — logic and scoring (no AI prompt)

**What it is:** My Contacts shows leads where `is_priority = true`. There is **no AI prompt**; scoring is **rule-based** in `backend/src/services/preferenceScoring.service.js`.

**Scoring logic:**
- **Preference tiers** come from Settings > LinkedIn preferences: Primary, Secondary, Tertiary each have lists of **titles**, **industries**, and **company_sizes**.
- For each lead we match their **title**, **industry** (resolved from company/title via `INDUSTRY_KEYWORDS`), and **company size** against those lists.
- **Points per dimension (highest match wins):**
  - Title: Primary +50, Secondary +25, Tertiary +10
  - Industry: Primary +40, Secondary +20, Tertiary +10
  - Company size: Primary +20, Secondary +10, Tertiary +0
- **Total** = `preference_score`. **Tier** = highest tier matched (Primary > Secondary > Tertiary). Matching uses normalised text and token overlap (e.g. ≥ 0.5) so "Software Engineer" can match "Engineer".

**My Contacts rule (who gets `is_priority = true`):**
- **Primary** → always `is_priority = true`, `review_status = 'approved'`.
- **Secondary** → `is_priority = true`, `review_status = 'approved'` (no score threshold in code).
- **Tertiary** → `is_priority = false`, `review_status = 'to_be_reviewed'`.

So: **only tier matters** for My Contacts (Primary and Secondary = in My Contacts; Tertiary = not). Score is used for ordering and display; the gate is tier-based.

**When scoring runs:** On lead save/upsert (e.g. import, enrichment), and when user runs Rescore or saves preference settings. `recalculateAllScores()` can assign Primary/Secondary/Tertiary by **dynamic percentile bands** when no preference_tiers are saved (e.g. top 20–40% primary, next 30–50% secondary, rest tertiary).

---

## 2. Campaign messages — LinkedIn and Gmail prompts

**Where:** `backend/src/services/ai.service.js`. Provider/model from env (OpenAI or Claude); same prompts work with either.

**Shared block injected into prompts (natural, non-template tone):**
```text
CRITICAL — SOUND EFFORTLESS AND NATURAL:
- Do NOT default to "Hi [Name]," at the start. Vary your opening every time...
- Reference SPECIFIC details (exact phrase from bio, concrete post topic, real role/company)...
- Sound like you're dropping them a note, not "reaching out"...
- NEVER use: "I recently came across", "Given your interest in", "Would you be interested in learning more"...
TALK TO EACH PERSON DIFFERENTLY... STRUCTURE VARIETY (every message must be different)...
BANNED OPENINGS — do not start with: "That latest product update you shared", "The post you shared"...
```

**LinkedIn connection request** (`generateConnectionRequest`):  
Uses lead + enrichment (bio, interests, recent_posts) + campaign context (goal, type, description, target_audience). Tone/length/focus options (e.g. professional, medium, company). Prompt instructs: one concrete detail, no generic opener, vary first/last sentence. Max ~300 chars for connection note.

**LinkedIn follow-up / message** (`generateFollowUpMessage`):  
Same enrichment + campaign context. Prompt core:
```text
You're a real person writing a LinkedIn follow-up. You know this lead and what you said before. Write something that could only be for THIS person. Natural. Not "following up" in a formal way.
Lead: {full_name} | {title} | {company} + [Profile Bio, Interests, Recent Activity] + [Campaign context]
OPENING: Do NOT start with "Hi [Name]," or "Following up on my last message." Do NOT start with "That/the latest product update you shared"... Use their name only if it fits. PERSONALIZATION: TONE | LENGTH | FOCUS. REQUIREMENTS: One SPECIFIC detail from their profile... Output the FULL message as sent—no "Hi [Name]," prefix, no quotes.
```
Plus `HUMAN_WRITER_BLOCK`. Length targets: short 150–250 chars, medium 400–600, long 500–800.

**Gmail draft** (`generateGmailDraft`):  
Same lead + enrichment + campaign. Prompt core:
```text
You're a real person writing an email to a prospect. You know specific things about them. Write something that could only be for THIS person. Natural—not a template.
Lead: {full_name} | {title} | {company} + [enrichment] + [campaign]
OPENING: Do NOT default to "Hi [Name],". Do NOT start with "That/the latest product update you shared"... Use UNIQUE first line...
REQUIREMENTS: TONE | LENGTH. One CONCRETE detail from their profile.
OUTPUT FORMAT (strict): First line SUBJECT: <subject> then blank line then full email body...
```
Returns `{ subject, body }` for the approval queue.

**Gmail failover / email outreach** (`generateEmailFailover`, `generateEmailOutreach`):  
Shorter prompts: follow-up via email after LinkedIn, or cold email with one concrete detail; 120–200 words, no generic openings; output only body (or body + subject where applicable).

**Fallbacks (no AI):** Connection: `Saw your work at {company} and the bit about {bio} — would be great to connect.` Message: `Quick follow-up—saw your stuff on {company}. Would be good to connect when you have a sec.`

---

## 3. Settings > LinkedIn preferences — Analyze button (no AI; static pools)

**What it does:** User enters LinkedIn profile URL and clicks **Analyze**. The app suggests values to fill **Primary**, **Secondary**, and **Tertiary** (titles, industries, company_sizes).

**Logic (no LLM):**  
`backend/src/controllers/preferences.controller.js` → `analyzeProfileForPreferences`.

1. **Fetch profile** from the URL via `profileEnrichment.service.enrichProfileFromUrl(url)` → gets `title`, `industry`, `company`, `companySize`.
2. **Static pools** (same for every user):
   - **Titles:** `['CEO', 'CTO', 'CFO', 'Director', 'Manager', 'VP', 'Founder', 'Head of', 'Lead', 'Engineer', 'Analyst', 'Consultant', 'Specialist']`
   - **Industries:** `['Technology, Information and Media', 'Financial Services', 'Professional Services', 'Manufacturing', 'Retail', 'Education', 'Hospitals and Health Care', 'Marketing & Advertising', 'Construction', 'Real Estate and Equipment Rental Services', 'Other']`
   - **Company sizes:** `['1-10', '11-50', '51-200', '201-500', '500+']`
3. **Primary:** Start from profile (user’s title, industry, company size). Ensure 3–5 items per category by **filling from the static pools**; prefer pool items that match the profile (e.g. profile title "Software Engineer" → prefer "Engineer" in pool).
4. **Secondary:** Pick 4 items per category from the **same pools**, excluding anything already in Primary.
5. **Tertiary:** Pick 4 per category from the pools, excluding Primary + Secondary.
6. **No value is repeated** across tiers (dedup by normalised string).

So: **suggestions are not dynamic AI**. They are the **user’s own profile** (for Primary) plus **fixed title/industry/size lists**. The only “personalisation” is (a) using the profile to seed Primary and (b) preferring pool entries that overlap with profile text when filling. To make it dynamic you’d need an LLM call that suggests titles/industries/sizes from the profile; currently it’s rule-based + static pools only.

---

## Quick reference

| Feature            | Uses AI? | Where                                      |
|--------------------|----------|--------------------------------------------|
| My Contacts        | No       | `preferenceScoring.service.js` (rules only)|
| LinkedIn messages  | Yes      | `ai.service.js` (generateFollowUpMessage etc.) |
| Gmail drafts       | Yes      | `ai.service.js` (generateGmailDraft)       |
| Settings Analyze  | No       | `preferences.controller.js` (pools + profile) |
