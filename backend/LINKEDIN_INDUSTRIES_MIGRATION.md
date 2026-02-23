# LinkedIn Industries Database Migration

## Overview
This migration moves LinkedIn industry code data from a CSV file to the PostgreSQL database for better performance, reliability, and maintainability.

## What Changed

### Before
- Industry codes were loaded from `linkedin_industry_code_v2_all_eng.csv` on every server start
- File path issues could cause failures
- Slower lookups during analytics queries

### After
- Industry codes are stored in the `linkedin_industries` database table
- Faster queries with indexed lookups
- No file path dependencies
- Data persists in the database

## Migration Steps

### 1. Run the Database Migration
This creates the `linkedin_industries` table:

```bash
cd backend
npm run migrate
```

Or manually run:
```bash
node src/db/migrations.js
```

### 2. Populate the Table from CSV
This loads all industry data from the CSV into the database:

```bash
cd backend
node scripts/populate_linkedin_industries.js
```

**Expected Output:**
```
🔄 Starting LinkedIn industries data migration...
📄 Reading CSV file: Z:\linkedin-automation-engine3\linkedin_industry_code_v2_all_eng.csv
📊 Found 434 industry records
🗑️  Cleared existing data
✅ Successfully inserted 434 industry records

📈 Statistics:
   Total records: 434
   Top-level industries: 28
   Sub-categories: 150

✅ Migration completed successfully!
```

### 3. Restart Your Backend Server
The analytics controller now queries the database instead of reading the CSV.

## Database Schema

```sql
CREATE TABLE linkedin_industries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  hierarchy TEXT NOT NULL,
  description TEXT,
  top_level_industry VARCHAR(255),
  sub_category VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_linkedin_industries_code` - Fast lookups by code
- `idx_linkedin_industries_top_level` - Fast filtering by top-level industry
- `idx_linkedin_industries_sub_category` - Fast filtering by sub-category
- `idx_linkedin_industries_name` - Fast text searches

## Files Modified

1. **backend/database/migrations/020_create_linkedin_industries.sql**
   - Creates the `linkedin_industries` table

2. **backend/scripts/populate_linkedin_industries.js**
   - One-time script to load CSV data into the database

3. **backend/src/controllers/analytics.controller.js**
   - Updated `loadIndustryMetadata()` to query database instead of CSV
   - Removed CSV file reading dependencies (`fs`, `path`, `csv-parse`)

## Benefits

✅ **Performance**: Database queries with indexes are faster than CSV parsing  
✅ **Reliability**: No file path issues or missing file errors  
✅ **Scalability**: Easy to update or add new industries via SQL  
✅ **Maintainability**: Centralized data management  
✅ **Caching**: In-memory cache still works for repeated queries  

## Troubleshooting

### Error: "relation 'linkedin_industries' does not exist"
**Solution**: Run the migration first:
```bash
cd backend
npm run migrate
```

### Error: "CSV file not found"
**Solution**: Make sure you're running the populate script from the backend directory and the CSV exists at:
```
Z:\linkedin-automation-engine3\linkedin_industry_code_v2_all_eng.csv
```

### Empty Results
**Solution**: Run the populate script to load data:
```bash
cd backend
node scripts/populate_linkedin_industries.js
```

## Rollback (if needed)

If you need to rollback to CSV-based approach:

1. Restore the old `analytics.controller.js` from git
2. Drop the table (optional):
```sql
DROP TABLE IF EXISTS linkedin_industries;
```

## Notes

- The CSV file can be kept for backup purposes but is no longer used by the application
- The populate script can be run multiple times safely (it uses UPSERT)
- Cache is cleared on server restart to ensure fresh data
