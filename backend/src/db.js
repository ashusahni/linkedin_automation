import pkg from "pg";
import config from "./config/index.js";

const { Pool } = pkg;

const db = config.database;

// Use raw DATABASE_URL when set (Render/cloud Postgres work more reliably this way; avoids parse/encoding issues)
const poolOptions = {
  max: db.max,
  idleTimeoutMillis: db.idleTimeoutMillis,
  connectionTimeoutMillis: db.connectionTimeoutMillis,
  allowExitOnIdle: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

let pool;
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL.trim();
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    ...poolOptions,
  });
} else {
  pool = new Pool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password != null ? String(db.password) : '',
    database: db.database,
    ssl: db.ssl,
    ...poolOptions,
  });
}

pool.on("connect", () => {
  console.log("✅ Database connected");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export default pool;