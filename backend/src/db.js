import pkg from "pg";
import config from "./config/index.js";

const { Pool } = pkg;

// pg expects password to be a string; avoid SASL "client password must be a string"
const db = config.database;
const pool = new Pool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password != null ? String(db.password) : '',
  database: db.database,
  ssl: db.ssl,
  max: db.max,
  idleTimeoutMillis: db.idleTimeoutMillis,
  connectionTimeoutMillis: db.connectionTimeoutMillis
});

pool.on("connect", () => {
  console.log("✅ Database connected");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

export default pool;