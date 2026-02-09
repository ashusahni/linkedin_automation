import "./config/index.js"; // 👈 This loads environment variables and config
import app from "./app.js";
import config from "./config/index.js";
import { initScheduler } from "./services/scheduler.service.js";
import { runMigrations } from "./db/migrations.js";
import logger from "./utils/logger.js";

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
  } catch (err) {
    logger.error("❌ Migration failed:", err.message);
    // Don't exit - allow server to start even if migrations fail
    // (they might already be applied)
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

  // 🆕 AUTO-SCRAPE APPROVED LEADS ON STARTUP
  // Run AFTER server starts to avoid blocking startup
  // Delayed by 10 seconds to let database and everything load first
  const scheduleContactScraping = async () => {
    if (!config.phantombuster.sessionCookie) {
      logger.info("⚠️  LinkedIn session cookie not configured - skipping auto-scraping");
      return;
    }

    try {
      logger.info("🔍 Checking for approved leads needing contact scraping...");

      // Dynamic import to avoid loading at startup if not needed
      const { default: pool } = await import('./db.js');

      // Find approved leads without email or phone
      const result = await pool.query(`
        SELECT id, linkedin_url, linkedin_profile_id
        FROM leads
        WHERE review_status = 'approved'
          AND (email IS NULL OR phone IS NULL)
          AND linkedin_url IS NOT NULL
        LIMIT 500
      `);

      if (result.rows.length > 0) {
        logger.info(`📧 Found ${result.rows.length} approved leads without contact info`);
        logger.info(`🚀 Triggering background contact scraping...`);

        // Extract lead IDs
        const leadIds = result.rows.map(row => row.id);

        // Trigger scraping asynchronously (don't block server startup)
        const { default: contactScraperService } = await import('./services/contact-scraper.service.js');
        await contactScraperService.initialize(config.phantombuster.sessionCookie);
        contactScraperService.scrapeApprovedLeads(leadIds).catch(err => {
          logger.error('⚠️  Startup scraping error:', err.message);
        });

        logger.info(`✅ Contact scraping initiated in background`);
      } else {
        logger.info(`✅ All approved leads already have contact info`);
      }
    } catch (error) {
      logger.error('⚠️  Failed to check/scrape approved leads:', error.message);
      // Don't block server startup
    }
  };

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);

    // Schedule contact scraping to run 60 seconds (1 minute) after server starts
    // This gives plenty of time for database connections, migrations, and everything to fully load
    setTimeout(() => {
      logger.info("⏰ Backend fully loaded. Starting contact scraping check...");
      scheduleContactScraping().catch(err => {
        logger.error('⚠️  Delayed scraping failed:', err.message);
      });
    }, 60000); // 60 second (1 minute) delay
  });
}

init();