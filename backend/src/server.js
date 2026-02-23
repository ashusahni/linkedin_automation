import "./config/index.js"; // 👈 This loads environment variables and config
import app from "./app.js";
import config from "./config/index.js";
import { initScheduler } from "./services/scheduler.service.js";
import { initContentSheetSync } from "./services/contentSheetSync.service.js";
import { runMigrations } from "./db/migrations.js";
import logger from "./utils/logger.js";
import industryHierarchyService from "./services/industryHierarchy.service.js";
import { ensureNotificationsTable } from "./db/ensure_notifications.js"; // 👈 Explicit fix for notifications

const PORT = config.server.port;

// Prevent unhandled errors from crashing the process; log them instead
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at", promise, "reason:", reason);
});

logger.info("🚀 Server starting...");
logger.info(`🔑 PB KEY PRESENT: ${!!config.phantombuster.apiKey}`);
logger.info(`🔍 SEARCH PHANTOM ID (Lead Search): ${config.phantombuster.phantomIds.searchExport ? "set" : "MISSING – set SEARCH_EXPORT_PHANTOM_ID in .env"}`);
logger.info(`🍪 LINKEDIN SESSION COOKIE: ${config.phantombuster.sessionCookie ? "set" : "MISSING – required for PhantomBuster"}`);
logger.info(`🗄️  DB HOST: ${config.database.host}`);

async function init() {
  try {
    // Run database migrations
    await runMigrations();

    // Explicitly ensure critical tables (Notifications) exist even if schema migrations skipped them
    await ensureNotificationsTable();
  } catch (err) {
    logger.error("❌ Migration failed:", err.message);
    // Don't exit - allow server to start even if migrations fail
    // (they might already be applied)
  }

  // Load industry hierarchy data
  try {
    logger.info("📊 Loading industry hierarchy data...");
    await industryHierarchyService.loadIndustryData();
    logger.info("✅ Industry hierarchy loaded successfully");
  } catch (err) {
    logger.error("❌ Failed to load industry data:", err.message);
    // Continue - server can still function without industry data
  }

  app.get("/", (req, res) => {
    res.send("never ends");
  });

  // Start the Automation Scheduler only if enabled (set SCHEDULER_ENABLED=false to disable)
  if (config.features.scheduler.enabled) {
    initScheduler();
  } else {
    logger.info("⏰ Scheduler disabled (SCHEDULER_ENABLED=false)");
  }

  // Start the Content Engine → Google Sheets sync cron
  // Respects GOOGLE_SHEETS_ENABLED=false flag to disable without code changes
  initContentSheetSync();

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

init();