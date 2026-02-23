import pool from '../db.js';

async function checkFeeds() {
    try {
        console.log('Checking content feeds...');
        const res = await pool.query('SELECT * FROM content_feeds');
        console.log(`Found ${res.rows.length} feeds.`);
        res.rows.forEach(feed => {
            console.log(`- ${feed.name} (${feed.url}) [${feed.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
        });

        if (res.rows.length === 0) {
            console.log('Adding a sample feed (TechCrunch)...');
            await pool.query(
                "INSERT INTO content_feeds (name, url, keywords, type, is_active) VALUES ($1, $2, $3, $4, $5)",
                ['TechCrunch', 'https://techcrunch.com/feed/', ['AI', 'LinkedIn', 'SaaS', 'Startup'], 'news', true]
            );
            console.log('✅ Sample feed added.');
        }
    } catch (err) {
        console.error('❌ Error checking/seeding feeds:', err.message);
    } finally {
        await pool.end();
    }
}

checkFeeds();
