import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const renderDbUrl = "postgresql://linkedin_user:PgqiG5wExKOKeCZfriulnieL2t6dzfeJ@dpg-d65h2rt6ubrc7394umkg-a.ohio-postgres.render.com/linkedin_reach_lx8i";

const pool = new Pool({
    connectionString: renderDbUrl,
    ssl: { rejectUnauthorized: false }
});

async function runAllMigrations() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running migrations on RENDER database...\n');

        // Create schema_migrations table if it doesn't exist
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        const migrationsDir = path.resolve(__dirname, '../database/migrations');

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
                const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
                return numA - numB;
            });

        console.log(`Found ${files.length} migration file(s)\n`);

        for (const filename of files) {
            const filePath = path.join(migrationsDir, filename);
            const match = filename.match(/^(\d+)/);
            const migrationNumber = match ? parseInt(match[1], 10) : 0;

            const checkResult = await client.query(
                'SELECT version FROM schema_migrations WHERE version = $1',
                [migrationNumber]
            );

            if (checkResult.rows.length > 0) {
                console.log(`Skip ${filename} (already run)`);
                continue;
            }

            console.log(`📄 Running ${filename}...`);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
                    [migrationNumber, filename]
                );
                console.log(`✅ ${filename} completed\n`);
            } catch (error) {
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate') ||
                    (error.message.includes('column') && error.message.includes('already exists'))) {
                    console.log(`⚠️  ${filename}: Already exists (continuing...)\n`);
                    await client.query(
                        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
                        [migrationNumber, filename]
                    );
                } else {
                    console.error(`❌ ${filename} failed:`, error.message);
                    console.log(`   Continuing...\n`);
                }
            }
        }

        console.log('✅ Render DB Schema setup complete!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runAllMigrations();
