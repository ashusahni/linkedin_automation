
import pool from '../db.js';

const resetStatus = async () => {
    try {
        console.log('🔄 Connecting to database...');

        // 1. Change default value
        console.log('📝 Setting default review_status to "to_be_reviewed"...');
        await pool.query("ALTER TABLE leads ALTER COLUMN review_status SET DEFAULT 'to_be_reviewed'");

        // 2. Update existing leads
        console.log('🚚 Moving approved leads to review queue...');
        const result = await pool.query(`
      UPDATE leads 
      SET review_status = 'to_be_reviewed' 
      WHERE review_status = 'approved' OR review_status IS NULL
    `);

        console.log(`✅ Success! Moved ${result.rowCount} leads to "To Be Reviewed".`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting lead status:', error);
        process.exit(1);
    }
};

resetStatus();
