-- Add Rishab Khandelwal's profile to the database for preference-based prioritization
INSERT INTO leads (
    full_name,
    first_name,
    last_name,
    title,
    company,
    linkedin_url,
    source,
    status,
    review_status
) VALUES (
    'Rishab Khandelwal',
    'Rishab',
    'Khandelwal',
    'Director',
    'Scottish Chemical Industries',
    'https://www.linkedin.com/in/rishab-khandelwal-954484101/',
    'manual',
    'new',
    'approved'
) ON CONFLICT (linkedin_url) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    title = EXCLUDED.title,
    company = EXCLUDED.company;
