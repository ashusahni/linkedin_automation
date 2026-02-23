import pool from './src/db.js';

async function addRishabProfile() {
    try {
        console.log('🔄 Adding Rishab Khandelwal profile to database...');

        const result = await pool.query(`
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
                company = EXCLUDED.company
            RETURNING id, full_name, title, company;
        `);

        console.log('✅ Profile added/updated successfully:');
        console.log(result.rows[0]);

        // Verify it's there
        const verify = await pool.query(`
            SELECT full_name, title, company 
            FROM leads 
            WHERE linkedin_url = 'https://www.linkedin.com/in/rishab-khandelwal-954484101/'
        `);

        console.log('\n📊 Verification:');
        console.log(verify.rows[0]);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

addRishabProfile();
