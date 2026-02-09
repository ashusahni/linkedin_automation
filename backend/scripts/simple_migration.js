import pkg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables directly
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "linkedin_leads"
});

async function run() {
    console.log("Starting simple migration check...");
    console.log("DB Config:", {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        db: process.env.DB_NAME
    });

    try {
        const client = await pool.connect();
        console.log("✅ DB Connected");

        const sqlPath = path.resolve(__dirname, '../database/migrations/001_create_campaigns.sql');
        console.log("Reading SQL from:", sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing query...");
        await client.query(sql);
        console.log("✅ Migration command sent.");

        client.release();
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await pool.end();
        console.log("Pool closed");
    }
}

run();
