# Industry Distribution Chart - Implementation Guide

## Overview
The hierarchical industry distribution system provides an interactive chart with CSV-based taxonomy, profile-aware prioritization, and dynamic subtag filtering.

## Backend Implementation

### 1. Service Layer (`industryHierarchy.service.js`)
- **Loads CSV on startup** into memory for O(1) lookups
- **Parses hierarchy** from "Industry > Sub-Industry > ..." paths
- **Extracts metadata**: job roles and category tags from descriptions
- **Priority scoring**: Weights industry match (5x), job match (3x), metadata match (2x), + log(count)

### 2. API Endpoints (`/api/industry/...`)
- `GET /hierarchy` - Full taxonomy structure
- `GET /subtags?industry=X` - Subtags for specific industry
- `GET /top-level` - All top-level industries
- `POST /prioritize` - Sort industries by profile + preference mode

### 3. Initialization
The service loads automatically on server startup in `server.js`:
```javascript
await industryHierarchyService.loadIndustryData();
```

## Frontend Component

### Usage in Dashboard
```jsx
import IndustryDistributionChart from '../components/IndustryDistributionChart';

// In your dashboard component:
<IndustryDistributionChart 
  leadCounts={{
    "Technology": 150,
    "Healthcare": 89,
    "Finance": 67,
    // ... more industries
  }}
/>
```

### Features

#### 1. Three-Panel Layout
- **LEFT**: Subtags panel (when industry selected)
  - Sub-industries (hierarchical)
  - Job roles (extracted from descriptions)
  - Metadata tags (B2B, Technology, etc.)
  
- **CENTER**: Interactive donut chart
  - Click slices to select industry
  - Hover for tooltips
  - Auto-updates on selection

- **RIGHT**: Industry list
  - Search/filter capabilities
  - Profile-matched industries highlighted with ⭐
  - Click to view subtags

#### 2. Preference Mode
Toggle with the "⭐ Preferences" button:
- **ON**: Industries matching profile float to top (regardless of count)
- **OFF**: Pure count-based sorting

#### 3. Profile Matching
System reads from `/api/settings` and matches:
- Industry name
- Job title keywords
- Metadata categories

#### 4. Interactive Breadcrumbs
Shows current selection path:
```
Industry Distribution > Technology > Software Development
```

## CSV Structure

The system uses `linkedin_industry_code_v2_all_eng.csv`:

| Column | Description | Example |
|--------|-------------|---------|
| Code | LinkedIn industry code | "2190" |
| Name | Industry name | "Accommodation Services" |
| Hierarchy | Full path with `>` separator | "Services > Hospitality > Hotels" |
| Description | Full text description | "This industry includes..." |

### Hierarchy Parsing
```
"Accommodation Services > Food and Beverage Services > Restaurants"
```
Becomes:
- Top-level: "Accommodation Services"
- Sub-industry: "Food and Beverage Services"
- Leaf: "Restaurants"

## Smart Scoring Algorithm

```javascript
score = 
  (IndustryMatch * 5) +
  (JobMatch * 3) +
  (MetadataMatch * 2) +
  log(leadCount)
```

### Example:
For a user with profile:
- Industry: "Software"
- Title: "Software Engineer"
- Metadata: ["Technology", "B2B"]

Industries are scored:
1. **Technology** (150 leads): 5 (industry) + 3 (job) + 2 (metadata) + log(150) = **15.0**
2. **Healthcare** (200 leads): 0 + 0 + 0 + log(200) = **5.3**
3. **Finance** (180 leads): 0 + 0 + 2 (B2B) + log(180) = **7.2**

Result: Technology appears first despite having fewer leads.

## Performance Optimizations

1. **CSV loaded once** on server startup
2. **In-memory cache** - no disk I/O per request
3. **O(1) lookups** via Map data structure
4. **Frontend caching** of hierarchy data
5. **Lazy loading** of subtags (only when industry clicked)

## Integration Steps

### 1. Add to Dashboard
```jsx
// In DashboardPage.jsx
import IndustryDistributionChart from '../components/IndustryDistributionChart';

// Fetch industry counts from your analytics
const industryDistribution = analytics?.industryDistribution || {};

// Render the chart
<IndustryDistributionChart leadCounts={industryDistribution} />
```

### 2. Ensure Profile Settings
Make sure your settings API returns:
```json
{
  "preferences": {
    "industry": "Technology",
    "title": "Software Engineer",
    "metadata": ["B2B", "SaaS"]
  }
}
```

### 3. Test the Flow
1. Navigate to dashboard
2. Click "⭐ Preferences" button
3. Click an industry in the right panel
4. See subtags appear in left panel
5. Click subtags to filter chart
6. Use breadcrumbs to navigate back

## Customization

### Colors
Edit `INDUSTRY_COLORS` array in component:
```javascript
const INDUSTRY_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  // ... add more colors
];
```

### Metadata Extraction
Edit `extractMetadataTags()` in service:
```javascript
const tagPatterns = {
  'B2B': /\b(business-to-business|b2b|enterprise)\b/,
  'YourTag': /\b(your|pattern|here)\b/,
};
```

### Job Role Keywords
Edit `extractJobRoles()` in service:
```javascript
const roleKeywords = [
  'manager', 'director', 'engineer',
  'your-role-keyword'
];
```

## Troubleshooting

### CSV Not Loading
Check server logs for:
```
📊 Loading industry hierarchy data...
✅ Loaded 434 industries into hierarchy
```

If missing, verify:
- CSV file exists at `backend/src/data/linkedin_industry_code_v2_all_eng.csv`
- File encoding is UTF-8
- No syntax errors in service

### Industries Not Prioritizing
1. Check preference mode is enabled (⭐ button highlighted)
2. Verify profile settings exist in `/api/settings`
3. Check browser console for API errors

### Subtags Not Appearing
1. Ensure industry name matches exactly (case-sensitive)
2. Check `/api/industry/subtags?industry=X` endpoint
3. Verify CSV has sub-industries for that top-level industry

## Future Enhancements

1. **Export filtered leads** by selected industry/subtag
2. **Save favorite industries** to profile
3. **Historical trending** - show industry growth over time
4. **Comparison mode** - compare two industries side-by-side
5. **AI recommendations** - suggest industries to target based on success rate
