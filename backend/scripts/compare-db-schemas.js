import pkg from 'pg';
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

async function compareColumns(tableName) {
    console.log(`\n📊 Comparing columns for: ${tableName}`);

    const getCols = async (pool) => {
        const client = await pool.connect();
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY column_name
    `, [tableName]);
        client.release();
        return res.rows.map(r => r.column_name);
    };

    try {
        const localCols = await getCols(localPool);
        const renderCols = await getCols(renderPool);

        console.log(`   Local Table:  ${localCols.length} columns`);
        console.log(`   Render Table: ${renderCols.length} columns`);

        const missingInRender = localCols.filter(c => !renderCols.includes(c));
        const missingInLocal = renderCols.filter(c => !localCols.includes(c));

        if (missingInRender.length > 0) {
            console.log(`   ❌ Missing on Render: ${missingInRender.join(', ')}`);
        } else {
            console.log(`   ✅ Render has all local columns`);
        }

        if (missingInLocal.length > 0) {
            console.log(`   ⚠️  Missing on Local: ${missingInLocal.join(', ')}`);
        }
    } catch (err) {
        console.error(`   ❌ Error: ${err.message}`);
    }
}

async function run() {
    await compareColumns('leads');
    await localPool.end();
    await renderPool.end();
}

run();
