# 📁 Source Code Directory

This directory contains all the main application source code.

## Structure

```
src/
├── app.js                    # Express application setup
├── server.js                 # Server entry point and startup
├── config/                   # Configuration management
├── controllers/              # Request handlers
├── routes/                   # API route definitions
├── services/                 # Business logic layer
├── models/                   # Data models
├── middleware/               # Express middleware
├── utils/                    # Shared utilities
└── db.js                     # Database connection
```

## Key Files

- **app.js**: Express app configuration, middleware setup, route registration
- **server.js**: Server startup, database migrations, scheduler initialization
- **db.js**: PostgreSQL connection pool

## Modules

### Controllers (`controllers/`)
Handle HTTP requests and responses. Controllers should:
- Validate request data
- Call appropriate services
- Format responses
- Handle errors

### Services (`services/`)
Contain business logic. Services should:
- Implement core functionality
- Interact with database
- Call external APIs
- Be testable (no req/res objects)

### Routes (`routes/`)
Define API endpoints and connect to controllers.

### Config (`config/`)
Centralized configuration management:
- `index.js`: Main config export
- `database.js`: Database configuration
- `constants.js`: Application constants
- `env.js`: Environment variable loader

### Utils (`utils/`)
Shared utility functions:
- `logger.js`: Logging utility
- `errors.js`: Custom error classes
- `validators.js`: Validation helpers
- `helpers.js`: General helper functions

## Import Guidelines

1. **Always use relative imports** within `src/`
2. **Use config** from `./config/index.js` instead of `process.env` directly
3. **Use constants** from `./config/constants.js` instead of magic strings
4. **Use utils** for common operations instead of duplicating code

## Example Usage

```javascript
// ✅ Good - Using config
import config from './config/index.js';
const apiKey = config.phantombuster.apiKey;

// ✅ Good - Using constants
import constants from './config/constants.js';
if (status === constants.LEAD_STATUS.NEW) { ... }

// ✅ Good - Using utils
import { validateEmail, truncate } from './utils/helpers.js';

// ❌ Bad - Direct process.env access
const apiKey = process.env.PHANTOMBUSTER_API_KEY;

// ❌ Bad - Magic strings
if (status === 'new') { ... }
```
