#!/usr/bin/env node
/**
 * Add test email addresses to leads that don't have one.
 * Usage: node scripts/add_test_emails.js
 * Use this to test email generation (Gmail drafts) in campaigns.
 */
import pool from "../src/db.js";

async function run() {
    try {
        // Get leads without email
        const res = await pool.query(
            `SELECT id, first_name, last_name, email FROM leads WHERE email IS NULL OR TRIM(email) = '' ORDER BY id`
        );
        const leads = res.rows;
        console.log(`Found ${leads.length} lead(s) without email.\n`);

        if (leads.length === 0) {
            console.log('All leads already have emails. Nothing to do.');
            return;
        }

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const testEmail = `test${lead.id}@example.com`;
            await pool.query(
                `UPDATE leads SET email = $1 WHERE id = $2`,
                [testEmail, lead.id]
            );
            console.log(`  ✓ Lead ${lead.id} (${lead.first_name} ${lead.last_name}) → ${testEmail}`);
        }
        console.log(`\nDone! Added test emails to ${leads.length} lead(s).`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end?.();
    }
}

run();
