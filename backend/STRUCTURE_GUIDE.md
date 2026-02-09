# 📐 Codebase Structure Guide

Quick reference guide for understanding the codebase structure.

## 🗂️ Directory Overview

```
backend/
├── src/                    # Main source code
│   ├── config/            # ⚙️ Configuration & constants
│   ├── controllers/       # 🎮 Request handlers
│   ├── routes/            # 🛣️ API route definitions
│   ├── services/          # 💼 Business logic
│   ├── models/            # 📊 Data models
│   ├── middleware/        # 🔒 Express middleware
│   ├── utils/             # 🛠️ Shared utilities
│   └── db/                # 🗄️ Database (migrations, etc.)
├── database/              # 📦 Database schemas & migrations
├── scripts/               # 📜 Utility scripts
└── docs/                  # 📚 Documentation
```

## 🎯 Where to Put Things

### Adding a New API Endpoint

1. **Route** → `src/routes/[feature].routes.js`
   ```javascript
   router.post('/endpoint', controllerFunction);
   ```

2. **Controller** → `src/controllers/[feature].controller.js`
   ```javascript
   export async function controllerFunction(req, res) {
     // Validate, call service, return response
   }
   ```

3. **Service** → `src/services/core/[feature].service.js`
   ```javascript
   export class FeatureService {
     static async doSomething() {
       // Business logic here
     }
   }
   ```

### Adding Configuration

1. **Environment Variable** → Add to `.env` and `.env.example`
2. **Config Access** → Add to `src/config/index.js`
3. **Constant** → Add to `src/config/constants.js`

### Adding a Utility Function

1. **General Helper** → `src/utils/helpers.js`
2. **Validator** → `src/utils/validators.js`
3. **Error Class** → `src/utils/errors.js`
4. **Logger** → Use `src/utils/logger.js`

### Adding a Database Migration

1. **Create File** → `database/migrations/XXX_description.sql`
2. **Number Format** → `001_`, `002_`, etc.
3. **Auto-Run** → Migrations run automatically on server start

## 📋 File Naming Conventions

- **Files**: `kebab-case.js` (e.g., `lead.controller.js`)
- **Classes**: `PascalCase` (e.g., `LeadService`)
- **Functions**: `camelCase` (e.g., `getLeadById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)

## 🔍 Finding Things

### Looking for...

- **API Endpoints** → `src/routes/`
- **Request Handling** → `src/controllers/`
- **Business Logic** → `src/services/`
- **Database Queries** → `src/services/` (in service files)
- **Configuration** → `src/config/`
- **Constants** → `src/config/constants.js`
- **Utilities** → `src/utils/`
- **Migrations** → `database/migrations/`
- **Documentation** → `docs/`

## 🎨 Code Patterns

### Controller Pattern
```javascript
export async function getLead(req, res) {
  try {
    const { id } = req.params;
    const lead = await LeadService.getById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    return res.json(lead);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### Service Pattern
```javascript
export class LeadService {
  static async getById(id) {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0];
  }
}
```

### Using Config
```javascript
import config from '../config/index.js';
const apiKey = config.phantombuster.apiKey;
```

### Using Constants
```javascript
import constants from '../config/constants.js';
if (status === constants.LEAD_STATUS.NEW) { ... }
```

### Using Logger
```javascript
import logger from '../utils/logger.js';
logger.info('Operation started');
logger.error('Error occurred', error);
```

### Using Errors
```javascript
import { ValidationError, NotFoundError } from '../utils/errors.js';
throw new ValidationError('Email required', 'email');
throw new NotFoundError('Lead');
```

## 🚀 Quick Start Checklist

- [ ] Read `README.md`
- [ ] Check `ARCHITECTURE.md` for system design
- [ ] Review `src/config/` for configuration
- [ ] Look at `src/routes/` for API endpoints
- [ ] Check `docs/` for documentation

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Restructuring Summary](./RESTRUCTURING_SUMMARY.md)
- [API Documentation](./docs/API_REFERENCE.md)
- [Configuration Guide](./src/config/README.md)
