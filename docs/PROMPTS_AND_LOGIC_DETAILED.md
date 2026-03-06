# Prompts and Logic — Detailed Reference

Single reference for **exact prompts in use** and **step-by-step logic** for My Contacts scoring, campaign message generation (LinkedIn + Gmail), and Settings → LinkedIn preferences **Analyze**. No code changes—documentation only.

**Source files:**
- `backend/src/services/ai.service.js` — all AI prompts
- `backend/src/services/preferenceScoring.service.js` — My Contacts scoring
- `backend/src/controllers/preferences.controller.js` — Analyze endpoint
- `backend/src/config/industries.js` — industry resolution for scoring

---

## 1. My Contacts — Detailed Logic (No AI)

### 1.1 Overview

- **My Contacts** = leads where `is_priority === true` (filtered in `lead.controller.js`).
- **No AI or prompts.** All logic is in `preferenceScoring.service.js`.
- Scoring uses **preference_tiers** from Settings (Primary / Secondary / Tertiary) with lists of **titles**, **industries**, **company_sizes**.

### 1.2 Data Flow

1. **Preferences**  
   User saves LinkedIn preferences → `preference_tiers` stored (e.g. Primary titles: `["CEO","CTO"]`, industries: `["Technology, Information and Media"]`, company_sizes: `["51-200"]`). Same structure for Secondary and Tertiary.

2. **Per-lead inputs**  
   For each lead we use:  
   - `lead.title`  
   - `lead.company`, `lead.title` → resolved to one **industry** via `resolveIndustry(company, title)`  
   - `lead.company_size` (e.g. `"51-200"`)

3. **Industry resolution** (`resolveIndustry`)  
   - `text = normalise(company + " " + title)`.  
   - `normalise(s)`: lowercase, strip non-alphanumeric, collapse spaces.  
   - Loop over `INDUSTRY_KEYWORDS` (from `config/industries.js`). Each key is an industry name, value is array of keywords.  
   - If `text` includes any keyword (after normalise), return that industry.  
   - Else return `null`.

4. **Matching (any dimension)**  
   `matchesAny(leadValue, list)`:
   - Normalise lead value and each list item.
   - Match if: exact equality, or one string contains the other, or **token overlap ≥ 0.5** (tokens = words after normalise; overlap = fraction of lead tokens that appear in list item).
   - So e.g. "Software Engineer" can match "Engineer" in the list.

### 1.3 Score per dimension

**Fixed points (TIER_SCORE):**

| Dimension     | Primary | Secondary | Tertiary |
|--------------|---------|-----------|----------|
| Title        | 50      | 25        | 10       |
| Industry     | 40      | 20        | 10       |
| Company size | 20      | 10        | 0        |

**Logic:**  
For each dimension we check **Primary first**, then **Secondary**, then **Tertiary**. First list that matches wins; no double-counting.  
Example: lead title "CTO" in Primary titles → +50, tier for title = primary.  
Total **score** = title points + industry points + company_size points.  
**Tier** = highest tier among the three (primary > secondary > tertiary).

### 1.4 Who gets into My Contacts

`applyPriorityRule(score, tier, prefs, overrideIsPriority)`:

- `is_priority = (tier === 'primary' || tier === 'secondary')`.  
  **No minimum score.** Tertiary leads are never priority by tier.
- If `overrideIsPriority !== null`, that value overrides.
- `review_status = is_priority ? 'approved' : 'to_be_reviewed'`.

So: **only tier decides My Contacts.** Score is for ordering/display; the gate is Primary or Secondary tier.

### 1.5 When scoring runs

- On lead save/upsert (e.g. import, enrichment): `scoreAndClassifyLead(lead)` → `calculateScore` + `applyPriorityRule` → DB update.
- When user saves preferences or runs **Rescore**: `recalculateAllScores()`.

### 1.6 Recalculate when no tier criteria are saved

If **no** preference_tiers lists are filled (or all empty):

- **Score** = `defaultQualityScore(lead)`: title +30, company +30, email +20, phone +20 (profile completeness only).
- **Tier** = by **rank**: all leads sorted by score desc, then **dynamic percentile bands**:
  - Primary: top ~20–40% (random band each run),
  - Secondary: next ~30–50%,
  - Tertiary: rest.
- Then same `applyPriorityRule`: Primary/Secondary → My Contacts.

If user **has** saved tier criteria: every lead is scored with `calculateScore`; matched tier or else `tertiary`; then `applyPriorityRule`.

---

## 2. AI Prompts in Use — Verbatim and Structure

**Provider/model:** Read from env on each call (`AI_PROVIDER`, `OPENAI_MODEL`, `CLAUDE_MODEL`). Fallback: if primary fails, try the other (OpenAI ↔ Claude).

### 2.1 Shared block: HUMAN_WRITER_BLOCK

Injected into connection request, follow-up, Gmail draft, and email outreach prompts.

```
CRITICAL — SOUND EFFORTLESS AND NATURAL:
- Do NOT default to "Hi [Name]," at the start. Vary your opening every time: start with a direct observation, a question, a single line that hooks, or dive straight in—like a DM or a note you'd actually send. Use their name only if it fits naturally (middle or end of message), or don't use it at all.
- You've read their profile. Reference SPECIFIC details (exact phrase from bio, concrete post topic, real role/company)—not "your expertise" or "your work."
- Sound like you're dropping them a note, not "reaching out" or "hoping to connect." Short sentences. Occasional fragment. No buildup, no formal outreach tone.
- NEVER use: "I recently came across", "Given your interest in", "Would you be interested in learning more", "It's impressive to see", "could provide valuable insights", "Your expertise would be a tremendous addition", "I'd love to connect" without a concrete reason first, "I hope this message finds you well", "I'd love to hear your thoughts" as a standalone closer.

TALK TO EACH PERSON DIFFERENTLY (like a human would):
- When you write to multiple people, each message must feel like it was written for that person only. Use a different THEME (e.g. one message leans on their company, another on a post, another on their role), a different WAY of addressing them (question vs observation vs fragment), and different WORDING—never the same opener, angle, or closer. No two messages should sound like the same template. Imagine you're texting five different people: you naturally vary how you start, what you focus on, and how you end.

STRUCTURE VARIETY (every message must be different):
- BANNED OPENINGS — do not start with: "That latest product update you shared", "The latest product update you shared", "That post you shared", "The post you shared", "Your recent post", "That [X] you shared", "The [X] you shared". Each message must have a UNIQUE first sentence—never reuse the same opener pattern.
- Vary your FIRST sentence: use a question, or a short observation (different wording every time), or a contrast, or a single detail that's specific to them. Invent a fresh opener for this person only.
- Vary your LAST sentence: don't always end with "Let me know if you're up for a chat" or "Would love to chat more" or "Thought it might be interesting for you". Mix: a question, a soft invite, an open-ended line, or a brief sign-off. Different structure and wording every time.
- Vary sentence length and rhythm: some messages use more short punchy sentences; others flow in longer lines. No two messages should feel like the same template.
```

### 2.2 LinkedIn connection request — `generateConnectionRequest`

**When:** Generating the connection note (max 300 chars for short, up to 600 for long).

**Inputs:** `lead` (full_name, first_name, title, company), `enrichment` (bio, interests, recent_posts), `options`: tone, length, focus, campaign, optional `batchContext` (index, total).

**Prompt (structure; variables in angle brackets):**

```
You're a real person sending a LinkedIn connection note. You know this profile—write something that could only be for THIS person. Sound natural. Not like a template or "outreach."

Lead: <lead.full_name> | <lead.title> | <lead.company>
<enrichmentContext: Profile Bio, Interests/Skills, Recent Activity/Posts>
<campaignContext: Campaign Goal, Type, Description, Target Audience>
<batchUniquenessBlock if batchContext.total > 1: "BATCH CONTEXT — YOU ARE WRITING MESSAGE N OF M...">
<uniquenessAngle if batch: "For THIS message only, prefer: [one of 4 angle hints]">

<HUMAN_WRITER_BLOCK>

OPENING (important): Do NOT start with "Hi [Name],". Do NOT start with "That/the latest product update you shared" or "That/the post you shared" or any "[That/The] [thing] you shared"—those make every message look the same. For THIS person only, pick ONE opening style and make the first sentence unique:
- Option A: Start with a question (about their work, their company, or something from their profile).
- Option B: Start with a one-line observation—but phrase it in a completely different way (e.g. reference their role, a line from their bio, or their company—not "the update you shared").
- Option C: Start with a short fragment or a contrast (e.g. "Supply chain at Cemex—tough space to innovate in." or "Pohang's been on my radar for a while.").
- Option D: Dive straight into one specific detail with unexpected wording.
Use their first name (<lead.first_name>) only if it fits naturally—or omit it. The goal is this message could never be confused with another: different first sentence, different flow, different last sentence.

CLOSING: Do not repeat the same closer every time. Vary: a question, a soft "if you're ever up for it", a one-word sign-off, or an open-ended line. No "Let me know if you're up for a chat" or "Would love to chat more" as default—pick something that fits this message only.

PERSONALIZATION: TONE <toneInstructions[tone]> | LENGTH <lengthInstructions[length]> | FOCUS <focusInstructions[focus]>

RULES:
1. One CONCRETE detail from their profile (quote from bio, specific post topic, or real role/company). If you mention a post or "product update", do NOT start the message with it—weave it in later or open with something else (question, role, company, or a different angle).
2. Why them—in one or two sentences. Then a brief, low-key ask. No over-the-top closing. Last sentence must be different from generic "Let me know if you're up for a chat" / "Would love to chat more."
3. <If campaign: 'Weave in campaign goal only if it fits naturally.'>
4. NO emojis. Output the FULL message as the reader will see it—no "Hi [Name]," prefix, no quotes.
```

**Tone map:** professional | friendly | casual | formal | warm (each has one-line instruction).  
**Length:** short 2–3 sentences / 150–250 chars; medium 3–5 / 400–600; long 4–6 / 500–600.  
**Focus:** recent_post | company | role | mutual_connection | general.  
**Fallback (no AI):** If enrichment.bio: `Saw your work at {company} and the bit about {bioSnippet} — would be great to connect.` Else: `Your work at {company} caught my eye—would like to connect.`

---

### 2.3 LinkedIn follow-up message — `generateFollowUpMessage`

**When:** Campaign step type message or follow_up; can include previous messages.

**Prompt (structure):**

```
You're a real person writing a LinkedIn follow-up. You know this lead and what you said before. Write something that could only be for THIS person. Natural. Not "following up" in a formal way.

Lead: <lead.full_name> | <lead.title> | <lead.company>
<enrichmentContext>
<campaignContext>
<batchUniquenessBlock if batch>
<uniquenessAngle if batch>

<If previousMessages.length > 0: "What you already sent:\n<joined previous messages>\n\nBuild on it naturally—don't repeat it.">

<HUMAN_WRITER_BLOCK>

OPENING: Do NOT start with "Hi [Name]," or "Following up on my last message." Do NOT start with "That/the latest product update you shared" or "That/the post you shared" or any "[That/The] [thing] you shared". For THIS lead only, choose a UNIQUE first sentence:
- A question (about something they did or posted).
- A one-line observation phrased in a completely different way (e.g. their role, company, or a specific line from their bio—not "the update you shared").
- A short fragment or a new angle on their work.
Use their name (<lead.first_name>) only if it fits, or skip it. This message must have a different structure and different last line than any other—vary your closing too (question vs soft invite vs open-ended).

PERSONALIZATION: TONE <...> | LENGTH <...> | FOCUS <...>

REQUIREMENTS:
1. One SPECIFIC detail from their profile or activity. If you mention a post or "product update", do NOT start the message with it—weave it in later or open with a question, their role, or a different angle. Never "your recent post" without saying what it was.
2. Add a genuine point or value tied to that detail. Sound like you've thought about them.
3. <If campaign: 'Tie to campaign only if natural.'>
4. Vary structure and closing: different first sentence, different last sentence. Short sentences ok. Fragments ok. NO emojis.
5. Output the FULL message as sent—no "Hi [Name]," prefix, no quotes.
```

**Length targets:** short 150–250 chars, medium 400–600, long 500–800.  
**Fallback:** `Quick follow-up—saw your stuff on {company}. Would be good to connect when you have a sec.`

---

### 2.4 Gmail draft — `generateGmailDraft`

**When:** Generating email draft (subject + body) for approval queue (e.g. gmail_outreach step).

**Prompt (structure):**

```
You're a real person writing an email to a prospect. You know specific things about them. Write something that could only be for THIS person. Natural—not a template.

Lead: <lead.full_name> | <lead.title> | <lead.company>
<enrichmentContext: Profile Bio, Interests, Recent activity>
<campaignContext>

<HUMAN_WRITER_BLOCK>

OPENING: Do NOT default to "Hi [Name],". Do NOT start with "That/the latest product update you shared" or "That/the post you shared" or any "[That/The] [thing] you shared". Use a UNIQUE first line: a question, a direct observation (different wording), or dive in. Use "Hey <first_name>" or "Hi <first_name>" only if it fits. Vary your closing too—different sign-off or CTA per message.

REQUIREMENTS: TONE <toneMap[tone]> | LENGTH <lengthMap[length]>. One CONCRETE detail from their profile (weave it in, don't open with "the thing you shared"). Campaign context only if natural.

OUTPUT FORMAT (strict):
1. First line: SUBJECT: <your subject line>
2. Blank line.
3. Full email body. Any greeting you choose (or none). Paragraphs. Sign off naturally (e.g. Best, Thanks, —[name]). No "Subject:" in body—only SUBJECT: on first line. Body 150-350 words depending on length.
```

**Tone map:** professional | friendly | casual | formal | warm.  
**Length map:** short = body 120–180 words, subject &lt; 60 chars; medium = 180–280 / &lt; 80; long = 280–400 / &lt; 100.  
**Parsing:** First line `SUBJECT: ...` extracted; rest = body. Fallback subject: `Quick thought for {first_name}`; fallback body: short generic line + “[Add your note here.]” + “Best”.

---

### 2.5 Email failover — `generateEmailFailover`

**When:** Following up via email after LinkedIn (no reply).

**Prompt (verbatim pattern):**

```
You're a real person following up via email after LinkedIn. You know their name, role, company. Write a short email that feels like a human wrote it.

Lead: <full_name>, <title> at <company>
Context: You tried LinkedIn first; no reply. This is a brief, respectful email.

RULES: Sound like one person emailing another. One concrete detail about them so it's not bulk. Don't start with "I hope this finds you well" or "I wanted to follow up"—start with something specific or direct. 150-200 words. Clear CTA. No emojis. Output ONLY the email body.
```

**Fallback:** `Saw your profile—would be good to connect. Quick note via email since LinkedIn's been quiet. Best`

---

### 2.6 Email outreach — `generateEmailOutreach`

**When:** Cold email (not failover).

**Prompt (structure):**

```
You're a real person writing a cold email to <first_name>. You know specific things about them. Write something that could only be for this person.

<context: Lead name, title, company, optional bio, interests>

<HUMAN_WRITER_BLOCK>

RULES: One CONCRETE detail from their profile. Don't start with "I came across your profile" or "I was impressed by"—start with something specific or a question. Conversational. 120-180 words. One CTA. Mention you found their contact and wanted to reach out. <If template: "Style (don't copy): <template>"> Output ONLY the email body.
```

**Fallback:** `Saw your work at {company}—would be good to connect. Open to a quick chat when you're free. Best`

---

### 2.7 SMS outreach — `generateSMSOutreach`

**Prompt (pattern):**

```
Short SMS to <first_name> (<title> at <company>). Reference something specific about them. Max 160 chars. Casual, not salesy. Mention LinkedIn. One clear ask. Output ONLY the SMS text.
```

**Fallback:** `Saw your profile—would be good to connect. Free for a quick chat?`

---

## 3. Settings → LinkedIn preferences — Analyze (No AI)

### 3.1 Endpoint and purpose

- **Endpoint:** `POST /api/preferences/analyze`
- **Body:** `{ linkedin_profile_url: string }`
- **Purpose:** Suggest values for **Primary**, **Secondary**, **Tertiary** (titles, industries, company_sizes) so the user can fill preferences. **No LLM:** static pools + profile data only.

### 3.2 Static pools (hardcoded)

**TITLE_OPTIONS:**  
`['CEO', 'CTO', 'CFO', 'Director', 'Manager', 'VP', 'Founder', 'Head of', 'Lead', 'Engineer', 'Analyst', 'Consultant', 'Specialist']`

**INDUSTRY_OPTIONS:**  
`['Technology, Information and Media', 'Financial Services', 'Professional Services', 'Manufacturing', 'Retail', 'Education', 'Hospitals and Health Care', 'Marketing & Advertising', 'Construction', 'Real Estate and Equipment Rental Services', 'Other']`

**SIZE_OPTIONS:**  
`['1-10', '11-50', '51-200', '201-500', '500+']`

### 3.3 Step-by-step logic

1. **Validate input**  
   Require `linkedin_profile_url` string containing `linkedin.com`.

2. **Fetch profile**  
   `profileEnrichment.service.enrichProfileFromUrl(url)` → `profile` with `title`/`headline`, `industry`, `company`, `companySize`/`company_size`. On failure, `profileMeta` stays `{}`.

3. **Normalise profile**  
   `profileTitle`, `profileIndustry`, `profileSize` = trimmed strings from profile (or empty).

4. **Primary (3–5 per category)**  
   - **Titles:** Start with `[profileTitle]` if present, else `[]`. Call `ensureCount(arr, TITLE_OPTIONS, 3, [], profileTitle)` so we have at least 3, max 5; fill from pool preferring matches to `profileTitle`.  
   - **Industries:** Same with `profileIndustry` and `INDUSTRY_OPTIONS`.  
   - **Company sizes:** Same with `profileSize` and `SIZE_OPTIONS`.  
   So Primary is seeded from the user’s profile, then filled from the **same static pools**.

5. **ensureCount(arr, pool, minCount, excludeSet, prefer)**  
   - `used` = normalised set of `arr` + `excludeSet`.  
   - `need = max(0, minCount - arr.length)`.  
   - `added = pickFromPool(pool, need, used, prefer)`.  
   - Return `[...arr, ...added].slice(0, 5)`.

6. **pickFromPool(pool, count, exclude, preferMatch)**  
   - Build `excluded` set (normalised).  
   - If `preferMatch` is set, sort pool so items that contain or are contained in `preferMatch` (normalised) come first.  
   - Iterate pool; skip if normalised value in `excluded` or empty; else add to result and to `excluded`; stop when `result.length >= count`.  
   So we prefer pool entries that “match” the profile (e.g. profile "Software Engineer" → prefer "Engineer" in pool) and never repeat across tiers.

7. **Secondary**  
   - `usedTitles`, `usedIndustries`, `usedSizes` = normalised sets of Primary.  
   - Secondary titles = `pickFromPool(TITLE_OPTIONS, 4, usedTitles)` (no prefer). Add to used.  
   - Same for industries (4) and sizes (4).

8. **Tertiary**  
   - Titles = `pickFromPool(TITLE_OPTIONS, 4, usedTitles)`; industries = `pickFromPool(INDUSTRY_OPTIONS, 4, usedIndustries)`; sizes = `pickFromPool(SIZE_OPTIONS, 4, usedSizes)`.

9. **Validate and return**  
   Pass the three tiers through `validatePreferenceTiers` (max 5 per list, no duplicate value across tiers). Response: `{ success: true, suggested: { primary, secondary, tertiary }, profile_meta }`.

### 3.4 Summary

- **No AI.** Suggestions = user’s **profile** (for Primary) + **fixed title/industry/size lists**.  
- “Smart” part: profile seeds Primary and pool is sorted to prefer profile-matching options when filling.  
- To get **dynamic** suggestions (e.g. industry names inferred by AI from profile), an LLM call would need to be added; today it’s rule-based + static pools only.

---

## Quick reference table

| Feature               | Uses AI? | File(s)                                      | Key function / prompt              |
|-----------------------|----------|----------------------------------------------|------------------------------------|
| My Contacts scoring   | No       | preferenceScoring.service.js, industries.js  | calculateScore, applyPriorityRule  |
| LinkedIn connection   | Yes      | ai.service.js                                | generateConnectionRequest          |
| LinkedIn follow-up    | Yes      | ai.service.js                                | generateFollowUpMessage            |
| Gmail draft           | Yes      | ai.service.js                                | generateGmailDraft                 |
| Email failover        | Yes      | ai.service.js                                | generateEmailFailover              |
| Email outreach        | Yes      | ai.service.js                                | generateEmailOutreach               |
| SMS outreach          | Yes      | ai.service.js                                | generateSMSOutreach                |
| Settings Analyze      | No       | preferences.controller.js                   | analyzeProfileForPreferences       |
