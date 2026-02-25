import pkg from 'pg';
import fs from 'fs';
const { Pool } = pkg;

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

async function run() {
    const getCols = async (pool) => {
        const client = await pool.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'");
        client.release();
        return res.rows.map(r => r.column_name);
    };

    const local = await getCols(localPool);
    const render = await getCols(renderPool);

    fs.writeFileSync('schema_diff.json', JSON.stringify({ local, render }, null, 2));
    process.exit(0);
}

run();
