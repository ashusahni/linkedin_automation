import pool from "./src/db.js";
import { recalculateAllScores } from "./src/services/preferenceScoring.service.js";

async function main() {
  try {
    console.log("Starting rescore...");
    const result = await recalculateAllScores();
    console.log("Rescore complete:", result);
  } catch (err) {
    console.error("Rescore failed:", err);
  } finally {
    pool.end();
  }
}

main();
