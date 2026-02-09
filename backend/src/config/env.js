/**
 * Environment Variables Loader
 * 
 * Loads environment variables from .env file.
 * This file is imported by config/index.js to ensure env vars are loaded before config is accessed.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// This file doesn't export anything - it just loads env vars
// The config/index.js imports this to ensure env vars are loaded
