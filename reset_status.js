
import { pool } from '../backend/src/config/db.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from backend directory
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const resetReviewStatus = async () => {
    try {
        console.log('🔄 Resetting all leads to "to_be_reviewed"...');
        const result = await pool.query(`
      UPDATE leads 
      SET review_status = 'to_be_reviewed'
    `);
        console.log(`✅ Updated ${result.rowCount} leads.`);
    } catch (err) {
        console.error('❌ Error resetting status:', err);
    } finally {
        await pool.end();
    }
};

resetReviewStatus();
