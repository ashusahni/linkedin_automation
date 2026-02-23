# ⚙️ Configuration Directory

Centralized configuration management for the application.

## Files

- **index.js**: Main configuration export - imports all config and exports unified config object
- **database.js**: Database connection configuration
- **constants.js**: Application constants (statuses, limits, etc.)
- **env.js**: Environment variable loader (loads .env file)

## Usage

```javascript
import config from './config/index.js';

// Access configuration
const port = config.server.port;
const dbHost = config.database.host;
const apiKey = config.phantombuster.apiKey;

// Access constants
const status = config.constants.LEAD_STATUS.NEW;
```

## Adding New Configuration

1. Add to appropriate config file (or create new one)
2. Import and add to `config/index.js`
3. Use throughout application via `config` object

## Environment Variables

Environment variables are loaded from `backend/.env` file. See `.env.example` for required variables.

## Constants

All application constants (statuses, limits, etc.) are defined in `constants.js` to avoid magic strings/numbers throughout the codebase.
