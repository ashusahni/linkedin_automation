-- Quick script to check connection degree status after re-import

-- 1. Check how many leads have connection_degree
SELECT 
    CASE 
        WHEN connection_degree IS NULL THEN 'No Connection Degree'
        ELSE 'Has Connection Degree'
    END as status,
    COUNT(*) as count
FROM leads
GROUP BY 
    CASE 
        WHEN connection_degree IS NULL THEN 'No Connection Degree'
        ELSE 'Has Connection Degree'
    END;

-- 2. Show breakdown by connection degree
SELECT 
    COALESCE(connection_degree, 'NULL') as connection_degree,
    COUNT(*) as count
FROM leads
GROUP BY connection_degree
ORDER BY connection_degree;

-- 3. Show sample leads with connection degree
SELECT 
    id,
    full_name,
    company,
    connection_degree,
    source,
    created_at
FROM leads
WHERE connection_degree IS NOT NULL
LIMIT 10;
