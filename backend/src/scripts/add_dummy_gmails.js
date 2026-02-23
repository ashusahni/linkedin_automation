import pool from '../db.js';

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

    // Backward-compatible positional campaign id:
    // node add_dummy_gmails.js 12
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
  console.log('  node src/scripts/add_dummy_gmails.js [campaignId] [--overwrite]');
  console.log('  node src/scripts/add_dummy_gmails.js --campaign=12 [--overwrite]');
  console.log('');
  console.log('Options:');
  console.log('  campaignId / --campaign=<id>  Limit updates to a single campaign');
  console.log('  --overwrite                   Replace existing emails too (default: only blank emails)');
}

async function run() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printUsage();
      return;
    }

    console.log('📧 Adding dummy Gmail addresses to campaign leads...');
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
        email = CONCAT('dummy.lead', l.id, '@gmail.com'),
        updated_at = NOW()
      FROM target t
      WHERE l.id = t.id
      RETURNING l.id, t.old_email, l.email AS new_email
    `;

    const result = await pool.query(query, [options.campaignId, options.overwrite]);
    const updated = result.rows.length;

    console.log(`✅ Updated ${updated} lead(s).`);
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
      console.log('No matching leads found for the selected scope.');
    }
  } catch (error) {
    console.error('❌ Failed to add dummy gmails:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
