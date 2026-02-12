# Profile-Aware Industry Prioritization

## Overview
The system now intelligently prioritizes industries in the dashboard chart based on your LinkedIn profile. When the "Preferences" toggle is enabled, industries most relevant to your profile appear at the top, regardless of lead count.

## How It Works

### 1. Profile Enrichment
When you save your LinkedIn profile URL in Settings, the system:
- Looks up your profile in the database (if you're a lead)
- Extracts your **industry**, **title**, and **company**
- Analyzes metadata tags (B2B, Marketing, Manufacturing, etc.)

### 2. Smart Scoring Algorithm
Industries are scored based on multiple factors:

| Factor | Weight | Example |
|--------|--------|---------|
| Direct industry match | 10 | Profile: "Manufacturing" → Industry: "Manufacturing" |
| Sub-industry match | 8 | Company: "Chemical Industries" → Sub: "Chemical Manufacturing" |
| Company keywords | 7 | Company: "Scottish Chemical Industries" → Industry: "Manufacturing" |
| Job role match | 5 | Title: "Director" → Industries with "Director" roles |
| Metadata tags | 4 each | Tags: "B2B", "Marketing" → Industries with matching tags |
| Semantic patterns | 3 | "Director" → Management-heavy industries |
| Lead count | 1-3 | Logarithmic boost for popular industries |

### 3. Example: Rishab Khandelwal
**Profile:**
- Title: Director
- Company: Scottish Chemical Industries
- LinkedIn: https://www.linkedin.com/in/rishab-khandelwal-954484101/

**Extracted Data:**
- Industry: Manufacturing
- Metadata: B2B, Management, Chemicals, Marketing

**Result:**
When preferences are enabled, the chart shows:
1. **Manufacturing** (high score: company keywords + industry match)
2. **Marketing** (metadata match)
3. **Consulting** (director role match)
4. Technology (lower score, just lead count)

## Setup Instructions

### Step 1: Add Your Profile to Database
Run this SQL to add Rishab's profile (or your own):

```sql
INSERT INTO leads (
    full_name, first_name, last_name, title, company, linkedin_url, source, status, review_status
) VALUES (
    'Rishab Khandelwal', 'Rishab', 'Khandelwal', 'Director', 
    'Scottish Chemical Industries',
    'https://www.linkedin.com/in/rishab-khandelwal-954484101/',
    'manual', 'new', 'approved'
) ON CONFLICT (linkedin_url) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    title = EXCLUDED.title,
    company = EXCLUDED.company;
```

### Step 2: Configure Settings
1. Go to **Settings** → **Preferences**
2. Set **LinkedIn Profile URL**: `https://www.linkedin.com/in/rishab-khandelwal-954484101/`
3. Save settings

### Step 3: Enable Preferences
1. Go to **Dashboard**
2. Click the **"Preferences"** toggle button (top-right of Industry Distribution chart)
3. The chart will re-sort to show relevant industries first

## Technical Details

### Files Modified
- `backend/src/services/profileEnrichment.service.js` - New service for profile data extraction
- `backend/src/services/industryHierarchy.service.js` - Enhanced scoring algorithm
- `backend/src/routes/settings.routes.js` - Auto-enrichment on settings load
- `frontend/src/components/IndustryDistributionChart.jsx` - Profile data integration

### API Endpoints
- `GET /api/settings` - Returns enriched profile data
- `POST /api/industry/prioritize` - Sorts industries by profile relevance

### Caching
Profile data is cached for 24 hours to improve performance.

## Troubleshooting

### Profile Not Found
If your profile isn't in the database:
1. Import yourself as a lead via CSV
2. Or run the SQL insert script above
3. Refresh the dashboard

### Industries Not Prioritizing Correctly
Check the browser console for:
```
📊 Loaded profile for prioritization: { industry: '...', title: '...', company: '...' }
```

If empty, the profile URL might not match any database entry.

### Manual Override
You can manually set industry preferences in the database:
```sql
UPDATE leads 
SET title = 'Director', company = 'Scottish Chemical Industries'
WHERE linkedin_url = 'your-profile-url';
```

## Future Enhancements
- [ ] Direct LinkedIn profile scraping (no database required)
- [ ] Multiple profile support (team-based prioritization)
- [ ] Custom industry weights in settings
- [ ] AI-based industry inference from job description
