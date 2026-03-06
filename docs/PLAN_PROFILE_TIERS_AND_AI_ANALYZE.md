# Implementation Plan: Profile-Based Tiers, Industry Hierarchy & AI Analyze

**Goal:** Keep My Contacts and dashboard tiers aligned with the user’s LinkedIn profile and `linkedin_industry_code_v2_all_eng.json`, support manual overrides, and make Analyze AI-driven while keeping the project stable.

---

## 1. Summary of Behaviors

| Scenario | Primary | Secondary | Tertiary | My Contacts |
|----------|---------|-----------|----------|--------------|
| **User has saved manual tiers** (Save Preferences with values in the dropdowns) | Match primary lists | Match secondary lists | Match tertiary or no match | Primary OR Secondary (unchanged) |
| **User has profile URL but no manual tiers** | Same top-level industry (or branch) as user in JSON | Related/sibling industries in JSON | All other industries | Primary OR Secondary |
| **No profile, no manual tiers** | Current fallback: top % by profile-completeness score | Next % | Rest | Primary OR Secondary |

- **Manual always wins:** If the user has ever saved non-empty primary/secondary/tertiary in LinkedIn Preferences, the system uses only those lists (current behavior). No overwrite by profile or AI.
- **Profile-based default:** When there are no manual tier values, use the user’s LinkedIn profile + industry JSON to assign hot/warm/cold (primary/secondary/tertiary).
- **Analyze button:** Becomes AI-driven: suggest primary/secondary/tertiary from the user’s profile and the industry list (from JSON), so values are relevant to the user’s main category and related ones.

---

## 2. Data Flow (High Level)

1. **Resolve user’s industry from profile**  
   From `preference_settings.linkedin_profile_url` + `profile_meta` (or enrich from URL): get industry label(s) and map them to the LinkedIn industry JSON (top-level + hierarchy).

2. **Resolve lead’s industry**  
   From lead’s `company` + `title`: map to the same JSON (e.g. best-match label → hierarchy path).

3. **Compare hierarchy**  
   - **Primary (hot):** Same top-level industry as user (e.g. both “Manufacturing” or “Manufacturing > Chemical Manufacturing”).  
   - **Secondary (warm):** Related: e.g. same second-level, or a “sibling” top-level (e.g. “Technology” when user is “Manufacturing” can be secondary if we define related; or we keep secondary = same top-level but different branch).  
   - **Tertiary (cold):** All other.

4. **Manual override**  
   If `preference_tiers` has any non-empty primary/secondary/tertiary lists → use only those (current `preferenceScoring.service.js` logic). No industry-hierarchy logic in that case.

---

## 3. File-Level Plan (Minimal Surface Area)

### 3.1 New: `backend/src/services/industryHierarchy.service.js` (or extend `industryList.service.js`)

- **getIndustryList()**  
  Already exists; ensure it loads from `linkedin_industry_code_v2_all_eng.json` and returns items with `hierarchy`, `label`, `top_level_industry`, `sub_category`.

- **getTopLevelIndustries()**  
  Return distinct top-level names from `hierarchy` (e.g. “Manufacturing”, “Technology, Information and Media”).

- **resolveLeadToIndustryLabel(company, title)**  
  Given company + title text, return the best-matching industry **label** from the JSON (e.g. fuzzy match on label/description or use existing `INDUSTRY_KEYWORDS` then map to JSON label). Return one label (or null).

- **getHierarchyPath(label)**  
  For a label, return the hierarchy path (e.g. `["Manufacturing", "Chemical Manufacturing"]`).

- **getTierFromHierarchy(userPath, leadPath)**  
  - If same top-level → `primary`.  
  - If same second-level but different third, or “related” top-level (configurable) → `secondary`.  
  - Else → `tertiary`.

This keeps all JSON and hierarchy logic in one place and does not change `industries.js` or lead ingestion until we plug it in.

### 3.2 Changes: `backend/src/services/preferenceScoring.service.js`

- **Keep existing logic when manual tiers exist**  
  If `preference_tiers` has at least one non-empty array in primary/secondary/tertiary → keep current `calculateScore` + `applyPriorityRule` (title/industry/company_size lists). No change to this path.

- **New path when no manual tiers**  
  If no manual tier criteria:
  - Load `preference_settings`: `linkedin_profile_url`, `profile_meta`.
  - If we have profile (URL or profile_meta.industry), get user’s industry label(s) and hierarchy path(s) via the new industry hierarchy service.
  - For each lead:
    - Resolve lead to industry label (company + title) via hierarchy service.
    - Get lead hierarchy path; compare with user path → primary / secondary / tertiary.
    - Optionally combine with a lightweight “relevance” score (e.g. title similarity to profile) so we can still sort; tier is from hierarchy.
  - Apply same `applyPriorityRule`: primary OR secondary → My Contacts.

- **Recalculate**  
  In `recalculateAllScores()`:
  - First check “has manual tier criteria?” (current `hasTierCriteria`).
  - If yes → current behavior (list-based scoring).
  - If no → use profile-based hierarchy tier assignment; if no profile either, keep current default (profile-completeness score + dynamic % bands).

- **Single-lead scoring**  
  In `scoreAndClassifyLead(lead)`, same branching: manual tiers → current `calculateScore`; else profile-based tier from hierarchy.

This limits changes to one service and keeps the rest of the app unchanged.

### 3.3 Changes: `backend/src/controllers/preferences.controller.js` — Analyze

- **Current behavior**  
  Static pools for titles/industries/sizes; profile seeds primary; no AI.

- **New behavior**  
  - Still call `profileEnrichment.service.enrichProfileFromUrl(url)` (or use stored `profile_meta` if available).
  - Load industry list from `industryList.service` (from JSON): full list or top-level + a few children per top-level.
  - Call **AI** (existing `ai.service.js`): prompt with user profile (title, industry, company) + instruction: “Given this LinkedIn profile and the following list of industries (from LinkedIn industry taxonomy), suggest which industries belong in primary (user’s main focus), secondary (related), tertiary (other). Also suggest 3–5 job titles and 3–5 company sizes. Output valid JSON only: { primary: { industries: [], titles: [], company_sizes: [] }, secondary: { ... }, tertiary: { ... } }. Use only industry labels from the provided list.”
  - Parse AI response; validate industry labels against the JSON list (drop invalid). Titles/sizes can be from a fixed allowlist or the AI (validated against current TITLE_OPTIONS / SIZE_OPTIONS).
  - Return `suggested` same shape as now so the frontend can prefill the three tier dropdowns. User can edit and click Save Preferences.

If AI fails, fall back to current static Analyze (profile seed + pools) so the button never breaks.

### 3.4 Changes: `backend/src/services/ai.service.js`

- **Messaging (connection request, follow-up, Gmail, etc.)**  
  - Keep all current “human-writing” and “no template” rules.
  - Add a short block that strengthens “one clear thought” and tone:
    - “Write as if you have one clear thought or question in mind; the message should feel like a single idea, not a pitch. Vary sentence rhythm; occasional short fragment or question. Tone: [friendly | professional | casual | formal | warm] — match this in word choice and sign-off.”
  - Ensure the existing `tone` (friendly, professional, etc.) is passed through and that the prompt explicitly names the chosen tone so the model varies by tag. No structural change to APIs.

- **New method (or reuse)** for Analyze: e.g. `suggestTiersFromProfile(profile, industryList)` that returns `{ primary, secondary, tertiary }` with the structure above. Called only from the Analyze endpoint.

### 3.5 My Contacts

- **Rule stays:** `is_priority = (tier === 'primary' || tier === 'secondary')`.
- With profile-based default, “primary” = same top-level (and optionally same branch) as user; “secondary” = related; so leads relevant to the user’s profile (by industry JSON) automatically land in My Contacts when no manual tiers are set.
- When manual tiers are set, they define primary/secondary, so no code change to the My Contacts query.

### 3.6 Dashboard Primary / Secondary / Tertiary

- **Source of truth:** `leads.preference_tier` (and optional `manual_tier` if you keep it for overrides).
- Rescore (manual or on save preferences) will set `preference_tier` either from:
  - Manual tier lists (current logic), or  
  - Profile-based hierarchy (new logic when no manual tiers).
- Dashboard already filters by `preference_tier`; no change needed if it reads `preference_tier` (and `manual_tier` if applicable).

---

## 4. Industry JSON Usage (Concrete)

- **File:** `linkedin_industry_code_v2_all_eng.json`.
- **Structure:** Each item has `label`, `hierarchy` (e.g. `"Manufacturing > Chemical Manufacturing"`). Top-level = first segment.
- **User profile:** From profile URL or `profile_meta.industry` we get a string (e.g. “Chemical Manufacturing” or “Manufacturing”). Map to the closest JSON label (e.g. “Manufacturing” or “Manufacturing > Chemical Manufacturing”) to get the user’s hierarchy path.
- **Lead:** From `company` + `title` we get a best-match industry label from the JSON (or via existing keyword match then map to JSON). Then get path.
- **Tier:** Same top-level → primary. Same second-level or “related” top-level (e.g. from a small related map) → secondary. Else tertiary. Start simple: same top-level = primary; else secondary vs tertiary can be “same second-level” = secondary, else tertiary.

---

## 5. Order of Implementation (Safe Sequence)

1. **Add industry hierarchy helpers** (new service or extend `industryList.service.js`): get top-level, resolve lead to label, get path, compare for tier. Unit-test with a few labels from the JSON.
2. **Add profile-based tier branch in preferenceScoring** behind “no manual tier criteria”: load profile, get user path, for each lead get lead path and tier. Run rescore in dev and confirm primary/secondary/tertiary counts make sense.
3. **Add AI Analyze** in preferences controller: prompt + parse + validate; fallback to current static Analyze on failure. Test with a few profiles.
4. **Fine-tune AI messaging** prompts: add “one clear thought” and explicit tone in the instructions. No API or parameter changes.
5. **Optional:** Store `profile_meta.industry` (and maybe normalized industry label) when user saves profile URL or runs Analyze, so rescore doesn’t need to call profile enrichment every time.

---

## 6. What We Do Not Change

- Lead list/dashboard UI (only the data behind `preference_tier` changes when we use profile-based logic).
- My Contacts filter (still `is_priority = true` or primary/secondary).
- Manual tier UI: user can still edit and save primary/secondary/tertiary; when saved, that overrides profile-based logic.
- Existing `calculateScore` and list-based matching when manual tiers are present.
- Migration/schema: no new columns required; `profile_meta` and `preference_tiers` already exist.

---

## 7. Risks and Mitigations

- **Profile URL not enriched:** If we can’t get industry from URL, use `profile_meta` from last Analyze; if neither, fall back to current “no preferences” behavior (profile-completeness + % bands).
- **AI Analyze timeout or bad JSON:** Fall back to current static Analyze (profile seed + pools).
- **Performance:** Rescore with profile-based logic is still per-lead (resolve industry → compare hierarchy). For large DBs, keep batch size (e.g. 1000) and optional caching of “label → path” so we don’t re-parse JSON for every lead.

---

## 8. Short Checklist

- [ ] Industry hierarchy service: get top-level, resolve lead to label, get path, tier from comparison.
- [ ] preferenceScoring: if no manual tiers, use profile + hierarchy to set primary/secondary/tertiary; else keep current list-based logic.
- [ ] recalculateAllScores and scoreAndClassifyLead both respect manual vs profile-based branch.
- [ ] Analyze endpoint: AI suggests primary/secondary/tertiary from profile + industry list; validate and return; fallback to static.
- [ ] AI messaging: “one clear thought” + explicit tone (friendly/professional/…) in prompts; no breaking changes.
- [ ] My Contacts and dashboard: no change except data source (preference_tier filled by new logic when no manual tiers).

This plan keeps the project stable, uses the JSON for hot/warm/cold, respects manual preferences, and makes Analyze AI-driven with a safe fallback.
