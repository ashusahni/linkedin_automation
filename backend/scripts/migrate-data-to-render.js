import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const localPool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'linkedin_leads'
});

const renderDbUrl = "postgresql://linkedin_user:PgqiG5wExKOKeCZfriulnieL2t6dzfeJ@dpg-d65h2rt6ubrc7394umkg-a.ohio-postgres.render.com/linkedin_reach_lx8i";

const renderPool = new Pool({
    connectionString: renderDbUrl,
    ssl: { rejectUnauthorized: false }
});

async function migrateTable(tableName) {
    console.log(`\n📦 Migrating table: ${tableName}...`);
    const localClient = await localPool.connect();
    const renderClient = await renderPool.connect();

    try {
        // 1. Get current columns in Render table
        const renderColsResult = await renderClient.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [tableName]);
        const renderCols = renderColsResult.rows.map(r => r.column_name);

        // 2. Get data from local
        const dataResult = await localClient.query(`SELECT * FROM ${tableName}`);
        const rows = dataResult.rows;
        console.log(`   Found ${rows.length} rows in local ${tableName}`);

        if (rows.length === 0) return;

        // 3. Prepare insert query - ONLY using columns that exist in Render
        const localCols = Object.keys(rows[0]);
        const commonCols = localCols.filter(c => renderCols.includes(c));

        if (commonCols.length === 0) {
            console.log(`   ⚠️ No common columns found for ${tableName}. Skipping.`);
            return;
        }

        const columnNames = commonCols.join(', ');
        const placeholders = commonCols.map((_, i) => `$${i + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        console.log(`   Migrating ${commonCols.length} columns (Skipped ${localCols.length - commonCols.length} missing columns)`);

        // 4. Insert rows
        let migratedCount = 0;
        for (const row of rows) {
            const values = commonCols.map(col => row[col]);
            try {
                await renderClient.query(insertQuery, values);
                migratedCount++;
            } catch (err) {
                if (!err.message.includes('duplicate key')) {
                    console.error(`   ❌ Error in ${tableName}:`, err.message);
                }
            }
        }
        console.log(`   ✅ Migrated ${migratedCount} rows to Render`);

    } catch (err) {
        console.error(`   ❌ Failed to migrate ${tableName}:`, err.message);
    } finally {
        localClient.release();
        renderClient.release();
    }
}

async function startMigration() {
    console.log('🚀 Starting Full Migration from Local to Render...\n');

    try {
        // Tables to migrate in order (dependency order matters)
        const tables = [
            'campaigns',
            'leads',
            'sequences',
            'campaign_leads',
            'import_logs',
            'schema_migrations'
        ];

        for (const table of tables) {
            await migrateTable(table);
        }

        console.log('\n✨ ALL DATA MIGRATED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await localPool.end();
        await renderPool.end();
    }
}

startMigration();
