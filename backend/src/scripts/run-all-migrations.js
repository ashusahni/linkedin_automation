import "../config/index.js";
import { runMigrations } from "../db/migrations.js";
import logger from "../utils/logger.js";

async function main() {
  try {
    logger.info("Starting manual migration run...");
    await runMigrations();
    logger.info("Migration run completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error("Migration run failed:", error);
    process.exit(1);
  }
}

main();
