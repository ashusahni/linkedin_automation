/**
 * LinkedIn Search Lead Sources – Google Sheet
 * Sheet columns: title, search, industry, country, connection_degree, status, created_at, limit
 * Env: LINKEDIN_SEARCH_SHEET_ID (same credentials as GOOGLE_SHEETS_*)
 */

import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CREDENTIALS_PATH = path.resolve(
    __dirname,
    '../config/linkedin-automation-489421-4a0e07acadd5.json'
);

function getCredentialsPath() {
    const envPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
    if (envPath) {
        return path.isAbsolute(envPath) ? envPath : path.resolve(__dirname, '../..', envPath);
    }
    return DEFAULT_CREDENTIALS_PATH;
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Return the service account email from credentials (for permission error messages).
 */
function getServiceAccountEmail() {
    const credentialsPath = getCredentialsPath();
    if (!fs.existsSync(credentialsPath)) return null;
    try {
        const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        return creds.client_email || null;
    } catch {
        return null;
    }
}

/**
 * If the error is a Google Sheets permission error, throw a clearer message with share instructions.
 */
function wrapPermissionError(err, context = 'access the sheet') {
    const msg = (err && err.message) ? String(err.message) : '';
    const code = err && err.code;
    const status = err && err.response && err.response.status;
    const isPermission = status === 403 || code === 403 || (msg && /permission|caller does not have|insufficient|403/i.test(msg));
    if (isPermission) {
        const email = getServiceAccountEmail();
        const shareHint = email
            ? ` Share the Google Sheet with this account (Editor): ${email}`
            : ' Share the Google Sheet with the service account email from your credentials JSON (Editor access).';
        throw new Error(`Google Sheets: permission denied when trying to ${context}.${shareHint}`);
    }
    throw err;
}

function getAuthClient() {
    const credentialsPath = getCredentialsPath();
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(
            `Google Sheets credentials not found at: ${credentialsPath}. Set GOOGLE_SHEETS_CREDENTIALS_PATH or add service account JSON.`
        );
    }
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const email = credentials.client_email || '(unknown)';
    if (!getAuthClient._logged) {
        console.log(`📋 Lead Source sheet: using credentials ${path.basename(credentialsPath)} (${email})`);
        getAuthClient._logged = true;
    }
    return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

function getSheetId() {
    const id = (process.env.LINKEDIN_SEARCH_SHEET_ID || '').trim();
    if (!id) {
        throw new Error('LINKEDIN_SEARCH_SHEET_ID is not set in .env. Add it for Lead Source instances, then restart the backend.');
    }
    return id;
}

const SHEET_NAME = 'Sheet1';
const RANGE_ALL = `${SHEET_NAME}!A:H`;
const COLUMNS = ['title', 'search', 'industry', 'country', 'connection_degree', 'status', 'created_at', 'limit'];

function rowToObject(values, rowIndex) {
    const limitRaw = values[7];
    const limit = limitRaw !== undefined && limitRaw !== '' && Number(limitRaw) > 0 ? Number(limitRaw) : null;
    return {
        id: rowIndex,
        title: values[0] ?? '',
        search: values[1] ?? '',
        industry: values[2] ?? '',
        country: values[3] ?? '',
        connection_degree: values[4] ?? '2nd',
        status: values[5] ?? 'pending',
        created_at: values[6] ?? '',
        limit,
    };
}

const LinkedInSearchSheetService = {
    /**
     * Append a new lead source instance.
     * @param {Object} opts - title, search, industry?, country?, connection_degree?, limit? (default 20)
     * @returns {Promise<{ id: number, updatedRange: string }>} row index (1-based) and range
     */
    async appendInstance({ title, search, industry = '', country = '', connection_degree = '2nd', limit = 20 }) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();
        const created_at = new Date().toISOString();
        const status = 'pending';
        const limitNum = limit != null && limit !== '' && Number(limit) > 0 ? Math.min(Number(limit), 1000) : 20;

        try {
            const response = await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: RANGE_ALL,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [[title || '', (search || '').trim(), industry, country, connection_degree, status, created_at, limitNum]],
                },
            });

            const updatedRange = response.data.updates?.updatedRange || '';
            const match = updatedRange.match(/!A(\d+):/i);
            const rowIndex = match ? parseInt(match[1], 10) : null;
            if (rowIndex) {
                console.log(`📋 Lead source instance appended at row ${rowIndex}`);
            }
            return { id: rowIndex, updatedRange, created_at, status };
        } catch (err) {
            wrapPermissionError(err, 'append a row to the Lead Source sheet');
        }
    },

    /**
     * Get all lead source instances (skip header row if present).
     * @returns {Promise<Array<{ id: number, title, search, industry, country, connection_degree, status, created_at }>>}
     */
    async getAllInstances() {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: RANGE_ALL,
            });

            const rows = response.data.values || [];
            const instances = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const firstCell = (row[0] ?? '').toString().trim().toLowerCase();
                if (firstCell === 'title' || firstCell === '') continue;
                const rowIndex = i + 1;
                instances.push(rowToObject(row, rowIndex));
            }
            return instances;
        } catch (err) {
            wrapPermissionError(err, 'read the Lead Source sheet');
        }
    },

    /**
     * Get one instance by row index (1-based).
     */
    async getInstanceByRow(rowIndex) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();
        const range = `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`;

        try {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = response.data.values || [];
            if (rows.length === 0) return null;
            return rowToObject(rows[0], rowIndex);
        } catch (err) {
            wrapPermissionError(err, 'read the Lead Source sheet');
        }
    },

    /**
     * Update status column for a row (1-based).
     */
    async updateStatus(rowIndex, status) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();
        const range = `${SHEET_NAME}!F${rowIndex}`;

        try {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: { values: [[status]] },
            });
            console.log(`📋 Lead source row ${rowIndex} status → ${status}`);
        } catch (err) {
            wrapPermissionError(err, 'update the Lead Source sheet');
        }
    },

    /**
     * Delete a lead source instance (remove the row from the sheet). rowIndex is 1-based.
     */
    async deleteInstance(rowIndex) {
        const auth = getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = getSheetId();

        try {
            const meta = await sheets.spreadsheets.get({ spreadsheetId });
            const sheet = (meta.data.sheets || []).find(
                (s) => (s.properties?.title || '').toLowerCase() === SHEET_NAME.toLowerCase()
            );
            const sheetId = sheet?.properties?.sheetId;
            if (sheetId == null) {
                throw new Error(`Sheet "${SHEET_NAME}" not found`);
            }
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            deleteDimension: {
                                range: {
                                    sheetId,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex - 1,
                                    endIndex: rowIndex,
                                },
                            },
                        },
                    ],
                },
            });
            console.log(`📋 Lead source row ${rowIndex} deleted from sheet`);
        } catch (err) {
            wrapPermissionError(err, 'delete a row from the Lead Source sheet');
        }
    },
};

export default LinkedInSearchSheetService;
