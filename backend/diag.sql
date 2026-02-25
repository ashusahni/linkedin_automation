\echo '1. Score distribution histogram:'
SELECT 
    SUM(CASE WHEN preference_score BETWEEN 0 AND 30 THEN 1 ELSE 0 END) as "0-30",
    SUM(CASE WHEN preference_score BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as "31-60",
    SUM(CASE WHEN preference_score BETWEEN 61 AND 90 THEN 1 ELSE 0 END) as "61-90",
    SUM(CASE WHEN preference_score BETWEEN 91 AND 120 THEN 1 ELSE 0 END) as "91-120",
    SUM(CASE WHEN preference_score > 120 THEN 1 ELSE 0 END) as "120+"
FROM leads;

\echo '2. Tier distribution by connection level:'
SELECT 
    connection_degree,
    SUM(CASE WHEN preference_tier = 'primary' THEN 1 ELSE 0 END) as primary,
    SUM(CASE WHEN preference_tier = 'secondary' THEN 1 ELSE 0 END) as secondary,
    SUM(CASE WHEN preference_tier = 'tertiary' THEN 1 ELSE 0 END) as tertiary
FROM leads
GROUP BY connection_degree;

\echo '3. Average score by connection level:'
SELECT connection_degree, ROUND(AVG(preference_score), 2) as average_score
FROM leads
GROUP BY connection_degree;

\echo '4. 20 random 2nd degree leads:'
SELECT id, company, title, location, connection_degree, preference_score, preference_tier
FROM leads
WHERE connection_degree LIKE '%2nd%' OR connection_degree = '2'
LIMIT 20;

\echo '5. Checking preference_settings'
SELECT * FROM preference_settings LIMIT 1;
