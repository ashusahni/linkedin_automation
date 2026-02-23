import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import pool from "../src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function applyMigration() {
    console.log("🔧 Applying Migration 010: Add unique constraint to lead_enrichment\n");
    
    try {
        // Read migration file
        const migrationPath = path.resolve(__dirname, "../database/migrations/010_add_unique_lead_enrichment.sql");
        const migrationSQL = await fs.readFile(migrationPath, "utf-8");
        
        console.log("📋 Migration SQL:");
        console.log(migrationSQL);
        console.log("\n" + "=".repeat(60) + "\n");
        
        // Execute migration
        console.log("⚙️  Executing migration...\n");
        await pool.query(migrationSQL);
        
        console.log("✅ Migration applied successfully!\n");
        
        // Verify the constraint was added
        console.log("🔍 Verifying constraint...\n");
        const result = await pool.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'lead_enrichment'
            AND constraint_type = 'UNIQUE'
        `);
        
        if (result.rows.length > 0) {
            console.log("✅ Unique constraint verified:");
            result.rows.forEach(row => {
                console.log(`   - ${row.constraint_name} (${row.constraint_type})`);
            });
        } else {
            console.log("⚠️  Warning: Could not verify unique constraint");
        }
        
        console.log("\n" + "=".repeat(60));
        console.log("✨ Migration complete! lead_enrichment now has unique constraint on lead_id");
        console.log("=".repeat(60) + "\n");
        
    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        console.error("\nFull error:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyMigration();
