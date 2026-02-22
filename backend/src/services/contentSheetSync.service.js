/**
 * Content Sheet Sync Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs a cron job every 2 minutes that:
 *
 *  1. Queries `content_items` for posts that are:
 *       status = 'SCHEDULED'
 *       AND scheduled_at <= NOW()
 *       AND phantom_status = 'pending'   ← idempotency guard
 *
 *  2. For each qualifying post:
 *       a. Appends the post content to Google Sheet (Sheet1!A:B)
 *       b. Updates the DB: phantom_status = 'queued'
 *
 *  This ensures the same post is NEVER appended twice.
 *  Phantom reads the sheet and posts to LinkedIn automatically.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ⚠️  DOES NOT MODIFY:
 *   - Campaign engine / scheduler.service.js
 *   - Status machine in content-engine.service.js
 *   - Any campaign/lead tables or automation flows
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';
import pool from '../db.js';
import GoogleSheetsService from './googleSheets.service.js';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

/** Cron runs every 2 minutes. Adjust if needed. */
const SYNC_CRON_SCHEDULE = '*/2 * * * *';

// ─── CORE SYNC FUNCTION ───────────────────────────────────────────────────────

/**
 * Find all scheduled posts ready for Google Sheets and append them.
 * Returns a summary { checked, queued, failed }.
 */
export async function syncScheduledPostsToSheet() {
    const summary = { checked: 0, queued: 0, failed: 0, details: [] };

    try {
        // ── Query: find posts ready to be sent to Google Sheet ────────────────
        const result = await pool.query(`
            SELECT id, title, edited_content, generated_content, scheduled_at, persona, industry
            FROM content_items
            WHERE status = 'SCHEDULED'
              AND scheduled_at <= NOW()
              AND phantom_status = 'pending'
            ORDER BY scheduled_at ASC
        `);

        const posts = result.rows;
        summary.checked = posts.length;

        if (posts.length === 0) {
            console.log('📊 ContentSheetSync: No posts pending for Google Sheets sync.');
            return summary;
        }

        console.log(`📊 ContentSheetSync: Found ${posts.length} post(s) to sync to Google Sheets.`);

        // ── Process each post ─────────────────────────────────────────────────
        for (const post of posts) {
            const postContent = (post.edited_content || post.generated_content || '').trim();

            if (!postContent) {
                console.warn(`⚠️  ContentSheetSync: Post ID ${post.id} has empty content — skipping.`);
                summary.details.push({ id: post.id, status: 'skipped', reason: 'empty content' });
                continue;
            }

            try {
                // 1️⃣  Append to Google Sheet
                await GoogleSheetsService.appendPost(postContent);

                // 2️⃣  Mark as queued in DB (prevents re-append on next cron tick)
                await pool.query(
                    `UPDATE content_items
                     SET phantom_status = 'queued',
                         updated_at = NOW()
                     WHERE id = $1`,
                    [post.id]
                );

                summary.queued++;
                summary.details.push({ id: post.id, status: 'queued', title: post.title });

                console.log(
                    `✅ ContentSheetSync: Post ID ${post.id} ("${post.title || 'Untitled'}") ` +
                    `appended to Google Sheet → phantom_status = 'queued'`
                );

            } catch (postError) {
                // Non-fatal: log but don't change phantom_status so it retries next cycle
                summary.failed++;
                summary.details.push({ id: post.id, status: 'failed', error: postError.message });
                console.error(
                    `❌ ContentSheetSync: Failed to sync post ID ${post.id}:`,
                    postError.message
                );
            }
        }

    } catch (queryError) {
        console.error('❌ ContentSheetSync: DB query failed:', queryError.message);
    }

    return summary;
}

// ─── CRON INITIALISER ─────────────────────────────────────────────────────────

/**
 * Start the Content → Google Sheets sync cron.
 * Call this from server.js alongside initScheduler().
 *
 * Guard: respects GOOGLE_SHEETS_ENABLED env flag.
 */
export function initContentSheetSync() {
    const enabled = process.env.GOOGLE_SHEETS_ENABLED !== 'false'; // default: true

    if (!enabled) {
        console.log('📊 ContentSheetSync: Disabled (GOOGLE_SHEETS_ENABLED=false). Skipping cron.');
        return;
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
        console.warn(
            '⚠️  ContentSheetSync: GOOGLE_SHEET_ID not set in .env — sync will not run.\n' +
            '   Add: GOOGLE_SHEET_ID=1R0KY7cQFAlfdXuBgas5XHYwC78BAaB49w51pR76Aotg'
        );
        return;
    }

    console.log(`📊 ContentSheetSync: Starting cron (${SYNC_CRON_SCHEDULE}) for sheet ${sheetId}`);

    // Optional: run once immediately at startup to catch any missed posts
    syncScheduledPostsToSheet()
        .then(s => console.log(`📊 ContentSheetSync [startup]: checked=${s.checked}, queued=${s.queued}, failed=${s.failed}`))
        .catch(err => console.error('📊 ContentSheetSync [startup] error:', err.message));

    // Schedule recurring sync
    cron.schedule(SYNC_CRON_SCHEDULE, async () => {
        console.log(`📊 ContentSheetSync [cron]: Running scheduled sync...`);
        try {
            const s = await syncScheduledPostsToSheet();
            if (s.checked > 0) {
                console.log(`📊 ContentSheetSync [cron]: checked=${s.checked}, queued=${s.queued}, failed=${s.failed}`);
            }
        } catch (err) {
            console.error('📊 ContentSheetSync [cron] uncaught error:', err.message);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata', // Adjust if needed — or remove for UTC
    });

    console.log('✅ ContentSheetSync: Cron registered successfully.');
}
