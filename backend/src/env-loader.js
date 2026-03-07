/**
 * Load .env before any other app code runs.
 * Searches multiple locations so the same keys work on every device and in deployment.
 * Must be imported first in server.js.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const cwd = process.cwd();

function* envSearchPaths() {
  yield path.join(backendRoot, ".env");
  yield path.join(backendRoot, "..", ".env");
  yield path.join(cwd, ".env");
  let dir = cwd;
  for (let i = 0; i < 10 && dir; i++) {
    yield path.join(dir, ".env");
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

const seen = new Set();
let loadedPath = null;
for (const envPath of envSearchPaths()) {
  const normalized = path.normalize(envPath);
  if (seen.has(normalized)) continue;
  seen.add(normalized);
  if (fs.existsSync(normalized)) {
    const result = dotenv.config({ path: normalized });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      loadedPath = normalized;
      break;
    }
  }
}

if (loadedPath) {
  try {
    console.log(`✅ .env loaded from: ${path.relative(cwd, loadedPath) || path.basename(loadedPath)}`);
  } catch {
    console.log(`✅ .env loaded from: ${loadedPath}`);
  }
} else {
  dotenv.config();
  if (!process.env.DATABASE_HOST && !process.env.DATABASE_URL && !process.env.PORT) {
    console.warn("⚠️  No .env found. Put .env in backend/ or project root with OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.");
  }
}
