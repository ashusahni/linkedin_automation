import pg from 'pg';

const { Client } = pg;

const renderDbUrl = "postgresql://linkedin_user:PgqiG5wExKOKeCZfriulnieL2t6dzfeJ@dpg-d65h2rt6ubrc7394umkg-a.ohio-postgres.render.com/linkedin_reach_lx8i";

async function checkRenderDb() {
    const client = new Client({
        connectionString: renderDbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to Render DB successfully!");

        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log("Tables in Render DB:", result.rows.map(r => r.table_name));
    } catch (err) {
        console.error("Error connecting to Render DB:", err);
    } finally {
        await client.end();
    }
}

checkRenderDb();
