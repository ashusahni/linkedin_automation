/**
 * Centralized Configuration Management
 *
 * This module exports all configuration values for the application.
 * It loads environment variables and provides typed access to config.
 */

/**
 * Centralized Configuration Management
 *
 * This module exports all configuration values for the application.
 * Loads .env from multiple locations so it works on every device and deployment:
 * same keys work in production and locally regardless of where you run npm run dev.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build a list of candidate .env paths in priority order (first found wins).
const backendRoot = path.resolve(__dirname, "../..");
const cwd = process.cwd();

function* envSearchPaths() {
  // 1) Backend folder (when running from backend/ or linkedin_automation/)
  yield path.join(backendRoot, ".env");
  // 2) Parent of backend (e.g. linkedin_automation/.env)
  yield path.join(backendRoot, "..", ".env");
  // 3) Current working directory (e.g. if you run from repo root or anywhere)
  yield path.join(cwd, ".env");
  // 4) Walk up from cwd and look for .env in each parent (handles workspace root or nested runs)
  let dir = cwd;
  for (let i = 0; i < 10 && dir; i++) {
    const p = path.join(dir, ".env");
    yield p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

let loadedPath = null;
const seen = new Set();
for (const envPath of envSearchPaths()) {
  const normalized = path.normalize(envPath);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  if (fs.existsSync(normalized)) {
    const result = dotenv.config({ path: normalized, override: false });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedPath = normalized;
      break;
    }
  }
}

if (loadedPath) {
  try {
    console.log(`✅ Loaded .env from: ${path.relative(cwd, loadedPath) || path.basename(loadedPath)}`);
  } catch {
    console.log(`✅ Loaded .env from: ${loadedPath}`);
  }
} else {
  dotenv.config();
  if (!process.env.DATABASE_HOST && !process.env.PORT) {
    console.warn("⚠️  No .env file found. Searched: backend/, parent, cwd, and parents of cwd. Add a .env (e.g. in backend/ or project root) with your keys.");
  }
}
import databaseConfig from './database.js';
import constants from './constants.js';

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || '*'
    }
  },

  // Database Configuration
  database: databaseConfig,

  // PhantomBuster Configuration
  phantombuster: {
    apiKey: process.env.PHANTOMBUSTER_API_KEY,
    apiUrl: 'https://api.phantombuster.com/api/v2',
    phantomIds: {
      connectionsExport: process.env.CONNECTIONS_EXPORT_PHANTOM_ID,
      searchExport: process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID, // LinkedIn Search Export
      profileScraper: process.env.PROFILE_SCRAPER_PHANTOM_ID,
      linkedinOutreach: process.env.LINKEDIN_OUTREACH_PHANTOM_ID ||
        process.env.PHANTOM_CONNECT_ID ||
        process.env.PHANTOM_NETWORK_BOOSTER_ID ||
        process.env.AUTO_CONNECT_PHANTOM_ID,
      messageSender: process.env.PHANTOM_MESSAGE_SENDER_ID ||
        process.env.LINKEDIN_MESSAGE_PHANTOM_ID ||
        process.env.MESSAGE_SENDER_PHANTOM_ID
    },
    sessionCookie: process.env.LINKEDIN_SESSION_COOKIE
  },

  // Hunter.io Configuration
  hunter: {
    apiKey: process.env.HUNTER_API_KEY
  },

  // AI Configuration (model is read from env on each request in ai.service.js for global Settings sync)
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    claude: {
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5'
    }
  },

  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY
    },
    ses: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    from: {
      email: process.env.EMAIL_FROM || 'noreply@example.com',
      name: process.env.EMAIL_FROM_NAME || 'LinkedIn Automation Engine'
    }
  },

  // Application Constants
  constants: constants,

  // Feature Flags
  features: {
    scheduler: {
      enabled: process.env.SCHEDULER_ENABLED !== 'false',
      interval: process.env.SCHEDULER_INTERVAL || '1 * * * *' // Every minute
    },
    approval: {
      enabled: process.env.APPROVAL_ENABLED !== 'false'
    }
  },

  // Default profile for My Contacts / tier prioritization when no preferences are set.
  // Keeps relevant connections (same industry as this profile) on top everywhere.
  defaultProfile: {
    linkedinUrl: process.env.DEFAULT_PROFILE_URL || 'https://www.linkedin.com/in/rishab-khandelwal-954484101/',
    industry: process.env.DEFAULT_PROFILE_INDUSTRY || 'Manufacturing',
    subIndustry: process.env.DEFAULT_PROFILE_SUB_INDUSTRY || null, // e.g. 'Chemical Manufacturing'
  },

  // Branding Configuration
  branding: {
    userName: process.env.APP_USER_NAME || '',
    companyName: process.env.APP_COMPANY_NAME || 'Scottish Chemical Industries',
    logoUrl: process.env.APP_LOGO_URL || '/api/settings/logo/default',
    navLogoUrl: process.env.APP_NAV_LOGO_URL || '/api/settings/logo/nav',
    profileImageUrl: process.env.APP_PROFILE_IMAGE_URL || '',
    theme: process.env.APP_THEME || 'default'
  }
};

// Validation
function validateConfig() {
  const required = [
    'database.host',
    'database.database',
    'database.user',
    'database.password'
  ];

  const missing = required.filter(key => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (!value) return true;
    }
    return false;
  });

  if (missing.length > 0) {
    console.warn('⚠️  Missing required configuration:', missing.join(', '));
  }
}

// Validate on load
validateConfig();

export default config;
