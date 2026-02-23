# 🚀 LinkedIn Automation Engine - Backend

Backend API server for the LinkedIn Automation Engine platform.

## 📁 Project Structure

```
backend/
├── src/                    # Source code
│   ├── config/            # Configuration management
│   ├── controllers/       # Request handlers
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── models/            # Data models
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utilities
│   └── db/                # Database (migrations, etc.)
├── database/              # Database schemas and migrations
├── scripts/               # Utility scripts
├── docs/                  # Documentation
└── tests/                 # Test files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- PhantomBuster account (for LinkedIn automation)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   npm run dev    # Development mode with auto-reload
   # or
   npm start      # Production mode
   ```

4. **Verify installation:**
   ```bash
   curl http://localhost:3000/health
   ```

## ⚙️ Configuration

Configuration is managed centrally in `src/config/`. See:
- `src/config/README.md` - Configuration guide
- `.env.example` - Environment variables template

### Key Configuration Files

- **config/index.js**: Main configuration export
- **config/database.js**: Database settings
- **config/constants.js**: Application constants
- **config/env.js**: Environment variable loader

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System architecture and design
- **[docs/](./docs/)**: API documentation and guides
- **[src/README.md](./src/README.md)**: Source code structure

## 🛠️ Development

### Code Organization

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic (no req/res objects)
- **Routes**: API endpoint definitions
- **Utils**: Shared utilities and helpers

### Adding New Features

1. Create service in `src/services/`
2. Create controller in `src/controllers/`
3. Add routes in `src/routes/`
4. Update documentation

### Running Scripts

```bash
# Database migrations
node scripts/migrations/run-migrations.js

# Test scripts
node scripts/tests/test-api.js

# Utility scripts
node scripts/utils/cleanup-data.js
```

## 🗄️ Database

### Migrations

Migrations are automatically run on server startup. They're tracked in the `schema_migrations` table.

### Manual Migration

```bash
node scripts/migrations/run-migrations.js
```

### Migration Status

```bash
node scripts/migrations/check-status.js
```

## 🧪 Testing

```bash
# Run API tests
node scripts/tests/test-api.js

# Run integration tests
node scripts/tests/test-phantoms.js
```

## 📦 API Endpoints

See [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) for complete API documentation.

### Main Endpoints

- `GET /health` - Health check
- `GET /api/leads` - List leads
- `POST /api/phantom/export-connections-complete` - Export connections
- `POST /api/campaigns` - Create campaign

## 🔧 Scripts

Scripts are organized in `scripts/`:
- **migrations/**: Database migration scripts
- **utils/**: General utility scripts
- **tests/**: Test and verification scripts
- **tools/**: Development tools

## 📝 Code Style

- Use ES6+ modules (`import`/`export`)
- Use async/await for async operations
- Follow existing code structure
- Add comments for complex logic
- Use config/constants instead of magic values

## 🐛 Troubleshooting

### Database Connection Issues

1. Check `.env` file has correct DB credentials
2. Verify PostgreSQL is running
3. Check database exists: `psql -U postgres -l`

### Migration Issues

1. Check migration files exist in `database/migrations/`
2. Verify database connection
3. Check `schema_migrations` table exists

### PhantomBuster Issues

1. Verify API key in `.env`
2. Check phantom IDs are correct
3. Verify LinkedIn session cookie is valid

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines]
