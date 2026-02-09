import pool from './src/db.js';

async function resetWorkflow() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting workflow reset...\n');

        // Step 1: Change default
        console.log('📝 Step 1: Changing default status to "to_be_reviewed"...');
        await client.query("ALTER TABLE leads ALTER COLUMN review_status SET DEFAULT 'to_be_reviewed'");
        console.log('✅ Default changed successfully\n');

        // Step 2: Move all leads
        console.log('🚚 Step 2: Moving all approved leads to review queue...');
        const result = await client.query(`
      UPDATE leads 
      SET review_status = 'to_be_reviewed',
          approved_at = NULL,
          approved_by = NULL
      WHERE review_status = 'approved' OR review_status IS NULL
    `);
        console.log(`✅ Moved ${result.rowCount} leads to "To Be Reviewed"\n`);

        // Step 3: Verify
        console.log('🔍 Step 3: Verifying results...');
        const stats = await client.query(`
      SELECT review_status, COUNT(*) as count 
      FROM leads 
      GROUP BY review_status 
      ORDER BY review_status
    `);

        console.log('\n📊 Current Status Distribution:');
        stats.rows.forEach(row => {
            console.log(`   ${row.review_status || 'NULL'}: ${row.count} leads`);
        });

        console.log('\n🎉 Workflow reset complete! Please refresh your browser.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

resetWorkflow()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
