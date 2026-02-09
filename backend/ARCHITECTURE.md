# 🏗️ Backend Architecture & Structure

## 📁 Directory Structure

```
backend/
├── src/                          # Main application source code
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Server entry point
│   ├── config/                   # Configuration management
│   │   ├── index.js              # Main config export
│   │   ├── database.js           # Database configuration
│   │   ├── env.js                # Environment variables
│   │   └── constants.js          # Application constants
│   ├── controllers/              # Request handlers (route controllers)
│   │   ├── campaign.controller.js
│   │   ├── job.controller.js
│   │   ├── lead.controller.js
│   │   ├── network.controller.js
│   │   ├── phantom.controller.js
│   │   ├── sow.controller.js
│   │   └── webhook.controller.js
│   ├── routes/                   # API route definitions
│   │   ├── campaign.routes.js
│   │   ├── email.routes.js
│   │   ├── job.routes.js
│   │   ├── lead.routes.js
│   │   ├── network.routes.js
│   │   ├── phantom.routes.js
│   │   ├── sow.routes.js
│   │   └── webhook.routes.js
│   ├── services/                 # Business logic layer
│   │   ├── integrations/         # External service integrations
│   │   │   ├── phantombuster.service.js
│   │   │   ├── openai.service.js
│   │   │   ├── email.service.js
│   │   │   └── llama.service.js
│   │   ├── core/                 # Core business services
│   │   │   ├── ai.service.js
│   │   │   ├── enrichment.service.js
│   │   │   ├── lead.service.js
│   │   │   ├── campaign.service.js
│   │   │   ├── approval.service.js
│   │   │   ├── scheduler.service.js
│   │   │   └── safety.service.js
│   │   └── utils/                # Service utilities
│   │       ├── csvExporter.js
│   │       ├── phantomParser.js
│   │       └── phantomResultParser.js
│   ├── models/                   # Data models (if using ORM)
│   │   ├── job.model.js
│   │   ├── lead.model.js
│   │   └── phantomJob.model.js
│   ├── middleware/               # Express middleware
│   │   ├── upload.js
│   │   ├── auth.js               # Authentication (future)
│   │   ├── validation.js        # Request validation (future)
│   │   └── errorHandler.js       # Error handling (future)
│   ├── utils/                    # Shared utilities
│   │   ├── logger.js             # Logging utility
│   │   ├── errors.js             # Custom error classes
│   │   ├── validators.js         # Validation helpers
│   │   └── helpers.js            # General helpers
│   └── db/                       # Database related
│       ├── index.js              # Database connection (db.js)
│       └── migrations/           # Migration runner (future)
│
├── database/                     # Database schemas and migrations
│   ├── schema.sql                # Base schema
│   ├── migrations/               # Versioned migrations
│   │   ├── 001_create_campaigns.sql
│   │   ├── 002_add_automation_fields.sql
│   │   └── ...
│   └── seeds/                    # Seed data (optional)
│
├── scripts/                      # Utility scripts
│   ├── migrations/               # Migration scripts
│   ├── utils/                    # Utility scripts
│   ├── tests/                    # Test scripts
│   ├── tools/                    # Development tools
│   └── setup/                    # Setup/installation scripts
│
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   ├── guides/                    # Setup and usage guides
│   └── architecture/             # Architecture docs
│
├── tests/                        # Test files (future)
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example                  # Environment variables template
├── .gitignore
├── package.json
└── README.md                     # Main README
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses, input validation
- **Services**: Contain business logic, orchestrate operations
- **Models**: Data access layer (if using ORM)
- **Routes**: Define API endpoints and connect to controllers

### 2. **Service Organization**
- **integrations/**: External API integrations (PhantomBuster, OpenAI, etc.)
- **core/**: Core business logic services
- **utils/**: Service-specific utilities

### 3. **Configuration Management**
- Centralized config in `src/config/`
- Environment variables loaded once
- Constants defined in one place

### 4. **Error Handling**
- Custom error classes in `src/utils/errors.js`
- Consistent error responses
- Error logging

### 5. **Code Organization**
- One file per class/functionality
- Clear naming conventions
- Consistent file structure

## 📦 Module Responsibilities

### Controllers
- Validate request data
- Call appropriate services
- Format responses
- Handle errors

### Services
- Implement business logic
- Interact with database
- Call external APIs
- Handle service-level errors

### Routes
- Define API endpoints
- Apply middleware
- Connect to controllers

### Models (if using ORM)
- Define data structure
- Handle data validation
- Provide data access methods

## 🔄 Data Flow

```
Request → Route → Controller → Service → Database/External API
                                    ↓
Response ← Route ← Controller ← Service ← Database/External API
```

## 🛠️ Development Guidelines

1. **Keep controllers thin** - Move logic to services
2. **Services should be testable** - No direct req/res objects
3. **Use async/await** - Consistent async handling
4. **Error handling** - Always catch and handle errors
5. **Logging** - Log important operations
6. **Documentation** - Comment complex logic

## 📝 Naming Conventions

- **Files**: `kebab-case.js` (e.g., `lead.controller.js`)
- **Classes**: `PascalCase` (e.g., `LeadService`)
- **Functions**: `camelCase` (e.g., `getLeadById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)
- **Variables**: `camelCase` (e.g., `leadId`)
