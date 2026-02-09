@echo off
echo ========================================
echo  LEAD WORKFLOW RESET SCRIPT
echo ========================================
echo.

REM Get database credentials from .env
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /i "DB_"') do (
    set %%a=%%b
)

echo Connecting to database...
echo.

REM Execute SQL commands
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "ALTER TABLE leads ALTER COLUMN review_status SET DEFAULT 'to_be_reviewed';"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "UPDATE leads SET review_status = 'to_be_reviewed', approved_at = NULL, approved_by = NULL WHERE review_status = 'approved' OR review_status IS NULL;"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT review_status, COUNT(*) as count FROM leads GROUP BY review_status ORDER BY review_status;"

echo.
echo ========================================
echo  RESET COMPLETE!
echo  Please refresh your browser.
echo ========================================
pause
