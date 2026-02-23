import pool from '../db.js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

// Helper to respect DB column length limits
function safeTruncate(value, maxLength) {
    if (value === null || value === undefined) return null;
    const str = String(value);
    return str.length > maxLength ? str.slice(0, maxLength) : str;
}

async function run() {
    const args = process.argv.slice(2);
    const csvPath = args[0];

    try {
        console.log('🗑️  Deleting all leads...');
        // Delete dependent rows first
        await pool.query("DELETE FROM lead_enrichment");
        await pool.query("DELETE FROM campaign_leads");
        const deleteResult = await pool.query("DELETE FROM leads");
        console.log(`✅ Deleted ${deleteResult.rowCount} leads.`);

        if (csvPath) {
            console.log(`📂 Importing fresh leads from ${csvPath}...`);
            if (!fs.existsSync(csvPath)) {
                console.error(`❌ File not found: ${csvPath}`);
                process.exit(1);
            }

            const fileContent = fs.readFileSync(csvPath, 'utf8');
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            console.log(`Found ${records.length} records. Inserting...`);
            let saved = 0;
            let duplicates = 0;
            let errors = 0;

            for (const record of records) {
                try {
                    const leadData = {
                        full_name: record.full_name || record.fullName || record.name || record['Full Name'] || null,
                        first_name: record.first_name || record.firstName || record['First Name'] || null,
                        last_name: record.last_name || record.lastName || record['Last Name'] || null,
                        title: record.title || record.jobTitle || record['Job Title'] || null,
                        company: record.company || record.companyName || record['Company'] || null,
                        location: record.location || record.Location || null,
                        linkedin_url: record.linkedin_url || record.linkedinUrl || record.profileUrl || record['LinkedIn URL'] || null,
                        email: record.email || record.Email || null,
                        phone: record.phone || record.Phone || null,
                        source: record.source || 'manual_reset',
                        status: 'new'
                    };

                    // Skip if no meaningful data
                    if (!leadData.full_name && !leadData.first_name && !leadData.linkedin_url) {
                        continue;
                    }

                    const values = [
                        safeTruncate(leadData.full_name, 255),
                        safeTruncate(leadData.first_name, 100),
                        safeTruncate(leadData.last_name, 100),
                        safeTruncate(leadData.title, 255),
                        safeTruncate(leadData.company, 255),
                        safeTruncate(leadData.location, 255),
                        safeTruncate(leadData.linkedin_url, 500),
                        safeTruncate(leadData.email, 255),
                        safeTruncate(leadData.phone, 50),
                        safeTruncate(leadData.source, 100),
                        leadData.status
                    ];

                    const result = await pool.query(
                        `INSERT INTO leads (
                    full_name, first_name, last_name, title, company, 
                    location, linkedin_url, email, phone, source, status
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                  ON CONFLICT (linkedin_url) DO NOTHING
                  RETURNING id`,
                        values
                    );

                    if (result.rows.length > 0) {
                        saved++;
                    } else {
                        duplicates++;
                    }
                } catch (err) {
                    console.error(`Error processing record: ${err.message}`);
                    errors++;
                }
            }
            console.log(`✅ Import finished: ${saved} saved, ${duplicates} duplicates, ${errors} errors.`);
        } else {
            console.log('No CSV file provided via argument. Database is now empty (leads table).');
            console.log('Usage: node src/scripts/reset_leads.js <path_to_csv>');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

run();
