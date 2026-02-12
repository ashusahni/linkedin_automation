-- Quick check and insert for Rishab's profile
-- First, check if it exists
SELECT id, full_name, title, company, linkedin_url 
FROM leads 
WHERE linkedin_url LIKE '%rishab%' 
LIMIT 5;

-- If not found, insert it
INSERT INTO leads (
    full_name, first_name, last_name, title, company, linkedin_url, 
    source, status, review_status, created_at, updated_at
) VALUES (
    'Rishab Khandelwal',
    'Rishab',
    'Khandelwal',
    'Director',
    'Scottish Chemical Industries',
    'https://www.linkedin.com/in/rishab-khandelwal-954484101/',
    'manual',
    'new',
    'approved',
    NOW(),
    NOW()
) ON CONFLICT (linkedin_url) DO UPDATE SET
    full_name = 'Rishab Khandelwal',
    first_name = 'Rishab',
    last_name = 'Khandelwal',
    title = 'Director',
    company = 'Scottish Chemical Industries',
    updated_at = NOW()
RETURNING id, full_name, title, company;
