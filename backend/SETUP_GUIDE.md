# 🚀 Backend Setup Guide

This guide will help you set up the backend server and database on your local machine.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) -> [Download Here](https://www.postgresql.org/download/windows/)

## 2. Installation
Open this folder in your terminal and run:

```bash
npm install
```

## 3. Database Setup
You need to create a local PostgreSQL database.

1.  Open **pgAdmin 4** (or any SQL tool).
2.  Create a new database named `linkedin_leads`.
    -   Owner: `postgres`
3.  Right-click the new `linkedin_leads` database -> **Query Tool**.
4.  Open the file `backend/database/schema.sql` (in this repo), copy the content, and run it in the Query Tool.
    -   *This creates the `leads` table for you.*

## 4. Environment Variables (.env)
Create a file named `.env` in the root `backend` folder.
Ask the backend developer for the API Keys, or use these defaults for local dev:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Update password to YOUR Postgres password)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=linkedin_leads

# PhantomBuster (Ask backend dev for these if you need to run agents)
PHANTOMBUSTER_API_KEY=...
LINKEDIN_SESSION_COOKIE=...
SEARCH_EXPORT_PHANTOM_ID=...
PROFILE_SCRAPER_PHANTOM_ID=...
```

## 5. Start the Server
Run the development server:

```bash
npm run dev
```

You should see:
> ✅ Server running on port 3000
> ✅ Database connected

## 6. Accessing APIs
- **Base URL:** `http://localhost:3000`
- **Check Status:** `http://localhost:3000/api/leads/stats`
- **Documentation:** See `API_REFERENCE.md`
