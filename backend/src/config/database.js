/**
 * Database Configuration
 * Load .env first so DB_* are available (ESM imports run before config/index.js body).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function str(val) {
  return val != null && val !== '' ? String(val) : undefined;
}

const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'linkedin_leads',
  user: str(process.env.DB_USER) || 'postgres',
  password: str(process.env.DB_PASSWORD) ?? '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10)
};

export default databaseConfig;
