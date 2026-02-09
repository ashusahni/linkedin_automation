# ============================================
# Contact Scraper Database Migrations
# PowerShell version
# ============================================

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "CONTACT SCRAPER MIGRATIONS" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Get database connection details
$DB_HOST = Read-Host "Enter PostgreSQL host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($DB_HOST)) { $DB_HOST = "localhost" }

$DB_PORT = Read-Host "Enter PostgreSQL port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "5432" }

$DB_NAME = Read-Host "Enter database name (default: linkedin_automation)"
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "linkedin_automation" }

$DB_USER = Read-Host "Enter PostgreSQL username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "postgres" }

Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "CONFIGURATION" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "Host: $DB_HOST"
Write-Host "Port: $DB_PORT"
Write-Host "Database: $DB_NAME"
Write-Host "User: $DB_USER`n"

Read-Host "Press Enter to continue"

# Migration 018
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "RUNNING MIGRATION 018" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

$env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "backend\database\migrations\018_add_profile_id_and_scraper_cache.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Migration 018 FAILED!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "`n✅ Migration 018 completed successfully!`n" -ForegroundColor Green

# Migration 019
Write-Host "============================================" -ForegroundColor Green
Write-Host "RUNNING MIGRATION 019" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "backend\database\migrations\019_create_scraping_jobs.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Migration 019 FAILED!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "`n✅ Migration 019 completed successfully!`n" -ForegroundColor Green

# Verification
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "VERIFYING MIGRATIONS" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$verifySQL = @"
SELECT 'Tables:' as info;
SELECT table_name FROM information_schema.tables WHERE table_name IN ('scraped_contacts', 'scraping_jobs') ORDER BY table_name;
SELECT 'Columns:' as info;
SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'linkedin_profile_id';
SELECT 'Profile IDs Backfilled:' as info;
SELECT COUNT(*) as profile_id_count FROM leads WHERE linkedin_profile_id IS NOT NULL;
SELECT 'Functions:' as info;
SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('get_active_scraping_progress', 'get_scraping_stats', 'sync_contacts_to_leads') ORDER BY routine_name;
"@

$verifySQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

Write-Host "Next steps:"
Write-Host "1. Restart your backend server"
Write-Host "2. Test by approving some leads"
Write-Host "3. Check the Contact column in Leads table`n"

# Clear password from environment
$env:PGPASSWORD = $null

Read-Host "Press Enter to exit"
