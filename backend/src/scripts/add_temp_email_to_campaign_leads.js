/**
 * Add temp (placeholder) email addresses to leads that are in a campaign.
 * Only updates leads that are in campaign_leads. Use --overwrite to replace
 * existing emails; by default only fills leads with no email.
 *
 * Run from backend directory:
 *   node src/scripts/add_temp_email_to_campaign_leads.js [campaignId] [--overwrite]
 *   node src/scripts/add_temp_email_to_campaign_leads.js --campaign=12 [--overwrite]
 */

import pool from '../db.js';

const TEMP_EMAIL_DOMAIN = 'tempmail.local';

function parseArgs(argv) {
  const options = {
    campaignId: null,
    overwrite: false
  };

  for (const arg of argv) {
    if (arg === '--overwrite') {
      options.overwrite = true;
      continue;
    }

    if (arg.startsWith('--campaign=')) {
      const raw = arg.split('=')[1];
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid campaign id: ${raw}`);
      }
      options.campaignId = parsed;
      continue;
    }

    const positional = Number.parseInt(arg, 10);
    if (!Number.isNaN(positional)) {
      options.campaignId = positional;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node src/scripts/add_temp_email_to_campaign_leads.js [campaignId] [--overwrite]');
  console.log('  node src/scripts/add_temp_email_to_campaign_leads.js --campaign=12 [--overwrite]');
  console.log('');
  console.log('Options:');
  console.log('  campaignId / --campaign=<id>  Limit to leads in this campaign only (omit for all campaigns)');
  console.log('  --overwrite                    Replace existing emails (default: only fill missing emails)');
  console.log('');
  console.log('Temp email format: lead-<id>@' + TEMP_EMAIL_DOMAIN);
}

async function run() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printUsage();
      return;
    }

    console.log('📧 Adding temp email addresses to campaign leads...');
    console.log(
      `Scope: ${options.campaignId ? `campaign ${options.campaignId}` : 'all campaigns'} | ` +
      `Mode: ${options.overwrite ? 'overwrite all emails' : 'fill only missing emails'}`
    );

    const query = `
      WITH target AS (
        SELECT DISTINCT
          l.id,
          l.email AS old_email
        FROM leads l
        INNER JOIN campaign_leads cl ON cl.lead_id = l.id
        WHERE ($1::int IS NULL OR cl.campaign_id = $1)
          AND (
            $2::boolean = true
            OR l.email IS NULL
            OR BTRIM(l.email) = ''
          )
      )
      UPDATE leads l
      SET
        email = 'lead-' || l.id || '@${TEMP_EMAIL_DOMAIN}',
        updated_at = NOW()
      FROM target t
      WHERE l.id = t.id
      RETURNING l.id, t.old_email, l.email AS new_email
    `;

    const result = await pool.query(query, [options.campaignId, options.overwrite]);
    const updated = result.rows.length;

    console.log(`✅ Updated ${updated} lead(s) with temp email @${TEMP_EMAIL_DOMAIN}.`);
    if (updated > 0) {
      const preview = result.rows.slice(0, 10);
      console.log('Preview (first 10):');
      for (const row of preview) {
        console.log(
          `  Lead ${row.id}: ${row.old_email || '(empty)'} -> ${row.new_email}`
        );
      }
      if (updated > 10) {
        console.log(`  ...and ${updated - 10} more`);
      }
    } else {
      console.log('No matching campaign leads found (or all already have emails without --overwrite).');
    }
  } catch (error) {
    console.error('❌ Failed to add temp emails:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
