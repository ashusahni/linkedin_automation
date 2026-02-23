#!/usr/bin/env node
// CommonJS migration runner - avoids ESM config loading issues
// Run: node migrate023.cjs

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || 'postgres123'),
    database: process.env.DB_NAME || 'linkedin_leads',
    connectionTimeoutMillis: 10000,
});

const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/023_content_engine_v2.sql'), 'utf8');

pool.connect()
    .then(client => {
        console.log('✅ Connected to database');
        return client.query(sql)
            .then(() => {
                console.log('✅ Migration 023_content_engine_v2 applied successfully!');
                client.release();
            })
            .catch(err => {
                client.release();
                throw err;
            });
    })
    .then(() => pool.end())
    .then(() => { console.log('Done.'); process.exit(0); })
    .catch(err => {
        console.error('❌ Migration error:', err.message);
        pool.end().finally(() => process.exit(1));
    });
