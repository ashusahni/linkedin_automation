/**
 * Google Sheets Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a clean interface to the Google Sheets API for the Content Engine.
 *
 * Current capabilities:
 *   - appendPost(content)          → Append [post_content, 'pending'] to Sheet1!A:B
 *   - updateRowStatus(row, status) → (Future) Update col B of a specific row
 *   - getRows()                    → (Future) Read all rows for deduplication
 *
 * Authentication:
 *   - Service account JSON: backend/src/config/linkedin-post-488117-96c95d33663a.json
 *   - Scope: https://www.googleapis.com/auth/spreadsheets
 *
 * Config via environment variables:
 *   - GOOGLE_SHEET_ID   → Spreadsheet ID (from the sheet URL)
 *
 * ⚠️  Credentials are NEVER exposed to the frontend or committed publicly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CREDENTIALS_PATH = path.resolve(
    __dirname,
    '../config/linkedin-post-488117-96c95d33663a.json'
);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Target range: Sheet1, columns A and B (post content + status)
 * Format: [ [post_content, phantom_status], ... ]
 */
const SHEET_RANGE = 'Sheet1!A:B';

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * Build an authenticated Google Auth client using the service account.
 * Throws clearly if credentials file is missing.
 */
function getAuthClient() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(
            `Google Sheets credentials file not found at: ${CREDENTIALS_PATH}\n` +
            `Ensure the service account JSON is placed at backend/src/config/`
        );
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });

    return auth;
}

// ─── SHEET ID VALIDATION ──────────────────────────────────────────────────────

function getSheetId() {
    const id = process.env.GOOGLE_SHEET_ID;
    if (!id) {
        throw new Error(
            'GOOGLE_SHEET_ID is not set in .env. ' +
            'Add: GOOGLE_SHEET_ID=1R0KY7cQFAlfdXuBgas5XHYwC78BAaB49w51pR76Aotg'
        );
    }
    return id;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

const GoogleSheetsService = {

    /**
     * Append a single post to the Google Sheet.
     *
     * Row format: | post_content | pending |
     * Range:      Sheet1!A:B
     *
     * @param {string} postContent  - The LinkedIn post text to append
     * @returns {Promise<object>}   - Google Sheets API response
     */
    async appendPost(postContent) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        const sanitizedContent = (postContent || '').trim();

        if (!sanitizedContent) {
            throw new Error('Cannot append empty post content to Google Sheet.');
        }

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: SHEET_RANGE,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[sanitizedContent, 'pending']],
            },
        });

        console.log(
            `📊 GoogleSheets: Appended post to sheet. ` +
            `Updated range: ${response.data.updates?.updatedRange || 'unknown'}`
        );

        return response.data;
    },

    /**
     * (Future Use) Update the status column (col B) of a specific row.
     *
     * @param {number} rowIndex  - 1-based row index in the sheet
     * @param {string} status    - New status value to write (e.g. 'posted', 'failed')
     * @returns {Promise<object>}
     */
    async updateRowStatus(rowIndex, status) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        const range = `Sheet1!B${rowIndex}`;

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[status]],
            },
        });

        console.log(`📊 GoogleSheets: Updated row ${rowIndex} status to "${status}"`);
        return response.data;
    },

    /**
     * (Future Use) Fetch all rows from the sheet for cross-referencing.
     *
     * @returns {Promise<Array<Array<string>>>}  - 2D array of cell values
     */
    async getRows() {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: SHEET_RANGE,
        });

        return response.data.values || [];
    },

    /**
     * Health check — verifies credentials and sheet access.
     * Call this at startup to surface config errors early.
     *
     * @returns {Promise<{ ok: boolean, sheetId: string, tabCount: number }>}
     */
    async healthCheck() {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        const response = await sheets.spreadsheets.get({ spreadsheetId });
        return {
            ok: true,
            sheetId: spreadsheetId,
            title: response.data.properties?.title,
            tabCount: response.data.sheets?.length || 0,
        };
    },
};

export default GoogleSheetsService;
