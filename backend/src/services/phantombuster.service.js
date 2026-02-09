// backend/src/services/phantombuster.service.js

import axios from "axios";  // ✅ CRITICAL: Use axios instead of undici for better network compatibility
import { parse } from "csv-parse/sync";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PB_API_URL = "https://api.phantombuster.com/api/v2";

// Helper: Get API key at runtime (not at module load time)
const getApiKey = () => process.env.PHANTOMBUSTER_API_KEY;

// Helper: Make API requests with axios
async function pbRequest(endpoint, options = {}) {
  const url = `${PB_API_URL}${endpoint}`;

  try {
    const axiosConfig = {
      method: options.method || 'GET',
      url: url,
      headers: {
        "X-Phantombuster-Key": getApiKey(),
        "Content-Type": "application/json",
        "User-Agent": "NodeJS/LinkedIn-Reach",
        ...options.headers
      },
      timeout: 30000 // 30 second timeout
    };

    // Add body data if present
    if (options.body) {
      axiosConfig.data = JSON.parse(options.body);
    }

    const response = await axios(axiosConfig);
    return response.data;
  } catch (error) {
    // Enhanced error logging + normalized error object
    console.error("❌ pbRequest error details:");
    console.error("   URL:", url);
    console.error("   Method:", options.method || 'GET');

    // Normalized error info we will throw so controllers can react properly
    let status = null;
    let data = null;
    let code = "PB_API_ERROR";
    let message = "Unknown PhantomBuster error";

    if (error.response) {
      // Server responded with error status
      status = error.response.status;
      data = error.response.data;

      console.error("   Status:", status);
      console.error("   Status Text:", error.response.statusText);
      console.error("   Response Data:", JSON.stringify(data, null, 2));

      const slug = data?.details?.detailedErrorSlug;
      const rawError =
        data?.error ||
        data?.message ||
        data?.details?.message ||
        "";

      // LinkedIn / Sales Navigator hard quota reached (what you see in the screenshot)
      if (
        (status === 400 || status === 403 || status === 429) &&
        /monthly quota for profile searches exceeded/i.test(rawError)
      ) {
        code = "PB_LINKEDIN_QUOTA_EXCEEDED";
        message =
          "LinkedIn has reached its monthly quota for profile searches on this account. " +
          "You need to wait for the quota to reset or use a different LinkedIn account / plan.";
      }
      // Max parallelism (agent already running)
      else if (status === 429 && (slug === "maxParallelismReached" || /maximum parallel executions/i.test(rawError))) {
        code = "PB_MAX_PARALLELISM";
        message = "PhantomBuster agent is already running and reached its maximum parallel executions limit.";
      }
      // Agent not found / deleted
      else if (status === 404) {
        code = "PB_AGENT_NOT_FOUND";
        message = "PhantomBuster reports that this agent ID does not exist (it may have been deleted or changed).";
      }
      // 400 Bad Request: include PhantomBuster's reason so user can fix (e.g. missing/invalid argument)
      else if (status === 400) {
        code = "PB_API_ERROR";
        const reason = rawError || (typeof data?.details === "string" ? data.details : data?.details?.message) || JSON.stringify(data);
        message = reason ? `PhantomBuster API Error (400): ${reason}` : `PhantomBuster API Error: 400`;
      } else {
        code = "PB_API_ERROR";
        const reason = rawError || (data?.details && (typeof data.details === "string" ? data.details : data.details?.message));
        message = reason ? `PhantomBuster API Error (${status}): ${reason}` : `PhantomBuster API Error: ${status}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error("   Error Type: No response received");
      console.error("   Error Code:", error.code);
      console.error("   Error Message:", error.message);

      code = "PB_NETWORK_ERROR";
      message = `Network error talking to PhantomBuster: ${error.message}`;
    } else {
      // Something else happened
      console.error("   Error Type: Request setup error");
      console.error("   Error Message:", error.message);
      console.error("   Full Error:", error);

      code = "PB_REQUEST_SETUP_ERROR";
      message = `Request setup error talking to PhantomBuster: ${error.message}`;
    }

    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.code = code;
    wrapped.details = data;
    throw wrapped;
  }
}

class PhantomBusterService {
  constructor() {
    this.exportsDir = path.resolve(__dirname, "../../exports");
    this.ensureExportsDir();
  }

  async ensureExportsDir() {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
      console.log("✅ Exports directory ready");
    } catch (error) {
      console.error("❌ Error creating exports dir:", error.message);
    }
  }

  // ============================================
  // CORE: LAUNCH PHANTOM
  // ============================================
  async launchPhantom(phantomId, additionalArgs = {}, options = {}) {
    try {
      console.log(`🚀 Launching phantom: ${phantomId}`);

      const ts = Date.now();
      const uniqueResultBase = `result_${ts}`;
      const uniqueResultCsv = `${uniqueResultBase}.csv`;
      const uniqueResultJson = `${uniqueResultBase}.json`;
      console.log(`📝 Using unique result files: ${uniqueResultCsv} | ${uniqueResultJson}`);

      // Read cookie: support key with accidental leading/trailing spaces in .env
      // BUT: Skip reading cookie if noSessionCookie or useDashboardCookie option is set
      let sessionCookie = "";
      let cookieForPhantom = "";

      // Check if additionalArgs already contains sessionCookie (from dashboard)
      const hasDashboardCookie = additionalArgs?.sessionCookie;

      if (options.noSessionCookie || options.useDashboardCookie || hasDashboardCookie) {
        // Using dashboard cookie - explicitly don't read cookie from .env
        if (hasDashboardCookie) {
          console.log("📌 Using sessionCookie from dashboard (provided in additionalArgs)");
        } else {
          console.log("📌 Skipping .env cookie - using PhantomBuster dashboard connection only");
        }
      } else {
        // Only read cookie from .env if we're not using dashboard connection
        sessionCookie = process.env.LINKEDIN_SESSION_COOKIE || process.env[" LINKEDIN_SESSION_COOKIE"] || process.env["LINKEDIN_SESSION_COOKIE "] || "";
        sessionCookie = typeof sessionCookie === "string" ? sessionCookie.trim() : "";
        if (sessionCookie && sessionCookie.toLowerCase().startsWith("li_at=")) {
          sessionCookie = sessionCookie.slice(6).trim();
        }
        // Force include li_at= if it's just the value
        // The cookie value itself shouldn't have quotes if it's being wrapped
        sessionCookie = sessionCookie.replace(/^["']|["']$/g, '');

        // Cookie sent to PhantomBuster: many LinkedIn phantoms expect "li_at=value" (full cookie string)
        cookieForPhantom = sessionCookie ? `li_at=${sessionCookie}` : "";
      }

      let userAgent = process.env.LINKEDIN_USER_AGENT || process.env[" LINKEDIN_USER_AGENT"] || process.env["LINKEDIN_USER_AGENT "] || "";
      userAgent = typeof userAgent === "string" ? userAgent.trim() : "";
      if (!userAgent) {
        userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      }

      const resultFileArgs = {
        resultCsvName: uniqueResultCsv,
        csvName: uniqueResultCsv,
        resultJsonName: uniqueResultJson,
        jsonName: uniqueResultJson
      };

      // CRITICAL FIX: Search Export phantom MUST receive ZERO arguments to work properly.
      // It uses the configuration saved in PhantomBuster dashboard (search URL, limits, LinkedIn connection).
      // Sending ANY arguments (cookies, user agent, search params) causes "argument-invalid" error.
      //
      // Message Sender phantom: Can use dashboard connection OR session cookie from .env
      // If LINKEDIN_SESSION_COOKIE is set, we send it. Otherwise, phantom uses dashboard connection.

      let launchArgs;
      let finalArgs;
      let hasLaunchArgs;

      if (options.minimalArgsForSearch || options.minimalArgs) {
        // Search Export / Connections Export: Send absolutely NO arguments - phantom uses dashboard config
        console.log("📌 Search Export: Using configuration from PhantomBuster dashboard (no arguments sent)");
        launchArgs = {};
        finalArgs = {};
        hasLaunchArgs = false;
      } else if (options.minimalArgsForMessage) {
        // Message Sender: Send message args only - use dashboard LinkedIn connection
        // Do NOT send cookie from .env - phantom will use dashboard connection
        console.log("📌 Message Sender: Using dashboard LinkedIn connection (not using .env cookie)");
        launchArgs = { ...additionalArgs };
        finalArgs = launchArgs;
        hasLaunchArgs = Object.keys(launchArgs).length > 0;
      } else if (options.noSessionCookie) {
        // For phantoms that need args but NOT session cookie (e.g., LinkedIn Outreach for messages)
        // These phantoms use dashboard LinkedIn connection
        console.log("📌 Using dashboard LinkedIn connection (no session cookie sent)");
        launchArgs = { ...additionalArgs };
        finalArgs = launchArgs;
        hasLaunchArgs = Object.keys(launchArgs).length > 0;
      } else {
        // Other phantoms: full args
        // If additionalArgs contains sessionCookie (from dashboard), use it
        // Otherwise, use cookie from .env if available
        launchArgs = {
          // Prefer sessionCookie from additionalArgs (dashboard) over .env cookie
          ...(additionalArgs?.sessionCookie ? { sessionCookie: additionalArgs.sessionCookie } : (cookieForPhantom && { sessionCookie: cookieForPhantom })),
          ...resultFileArgs,
          keepOnlyCurrentResultsInJson: true,
          saveToCloud: true,
          saveResultsToDatabase: true,
          saveResultInDatabase: true,
          pushResultToCRM: false,
          onlyProcessInputUrl: true,
          removeDuplicates: false,
          ...additionalArgs
        };
        finalArgs = launchArgs;
        hasLaunchArgs = Object.keys(launchArgs).length > 0;
      }

      console.log(`📋 Launch arguments:`, JSON.stringify(finalArgs, null, 2));

      // Send request to PhantomBuster
      const body = hasLaunchArgs ? { id: phantomId, arguments: finalArgs } : { id: phantomId };
      console.log(`🚀 Calling PhantomBuster /agents/launch for phantom ${phantomId}${hasLaunchArgs ? ` (with ${Object.keys(finalArgs).length} args)` : " (no args – uses dashboard config)"}`);
      const data = await pbRequest("/agents/launch", {
        method: "POST",
        body: JSON.stringify(body)
      });

      const containerId = data.containerId;
      console.log(`✅ Phantom launched. Container ID: ${containerId}`);

      return { containerId, phantomId, uniqueResultBase };
    } catch (error) {
      console.error("❌ Launch error:", error.message);
      throw error;
    }
  }

  // ============================================
  // WAIT FOR COMPLETION
  // ============================================
  async waitForCompletion(containerId, phantomId, maxMinutes = 15) {
    const maxWaitTime = maxMinutes * 60 * 1000;
    const startTime = Date.now();
    const checkInterval = 10000; // 10 seconds

    console.log(`⏳ Waiting for container ${containerId} to complete (max ${maxMinutes} min)...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const container = await this.fetchContainerStatus(containerId);

        if (!container || !container.id) {
          console.log("⏳ Container not ready yet...");
          await this.sleep(checkInterval);
          continue;
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`📊 Status: ${container.status} | Exit Code: ${container.exitCode} | (${elapsed}s elapsed)`);

        // PhantomBuster: "finished" = container stopped; exitCode 0 = success, non-zero = failure
        const isFinished = container.status === "finished" ||
          container.status === "success" ||
          (container.exitCode !== undefined && container.exitCode !== null);

        if (isFinished) {
          const exitCode = container.exitCode;
          const success = exitCode === 0;
          if (success) {
            console.log("✅ Container finished successfully!");
            console.log(`📦 Result Object: ${container.resultObject}`);
            container.agentId = phantomId;
            return container;
          }
          // exitCode 1 or other non-zero = phantom failed; fetch output to show real reason
          let msg = container.exitMessage || container.output;
          if (!msg || msg === "Unknown error") {
            const outputSnippet = await this.fetchContainerOutput(containerId);
            msg = outputSnippet || "Unknown error (check PhantomBuster dashboard for this container)";
          }
          const hint = /cookie|session|login|li_at|invalid argument/i.test(String(msg))
            ? " For Search Export: connect LinkedIn in PhantomBuster dashboard for this agent (do not pass cookie in .env for this phantom)."
            : "";
          throw new Error(`Container failed with exit code ${exitCode}: ${msg}.${hint}`);
        }

        if (container.status === "error") {
          let errMsg = container.exitMessage || container.output;
          if (!errMsg) {
            const outputSnippet = await this.fetchContainerOutput(containerId);
            errMsg = outputSnippet || "Unknown error (check PhantomBuster dashboard)";
          }
          throw new Error(`Container failed: ${errMsg}`);
        }

        // Still running
        await this.sleep(checkInterval);
      } catch (error) {
        // If container not found, keep waiting
        if (error.message.includes("not found") || error.message.includes("404")) {
          console.log("⏳ Container not found yet, waiting...");
          await this.sleep(checkInterval);
          continue;
        }

        // If fetch failed, retry
        if (error.message.includes("fetch failed")) {
          console.log("⏳ Network hiccup, retrying...");
          await this.sleep(checkInterval);
          continue;
        }

        throw error;
      }
    }

    throw new Error(`⏰ Timeout: Container did not complete within ${maxMinutes} minutes`);
  }

  // ============================================
  // FETCH AGENT (saved config / arguments)
  // ============================================
  async fetchAgent(phantomId) {
    try {
      const data = await pbRequest(`/agents/fetch?id=${phantomId}`);
      return data;
    } catch (err) {
      console.warn("⚠️ Could not fetch agent config:", err.message);
      return null;
    }
  }

  // ============================================
  // FETCH CONTAINER STATUS
  // ============================================
  async fetchContainerStatus(containerId) {
    return await pbRequest(`/containers/fetch?id=${containerId}`);
  }

  /** Fetch container output log to surface real error (e.g. "Invalid argument", "missing cookies"). */
  async fetchContainerOutput(containerId) {
    try {
      const data = await pbRequest(`/containers/fetch-output?id=${containerId}`);
      const output = typeof data?.output === "string" ? data.output : "";
      if (!output) return null;
      const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const last = lines[lines.length - 1];
      const errorLine = lines.find((l) => /error|invalid|failed|missing|exception/i.test(l)) || last;
      return errorLine || (lines.length ? lines.slice(-3).join(" ") : null);
    } catch (_) {
      return null;
    }
  }

  // ============================================
  // FETCH RESULT DATA
  // ============================================
  async fetchResultData(container) {
    try {
      console.log("📥 Fetching result data...");
      console.log("📦 Container ID:", container.id);
      console.log("📦 Agent ID:", container.agentId);

      // STRATEGY 1: Try /agents/fetch-output (PhantomBuster API - URL or inline JSON)
      if (container.agentId) {
        try {
          console.log("📊 Strategy 1: Trying /agents/fetch-output endpoint...");
          const agentOutput = await pbRequest(`/agents/fetch-output?id=${container.agentId}`);

          console.log("📋 Agent output response keys:", Object.keys(agentOutput || {}));

          const outputUrl = agentOutput?.resultObject;
          if (outputUrl && typeof outputUrl === "string") {
            console.log(`✅ Found output URL: ${outputUrl}`);
            try {
              const data = await this.downloadResultFile(outputUrl);
              if (data && data.length > 0) {
                console.log(`✅ Fetched ${data.length} records from fetch-output`);
                return data;
              }
            } catch (_) { /* ignore */ }
          }

          const inline = this.extractInlineResult(agentOutput);
          if (inline && inline.length > 0) {
            console.log(`✅ Found ${inline.length} records as inline JSON in fetch-output`);
            return inline;
          }

          // Parse output log for JSON/CSV URLs (same as Strategy 4)
          const log = typeof agentOutput?.output === "string" ? agentOutput.output : "";
          if (log) {
            const dataUrl = this.extractResultUrlFromLog(log);
            if (dataUrl) {
              console.log(`✅ Found result URL in fetch-output log: ${dataUrl}`);
              try {
                const data = await this.downloadResultFile(dataUrl);
                if (data && data.length > 0) {
                  console.log(`✅ Fetched ${data.length} records from log URL`);
                  return data;
                }
              } catch (_) { /* ignore */ }
            }
          }
        } catch (agentError) {
          console.log(`⚠️  Strategy 1 failed: ${agentError.message}`);
        }
      }

      // STRATEGY 2: Try container's resultObject field
      if (container.resultObject) {
        try {
          console.log(`📊 Strategy 2: Trying container resultObject: ${container.resultObject}`);
          const data = await this.downloadResultFile(container.resultObject);
          if (data && data.length > 0) {
            console.log(`✅ Successfully fetched ${data.length} records from container resultObject`);
            return data;
          }
        } catch (resultError) {
          console.log(`⚠️  Strategy 2 failed: ${resultError.message}`);
        }
      } else {
        console.log("⚠️  No resultObject in container, skipping strategy 2");
      }

      // STRATEGY 3: Agent storage files (direct S3). PhantomBuster bucket is usually private → 403 expected.
      // Try first candidate; if 403, skip rest to avoid log spam.
      if (container.agentId) {
        try {
          console.log("📊 Strategy 3: Checking agent storage (S3; 403 = private, use dashboard export)...");
          const base = container.uniqueResultBase;
          const candidates = [];
          if (base) candidates.push(`${base}.json`, `${base}.csv`);
          candidates.push(
            "result.json", "database.json", "linkedinProfileScraper.json",
            "result.csv", "database.csv", "linkedinProfileScraper.csv",
            "database-linkedin-profile-scraper.json", "database-linkedin-profile-scraper.csv"
          );
          let s3Forbidden = false;
          for (const fileName of candidates) {
            if (s3Forbidden) break;
            const fileUrl = `https://phantombuster.s3.amazonaws.com/agent-${container.agentId}/${fileName}`;
            console.log(`   Trying: ${fileName}...`);
            const { data, status } = await this.downloadResultFileWithStatus(fileUrl);
            if (status === 403) {
              s3Forbidden = true;
              console.log("   ⚠️ S3 returned 403 (private storage). Export results from PhantomBuster dashboard.");
              break;
            }
            if (data && data.length > 0) {
              console.log(`✅ Fetched ${data.length} records from ${fileName}`);
              return data;
            }
          }
          if (!s3Forbidden) console.log("⚠️ No result files found in agent storage");
        } catch (storageError) {
          console.log(`⚠️  Strategy 4 failed: ${storageError.message}`);
        }
      }

      // STRATEGY 4: Parse container logs for result URLs (prefer JSON, then CSV)
      try {
        console.log("📊 Strategy 4: Parsing container output logs for JSON/CSV URLs...");
        const outputData = await pbRequest(`/containers/fetch-output?id=${container.id}`);
        const output = outputData?.output || "";
        if (!output) {
          console.log("⚠️  No container output");
        } else {
          const dataUrl = this.extractResultUrlFromLog(output);
          if (dataUrl) {
            console.log(`✅ Found result URL in logs: ${dataUrl}`);
            const data = await this.downloadResultFile(dataUrl);
            if (data && data.length > 0) {
              console.log(`✅ Fetched ${data.length} records from log URL`);
              return data;
            }
          } else {
            console.log("⚠️  No CSV/JSON URL found in output logs");
          }
        }
      } catch (outputError) {
        console.log(`⚠️  Strategy 4 failed: ${outputError.message}`);
      }

      console.warn("❌ No result data found using any strategy");
      console.log("💡 Tip: Check PhantomBuster dashboard to verify the phantom saved results");
      return [];
    } catch (error) {
      console.error("❌ Error fetching result:", error.message);
      return [];
    }
  }

  // ============================================
  // DOWNLOAD RESULT FILE FROM URL
  // ============================================
  /** Returns { data, status }. Use status to detect 403 (private S3) and avoid retrying. */
  async downloadResultFileWithStatus(url) {
    const empty = { data: [], status: null };
    try {
      const isCSV = url.toLowerCase().endsWith('.csv');
      const isJSON = url.toLowerCase().endsWith('.json');
      if (!isCSV && !isJSON) {
        console.warn(`⚠️  Unknown file type for URL: ${url}`);
        return empty;
      }
      const fileType = isCSV ? 'CSV' : 'JSON';
      console.log(`📥 Downloading ${fileType} from: ${url}`);
      const response = await axios.get(url, {
        timeout: 60000,
        responseType: isCSV ? 'text' : 'json',
        validateStatus: () => true
      });
      const status = response.status;
      if (status === 403) {
        console.log(`   ❌ ${url} → 403 Forbidden`);
        return { data: [], status: 403 };
      }
      if (status < 200 || status >= 300) {
        return { ...empty, status };
      }
      if (!response.data) return { ...empty, status };
      if (isCSV) {
        const jsonData = this.parseCSVToJSON(response.data);
        const data = this.parseResultData(jsonData);
        console.log(`✅ ${fileType} downloaded, ${data.length} records`);
        return { data, status };
      }
      const data = this.parseResultData(response.data);
      console.log(`✅ ${fileType} downloaded, ${data.length} records`);
      return { data, status };
    } catch (error) {
      const status = error.response?.status ?? null;
      if (status === 404) return { data: [], status: 404 };
      console.error(`❌ Error downloading result file: ${error.message}`);
      return { data: [], status };
    }
  }

  async downloadResultFile(url) {
    const { data } = await this.downloadResultFileWithStatus(url);
    return data;
  }

  // Helper: Parse CSV to JSON (handles quoted fields, commas in values)
  parseCSVToJSON(csvText) {
    if (!csvText || typeof csvText !== "string") return [];
    const trimmed = csvText.trim();
    if (!trimmed) return [];
    try {
      const rows = parse(trimmed, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        bom: true,
        trim: true
      });
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn("⚠️ CSV parse error:", e.message);
      return [];
    }
  }

  // ============================================
  // MATCH PROFILES BY REQUESTED URLS (JSON/CSV agnostic)
  // ============================================
  normalizeLinkedInUsername(url) {
    if (!url || typeof url !== "string") return "";
    const m = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
    return m ? m[1].toLowerCase().replace(/\/$/, "") : "";
  }

  getProfileUrlFromRow(profile) {
    return (
      profile.profileUrl ||
      profile.linkedinProfileUrl ||
      profile.linkedinUrl ||
      profile.linkedInUrl ||
      profile.url ||
      profile.linkedIn ||
      ""
    );
  }

  profileMatchesUrl(profile, targetUrl) {
    const targetUser = this.normalizeLinkedInUsername(targetUrl);
    if (!targetUser) return false;
    const profileUrl = this.getProfileUrlFromRow(profile);
    const s = (v) => (v && typeof v === "string" ? v.toLowerCase() : "");
    const profileUrlL = s(profileUrl);
    const query = s(profile.query || "");
    const slug = s(profile.linkedinProfileSlug || "");
    const profileUser = this.normalizeLinkedInUsername(profileUrl);
    if (profileUser && profileUser === targetUser) return true;
    if (slug && (slug === targetUser || slug.includes(targetUser))) return true;
    if (profileUrlL && (profileUrlL.includes(targetUser) || profileUrlL.includes(s(targetUrl)))) return true;
    if (query && query.includes(targetUser)) return true;
    return false;
  }

  filterProfilesByRequestedUrls(profiles, profileUrls) {
    if (!Array.isArray(profiles) || !Array.isArray(profileUrls)) return [];
    const filtered = profiles.filter(profile => {
      const match = profileUrls.some(targetUrl => this.profileMatchesUrl(profile, targetUrl));
      if (match) {
        const url = this.getProfileUrlFromRow(profile);
        const user = this.normalizeLinkedInUsername(url) || profile.linkedinProfileSlug || "?";
        console.log(`   ✅ Matched: ${profile.scraperFullName || profile.fullName || profile.name || "?"} (${user})`);
      }
      return match;
    });
    return filtered;
  }

  // ============================================
  // EXTRACT RESULT URL FROM LOG (JSON preferred, then CSV)
  // ============================================
  extractResultUrlFromLog(log) {
    if (!log || typeof log !== "string") return null;
    const jsonPatterns = [
      /JSON saved at (https:\/\/[^\s"]+\.json)/i,
      /saved at (https:\/\/[^\s"]+\.json)/i,
      /(https:\/\/phantombuster\.s3[^\s"]+\.json)/i,
      /(https:\/\/[^\s"]+\.json)/i
    ];
    const csvPatterns = [
      /CSV saved at (https:\/\/[^\s"]+\.csv)/i,
      /saved at (https:\/\/[^\s"]+\.csv)/i,
      /(https:\/\/phantombuster\.s3[^\s"]+\.csv)/i,
      /(https:\/\/[^\s"]+\.csv)/i
    ];
    for (const re of jsonPatterns) {
      const m = log.match(re);
      if (m && m[1]) return m[1];
    }
    for (const re of csvPatterns) {
      const m = log.match(re);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  // ============================================
  // EXTRACT INLINE RESULT (API JSON)
  // ============================================
  extractInlineResult(obj) {
    if (!obj || typeof obj !== "object") return [];
    const keys = ["data", "result", "output", "rows", "profiles", "leads", "items", "results"];
    for (const k of keys) {
      const v = obj[k];
      if (!Array.isArray(v)) continue;
      const parsed = this.parseResultData(v);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }

  // ============================================
  // PARSE RESULT DATA (CSV rows, API JSON)
  // ============================================
  parseResultData(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return [];
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.result)) return data.result;
    if (Array.isArray(data.output)) return data.output;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.profiles)) return data.profiles;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.results)) return data.results;
    return [];
  }

  // ============================================
  // 1. EXPORT CONNECTIONS
  // ============================================
  async exportConnections() {
    try {
      console.log("\n🔵 === STARTING CONNECTION EXPORT ===\n");

      const phantomId = process.env.CONNECTIONS_EXPORT_PHANTOM_ID;
      if (!phantomId) {
        throw new Error("❌ CONNECTIONS_EXPORT_PHANTOM_ID not set in .env");
      }

      // Connection Export: Use PhantomBuster dashboard LinkedIn connection (same as Search Export)
      // Do NOT send cookie from .env - phantom uses the LinkedIn account connected in dashboard
      console.log("📌 Connection Export: Using LinkedIn account from PhantomBuster dashboard (no cookie sent)");
      const { containerId, uniqueResultBase } = await this.launchPhantom(phantomId, {}, { minimalArgs: true });
      const container = await this.waitForCompletion(containerId, phantomId);
      container.uniqueResultBase = uniqueResultBase;
      container.agentId = phantomId;

      // PhantomBuster may write the result file a few seconds after "finished" – try once, then retry after delay
      let data = await this.fetchResultData(container);
      if (data.length === 0) {
        console.log("⏳ No result yet; waiting 8s for PhantomBuster to write file, then retrying...");
        await this.sleep(8000);
        data = await this.fetchResultData(container);
      }

      // Check if data is valid leads or just an error message like "No new profile found"
      const hasValidLeads = data.length > 0 && !data[0].error && (data[0].profileUrl || data[0].linkedinUrl || data[0].url);

      // If no valid leads found (empty OR just "No new profile found" error), fetch ALL existing data
      if (!hasValidLeads) {
        console.log("⚠️ No new connections found (or error). Fetching ALL existing connections from PhantomBuster database...");

        // If the data was an error object, log it
        if (data.length > 0 && data[0].error) {
          console.log(`   Phantom message: ${data[0].error}`);
        }

        data = await this.fetchAllConnectionsFromDatabase(phantomId);
        console.log(`📊 Retrieved ${data.length} existing connections from PhantomBuster database`);
      } else {
        console.log(`📊 Retrieved ${data.length} new connections from latest run`);
      }

      return {
        success: true,
        containerId,
        phantomId,
        totalRecords: data.length,
        data: data,
        resultUrl: container.resultObject
      };
    } catch (error) {
      console.error("❌ Export Connections Error:", error.message);
      throw error;
    }
  }

  // ============================================
  // FETCH ALL CONNECTIONS FROM PHANTOMBUSTER DATABASE
  // ============================================
  async fetchAllConnectionsFromDatabase(phantomId) {
    try {
      console.log("📥 Fetching all connections from PhantomBuster database...");

      // Try multiple database file names that PhantomBuster might use
      const databaseFiles = [
        "database.json",
        "database.csv",
        "result.json",
        "result.csv",
        "leads.json",
        "contacts.json",
        "connections.json",
        "connections.csv",
        "database-linkedin-network-booster.json",
        "database-linkedin-network-booster.csv",
        "linkedinNetworkBooster.json",
        "linkedinNetworkBooster.csv",
        "linkedin_network_booster.json"
      ];

      for (const fileName of databaseFiles) {
        try {
          const fileUrl = `https://phantombuster.s3.amazonaws.com/agent-${phantomId}/${fileName}`;
          console.log(`   Trying: ${fileName}...`);

          const { data, status } = await this.downloadResultFileWithStatus(fileUrl);

          if (status === 403) {
            console.log("   ⚠️ S3 storage is private. Trying alternative methods...");
            break; // Don't try more S3 URLs if we get 403
          }

          if (data && data.length > 0) {
            console.log(`   ✅ Found ${data.length} connections in ${fileName}`);
            return data;
          }
        } catch (err) {
          // Continue to next file
          continue;
        }
      }

      // If S3 is private or no files found, try fetching from agent output
      console.log("📊 Trying to fetch from agent's last successful output...");
      try {
        const agentOutput = await pbRequest(`/agents/fetch-output?id=${phantomId}`);

        // Check if there's a resultObject URL
        const outputUrl = agentOutput?.resultObject;
        if (outputUrl && typeof outputUrl === "string") {
          console.log(`   ✅ Found output URL: ${outputUrl}`);
          const data = await this.downloadResultFile(outputUrl);
          if (data && data.length > 0) {
            console.log(`   ✅ Retrieved ${data.length} connections from agent output`);
            return data;
          }
        }

        // Try extracting from output log
        const log = typeof agentOutput?.output === "string" ? agentOutput.output : "";
        if (log) {
          const dataUrl = this.extractResultUrlFromLog(log);
          if (dataUrl) {
            console.log(`   ✅ Found result URL in logs: ${dataUrl}`);
            const data = await this.downloadResultFile(dataUrl);
            if (data && data.length > 0) {
              console.log(`   ✅ Retrieved ${data.length} connections from log URL`);
              return data;
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Could not fetch from agent output: ${err.message}`);
      }

      console.warn("⚠️ Could not find existing connections in PhantomBuster database");
      console.log("💡 Tip: The phantom may need to be run at least once manually to populate its database");
      return [];
    } catch (error) {
      console.error("❌ Error fetching all connections:", error.message);
      return [];
    }
  }

  // ============================================
  // 2. SEARCH LEADS
  // ============================================
  async searchLeads(searchQuery, numberOfResults) {
    try {
      // LinkedIn Search Export: full LinkedIn people search URL (not a keyword).
      const searchUrl =
        searchQuery != null && searchQuery !== ""
          ? (typeof searchQuery === "string" ? searchQuery.trim() : String(searchQuery)).startsWith("http")
            ? searchQuery.trim()
            : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery.trim())}&origin=GLOBAL_SEARCH_HEADER`
          : "";

      const limitNum =
        numberOfResults != null && numberOfResults !== "" && Number(numberOfResults) > 0
          ? Number(numberOfResults)
          : null;

      // PhantomBuster LinkedIn Search Export often rejects launch args → "argument-invalid".
      // Default: send NO custom args; phantom uses only what's set in its PhantomBuster dashboard.
      // User must set the search URL (and limit) in PhantomBuster → LinkedIn Search Export agent.
      // To try passing search URL/limit from the app, set SEARCH_EXPORT_USE_APP_ARGS=true (may still fail).
      const useAppArgs = /^(1|true|yes)$/i.test(
        String(process.env.SEARCH_EXPORT_USE_APP_ARGS || "").trim()
      );
      const argStyle = String(process.env.SEARCH_EXPORT_ARG_STYLE || "legacy").trim().toLowerCase();
      const sendLimit = /^(1|true|yes)$/i.test(
        String(process.env.SEARCH_EXPORT_SEND_LIMIT || "").trim()
      );

      const additionalArgs = {};
      if (useAppArgs) {
        if (searchUrl) {
          if (argStyle === "spreadsheet") {
            additionalArgs.spreadsheetUrl = searchUrl;
          } else {
            additionalArgs.search = searchUrl;
          }
        }
        if (sendLimit && limitNum != null) {
          if (argStyle === "spreadsheet") {
            additionalArgs.numberOfResults = limitNum;
          } else {
            additionalArgs.numberOfProfiles = limitNum;
          }
        }
      }

      console.log("\n🔵 === STARTING LEAD SEARCH ===\n");
      if (!useAppArgs) {
        console.log("🔍 No custom args sent – phantom uses search URL & limit from PhantomBuster dashboard.");
        if (searchUrl) console.log(`   (App built URL for reference: ${searchUrl})`);
        console.log("");
      } else {
        if (searchUrl) console.log(`🔍 Search URL: ${searchUrl}`);
        if (limitNum != null) console.log(`📊 Limit: ${limitNum}`);
        console.log("");
      }

      // LinkedIn Search Export phantom ID (must be set in .env)
      const phantomId = process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID;
      if (!phantomId) {
        throw new Error("❌ SEARCH_EXPORT_PHANTOM_ID (LinkedIn Search Export phantom) not set in .env");
      }

      // Use minimal args so we don't send params this phantom doesn't accept (avoids "Invalid argument")
      const { containerId, uniqueResultBase } = await this.launchPhantom(phantomId, additionalArgs, { minimalArgsForSearch: true });

      const container = await this.waitForCompletion(containerId, phantomId);
      container.uniqueResultBase = uniqueResultBase;
      let data = await this.fetchResultData(container);
      if (data.length === 0) {
        console.log("⏳ No result yet; waiting 8s for PhantomBuster to write file, then retrying...");
        await this.sleep(8000);
        data = await this.fetchResultData(container);
      }
      console.log(`\n📊 Found ${data.length} leads\n`);

      return {
        success: true,
        containerId,
        phantomId,
        totalRecords: data.length,
        data: data,
        resultUrl: container.resultObject
      };
    } catch (error) {
      console.error("❌ Search Leads Error:", error.message);
      throw error;
    }
  }

  // ============================================
  // 2B. IMPORT RESULTS BY CONTAINER ID (no launch – use after running phantom from dashboard)
  // ============================================
  async importResultsByContainerId(containerId, phantomId = null) {
    const pid = phantomId || process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID;
    if (!containerId || String(containerId).trim() === "") {
      throw new Error("containerId is required");
    }
    const cid = String(containerId).trim();
    console.log("\n📥 === IMPORT BY CONTAINER ID ===\n");
    console.log(`   Container ID: ${cid}`);
    const container = await this.fetchContainerStatus(cid);
    if (!container || !container.id) {
      throw new Error("Container not found. Check the ID or wait a moment and try again.");
    }
    container.agentId = container.agentId || pid;
    let data = await this.fetchResultData(container);
    if (data.length === 0) {
      await this.sleep(5000);
      data = await this.fetchResultData(container);
    }
    console.log(`\n📊 Fetched ${data.length} records from container ${cid}\n`);
    return {
      success: true,
      containerId: cid,
      phantomId: container.agentId || pid,
      totalRecords: data.length,
      data
    };
  }

  // ============================================
  // 3. ENRICH PROFILES
  // ============================================
  async enrichProfiles(profileUrls) {
    try {
      console.log("\n🔵 === STARTING PROFILE ENRICHMENT ===\n");
      console.log(`📊 Profiles to enrich: ${profileUrls.length}`);

      // Log the URLs being enriched
      profileUrls.forEach((url, idx) => {
        console.log(`   ${idx + 1}. ${url}`);
      });

      const phantomId = process.env.PROFILE_SCRAPER_PHANTOM_ID;
      if (!phantomId) {
        throw new Error("❌ PROFILE_SCRAPER_PHANTOM_ID not set in .env");
      }

      // CRITICAL: The agent has SAVED settings that override what we pass!
      // We need to be VERY explicit about overriding them.

      console.log(`⚠️  WARNING: Agent may have saved spreadsheetUrl - forcing override!`);

      const { containerId, uniqueResultBase } = await this.launchPhantom(phantomId, {
        // FORCE USE OF OUR URL (not saved spreadsheet)
        spreadsheetUrl: profileUrls.join('\n'),
        csvName: profileUrls.join('\n'),  // Some agents use this parameter name

        // FORCE PROFILE LIMIT (override default of 200!)
        numberOfProfiles: profileUrls.length,
        numberOfAddsPerLaunch: profileUrls.length,
        profilesPerLaunch: profileUrls.length,  // Alternative parameter name
        maxProfiles: profileUrls.length,  // Another alternative

        // DISABLE SAVED DATABASE/SPREADSHEET READING
        removeDuplicates: false,  // Don't check saved database
        onlyProcessInputUrl: true,  // Only use what we provide
        useDatabase: false,  // Don't use saved database
        checkDatabase: false,  // Don't check database

        // FORCE STORAGE SETTINGS
        pushResultToCRM: false,  // Don't push to CRM
        saveResultsToDatabase: true,  // Save to PhantomBuster
        saveToCloud: true,  // Save to cloud

        // SPEED OPTIMIZATIONS
        enrichWithCompanyData: false,  // Faster
        updateMonitoringMetadata: false,  // Faster
        scrapeConnections: false,  // Don't scrape connections
        getAllConnections: false  // Don't get all connections
      });

      const container = await this.waitForCompletion(containerId, phantomId, 20);
      container.uniqueResultBase = uniqueResultBase;
      const data = await this.fetchResultData(container);

      console.log(`\n📊 PhantomBuster returned ${data.length} profiles (JSON/CSV)\n`);
      if (data.length > 0 && data.length !== profileUrls.length) {
        console.log(`   🔍 Matching by enriched URL(s) — requested ${profileUrls.length}, got ${data.length}`);
        profileUrls.forEach((u, i) => console.log(`      ${i + 1}. ${this.normalizeLinkedInUsername(u) || u}`));
      }

      // Always match by enriched URL(s): fetch JSON (or CSV), then filter to only requested profiles
      const matched = this.filterProfilesByRequestedUrls(data, profileUrls);
      if (matched.length > 0) {
        console.log(`   ✅ Matched ${matched.length} profile(s) for enriched URL(s)`);
        return {
          success: true,
          containerId,
          phantomId,
          totalRecords: matched.length,
          data: matched,
          resultUrl: container.resultObject
        };
      }

      if (data.length > 0) {
        console.log(`   ❌ No profiles matched enriched URL(s); not using first N as fallback`);
        const sample = data[0];
        const name = sample?.scraperFullName || sample?.fullName || sample?.name || [sample?.firstName, sample?.lastName].filter(Boolean).join(" ") || "?";
        const url = this.getProfileUrlFromRow(sample) || "?";
        console.log(`   📋 Sample: ${name} — ${url}`);
      }
      return {
        success: true,
        containerId,
        phantomId,
        totalRecords: 0,
        data: [],
        resultUrl: container.resultObject
      };
    } catch (error) {
      console.error("❌ Enrich Profiles Error:", error.message);
      throw error;
    }
  }

  // ============================================
  // 3B. SCRAPE SINGLE PROFILE
  // ============================================
  async scrapeProfile(profileUrl) {
    try {
      console.log(`\n🔍 === SCRAPING SINGLE PROFILE ===\n`);
      console.log(`📋 Profile URL: ${profileUrl}`);

      const phantomId = process.env.PROFILE_SCRAPER_PHANTOM_ID;
      if (!phantomId) {
        console.warn('⚠️ PROFILE_SCRAPER_PHANTOM_ID not configured');
        throw new Error('PROFILE_SCRAPER_PHANTOM_ID not configured');
      }

      // Fetch JSON (or CSV), match by enriched URL, return only matched profile
      const result = await this.enrichProfiles([profileUrl]);

      if (result.data && result.data.length > 0) {
        const matched = result.data[0];
        const name = matched.scraperFullName || matched.fullName || matched.name ||
          [matched.firstName, matched.lastName].filter(Boolean).join(" ") || "?";
        console.log(`   ✅ Using matched profile: ${name}`);
        return {
          success: true,
          data: matched,
          containerId: result.containerId
        };
      }

      throw new Error('No data returned from PhantomBuster (no profile matched enriched URL)');
    } catch (error) {
      console.error("❌ Scrape Profile Error:", error.message);
      throw error;
    }
  }

  // ============================================
  // 4. AUTO CONNECT (NETWORK BOOSTER)
  // ============================================
  async autoConnect(profiles, messages = null) {
    try {
      console.log("\n🔵 === STARTING AUTO CONNECT ===\n");
      console.log(`📊 Profiles to connect: ${profiles.length}`);
      console.log(`💬 Messages provided: ${messages ? 'Yes' : 'No'}`);

      const phantomId = process.env.LINKEDIN_OUTREACH_PHANTOM_ID ||
        process.env.PHANTOM_CONNECT_ID ||
        process.env.PHANTOM_NETWORK_BOOSTER_ID ||
        process.env.AUTO_CONNECT_PHANTOM_ID; // Added support for user's var name

      if (!phantomId) {
        throw new Error("❌ LINKEDIN_OUTREACH_PHANTOM_ID (or PHANTOM_CONNECT_ID/AUTO_CONNECT_PHANTOM_ID) not set in .env");
      }

      // Format: LinkedIn URL (and optional message)
      // PhantomBuster Network Booster accepts a spreadsheet URL or raw text with URLs
      // For messages, we need to format as CSV with "LinkedInUrl" and "Message" columns
      // OR pass messages as a parameter if the phantom supports it

      const profileUrls = profiles.map(p => p.linkedin_url).filter(u => u);

      // Build phantom arguments
      const phantomArgs = {
        numberOfAddsPerLaunch: profiles.length,
      };

      // Format URLs and messages for PhantomBuster Auto Connect
      // The phantom expects:
      // - profileUrls: Plain LinkedIn URLs (one per line) - NOT spreadsheetUrl!
      // - message: The connection request message (same for all profiles)

      if (messages && messages.length > 0) {
        // Send URLs as plain text (one per line) with argument name "profileUrls"
        phantomArgs.profileUrls = profileUrls.join('\n');

        // Get the message (use first one if array)
        const messageText = typeof messages === 'string' ? messages : messages[0];

        // Try multiple argument names for the message (different phantoms use different names)
        phantomArgs.message = messageText;
        phantomArgs.messageText = messageText;
        phantomArgs.yourMessage = messageText;  // From "Your message" field in phantom
        phantomArgs.messageContent = messageText;  // From "Message content" section
        phantomArgs.note = messageText;
        phantomArgs.invitationMessage = messageText;

        console.log(`   📝 Sending ${profileUrls.length} profile(s) with message (${messageText.length} chars)`);
        console.log(`   📋 URLs: ${profileUrls.join(', ')}`);
        console.log(`   💬 Message: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`);
      } else {
        // No messages provided, just URLs
        phantomArgs.profileUrls = profileUrls.join('\n');
        console.log(`   ⚠️  No messages provided - sending connection requests without notes`);
        console.log(`   📋 URLs: ${profileUrls.join(', ')}`);
      }

      const { containerId } = await this.launchPhantom(phantomId, phantomArgs);

      console.log(`✅ Auto Connect Launched. Container ID: ${containerId}`);

      return {
        success: true,
        containerId,
        phantomId,
        count: profiles.length,
        hasMessages: !!messages
      };
    } catch (error) {
      console.error("❌ Auto Connect Error:", error.message);
      throw error;
    }
  }

  // ============================================
  // 5. SEND LINKEDIN MESSAGE
  // ============================================
  async sendMessage(profile, messageContent, options = {}) {
    try {
      console.log("\n📧 === STARTING LINKEDIN MESSAGE SEND ===\n");
      console.log(`📋 Profile: ${profile.linkedin_url || profile.full_name || 'Unknown'}`);
      console.log(`💬 Message length: ${messageContent?.length || 0} characters`);

      // Prefer dedicated LinkedIn Message Sender phantom when set; otherwise use LinkedIn Outreach
      const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID ||
        process.env.LINKEDIN_MESSAGE_PHANTOM_ID ||
        process.env.MESSAGE_SENDER_PHANTOM_ID ||
        process.env.LINKEDIN_OUTREACH_PHANTOM_ID;

      if (!phantomId) {
        throw new Error("❌ For sending messages set MESSAGE_SENDER_PHANTOM_ID (LinkedIn Message Sender) or LINKEDIN_OUTREACH_PHANTOM_ID in .env");
      }

      if (!profile.linkedin_url) {
        throw new Error("Profile must have a LinkedIn URL");
      }

      if (!messageContent || messageContent.trim().length === 0) {
        throw new Error("Message content cannot be empty");
      }

      // PhantomBuster dashboard has "First Name" – we override with our AI message via spreadsheetUrl.
      // spreadsheetUrl must be a fetchable URL; our backend serves CSV at /api/phantom/message-csv/:token
      const spreadsheetUrl = options.spreadsheetUrl;

      // Check if this is LinkedIn Outreach phantom (it uses different argument format)
      const isLinkedInOutreach = phantomId === process.env.LINKEDIN_OUTREACH_PHANTOM_ID ||
        phantomId === process.env.PHANTOM_CONNECT_ID ||
        phantomId === process.env.PHANTOM_NETWORK_BOOSTER_ID ||
        phantomId === process.env.AUTO_CONNECT_PHANTOM_ID;

      let launchArgs;
      let launchOptions = {};

      if (isLinkedInOutreach) {
        // LinkedIn Outreach: Use profileUrls format (like autoConnect) and don't send sessionCookie
        // LinkedIn Outreach uses dashboard connection, not API cookie
        console.log("📌 Using LinkedIn Outreach format (dashboard connection, no session cookie)");
        launchArgs = {
          profileUrls: profile.linkedin_url,  // Single URL as string (Outreach accepts single URL)
          message: messageContent,
          messageText: messageContent,
          yourMessage: messageContent,
          ...(spreadsheetUrl && { spreadsheetUrl })
        };
        // Use noSessionCookie option - LinkedIn Outreach needs args but NOT session cookie
        launchOptions = { noSessionCookie: true };
      } else {
        // LinkedIn Message Sender: Expects spreadsheetUrl with CSV, NOT linkedInUrl
        // Based on debug: phantom expects spreadsheetUrl, message, profilesPerLaunch, messageColumnName
        // IMPORTANT: Use cookie from dashboard saved configuration (not from .env)
        console.log("📌 Using LinkedIn Message Sender format (spreadsheetUrl required)");
        console.log("📌 Fetching sessionCookie from PhantomBuster dashboard saved configuration...");

        if (!spreadsheetUrl) {
          throw new Error("❌ LinkedIn Message Sender requires spreadsheetUrl. Set BACKEND_PUBLIC_URL in .env or ensure spreadsheetUrl is provided in options.");
        }

        // Check if cookie exists in dashboard, but DON'T send it via API
        // PhantomBuster will use the cookie from dashboard configuration automatically
        // Sending it via API can cause "network-cookie-invalid" because LinkedIn detects different IP/location

        // Extract dashboard cookie so we can inject it explicitly if needed
        let dashboardCookieValue = null;
        let hasDashboardCookie = false;

        try {
          const agentConfig = await this.fetchAgent(phantomId);
          if (agentConfig?.argument) {
            let savedArgs = {};
            try {
              savedArgs = typeof agentConfig.argument === 'string'
                ? JSON.parse(agentConfig.argument)
                : agentConfig.argument;

              dashboardCookieValue = savedArgs.sessionCookie || savedArgs.linkedinSessionCookie;
              hasDashboardCookie = !!dashboardCookieValue;

              if (hasDashboardCookie) {
                console.log("✅ Found sessionCookie in dashboard saved configuration");
              } else {
                console.log("⚠️  No sessionCookie found in dashboard saved configuration");
              }
            } catch (parseErr) {
              console.log("⚠️  Could not parse saved arguments:", parseErr.message);
            }
          }
        } catch (fetchErr) {
          console.log("⚠️  Could not fetch agent config:", fetchErr.message);
        }

        launchArgs = {
          spreadsheetUrl: spreadsheetUrl,
          message: messageContent,  // Fallback/default message
          messageColumnName: "message",  // Column name in CSV for messages
          profilesPerLaunch: 1,  // Process 1 profile at a time
        };

        // CRITICAL FIX: Explicitly INJECT the dashboard cookie into the launch arguments.
        // Why? Because passing ANY launchArgs prevents PhantomBuster from merging with default config defaults for some phantoms.
        // By injecting the exact same cookie PB already has, we satisfy the requirement for a cookie 
        // while minimizing "network-cookie-invalid" risks since it matches their record.

        if (hasDashboardCookie && dashboardCookieValue) {
          console.log("✅ Injecting dashboard cookie into launch arguments (solves 'cookie-missing' error)");
          launchArgs.sessionCookie = dashboardCookieValue;
          launchOptions = { noSessionCookie: true }; // Don't use .env, use the one we just injected
        } else {
          console.log("⚠️  Falling back to .env cookie (Dashboard cookie missing)");
          launchOptions = { noSessionCookie: false }; // Use .env
        }


      }

      // Debug: Log exact arguments being sent
      console.log(`\n🔍 DEBUG: Phantom ID: ${phantomId}`);
      console.log(`🔍 DEBUG: Is LinkedIn Outreach: ${isLinkedInOutreach}`);
      console.log(`🔍 DEBUG: Launch Args:`, JSON.stringify(launchArgs, null, 2));
      console.log(`🔍 DEBUG: Launch Options:`, JSON.stringify(launchOptions, null, 2));
      // Debug logging - use safe checks
      const usingDashboard = launchOptions.noSessionCookie ? 'YES' : 'NO';
      console.log(`🔍 DEBUG: Using dashboard connection: ${usingDashboard}`);
      console.log(`🔍 DEBUG: Will send cookie from .env: ${launchOptions.noSessionCookie ? 'NO (using dashboard)' : 'YES (if available)'}`);

      // Debug: Fetch agent config to see what arguments it accepts
      try {
        const agentConfig = await this.fetchAgent(phantomId);
        if (agentConfig?.agent) {
          console.log(`🔍 DEBUG: Agent Name: ${agentConfig.agent.name || 'Unknown'}`);
          console.log(`🔍 DEBUG: Agent Type: ${agentConfig.agent.agentType || 'Unknown'}`);
          if (agentConfig.agent.arguments) {
            console.log(`🔍 DEBUG: Agent Accepts Arguments:`, Object.keys(agentConfig.agent.arguments || {}).join(', '));
          }
        }
      } catch (err) {
        console.log(`⚠️ Could not fetch agent config for debugging: ${err.message}`);
      }

      const { containerId } = await this.launchPhantom(phantomId, launchArgs, launchOptions);

      // Wait for the phantom to actually finish – only then can we say the message was sent.
      // If the container fails (e.g. wrong args, LinkedIn not connected), we throw and the app won't mark "Sent".
      const maxWaitMinutes = 5;
      const container = await this.waitForCompletion(containerId, phantomId, maxWaitMinutes);
      if (container.exitCode !== 0 && container.exitCode != null) {
        // Enhanced error: Try to fetch detailed container output
        let detailedError = `Container failed with exit code ${container.exitCode}`;
        try {
          const output = await this.fetchContainerOutput(containerId);
          if (output) {
            detailedError += `\n📋 Container Output:\n${output}`;

            // Check for cookie-missing error and provide specific guidance
            if (output.includes('cookie-missing') || output.includes('RE: cookie-missing')) {
              detailedError += `\n\n🔧 FIX REQUIRED: LinkedIn is NOT connected in PhantomBuster dashboard!\n`;
              detailedError += `   The phantom needs an ACTIVE OAuth connection, not just a saved cookie.\n\n`;
              detailedError += `   Steps to fix:\n`;
              detailedError += `   1. Go to https://phantombuster.com/\n`;
              detailedError += `   2. Open phantom ID: ${phantomId}\n`;
              detailedError += `   3. Find "Connect to LinkedIn" section\n`;
              detailedError += `   4. Click "Connect" and authorize with LinkedIn\n`;
              detailedError += `   5. Verify it shows "Connected" ✅ with green checkmark\n`;
              detailedError += `   6. Click "Save" to save the configuration\n`;
              detailedError += `   7. Restart backend server and try again\n\n`;
              detailedError += `   ⚠️  Just having a cookie saved ≠ LinkedIn is connected!\n`;
              detailedError += `   You MUST go through the "Connect" OAuth flow.\n`;
            }
          }

          // Also try to get container details
          const containerDetails = await this.fetchContainerStatus(containerId);
          if (containerDetails?.output) {
            detailedError += `\n📋 Container Details Output:\n${containerDetails.output}`;
          }
          if (containerDetails?.exitMessage) {
            detailedError += `\n📋 Exit Message: ${containerDetails.exitMessage}`;
          }
        } catch (fetchErr) {
          console.error("⚠️ Could not fetch detailed container output:", fetchErr.message);
        }

        detailedError += `\n💡 Check PhantomBuster dashboard for container ${containerId} to see full error details.`;
        detailedError += `\n💡 Debug command: node scripts/debug-container-error.js ${containerId}`;

        // If cookie-missing, provide specific guidance
        if (detailedError.includes('cookie-missing')) {
          detailedError += `\n\n🔧 FIX FOR "cookie-missing" ERROR:`;
          detailedError += `\n   1. Go to https://phantombuster.com/`;
          detailedError += `\n   2. Open your Message Sender phantom (ID: ${phantomId})`;
          detailedError += `\n   3. Find "Connect to LinkedIn" section`;
          detailedError += `\n   4. Click "Connect" and complete OAuth authorization`;
          detailedError += `\n   5. Verify it shows "Connected" with green checkmark ✅`;
          detailedError += `\n   6. Click "Save" to save configuration`;
          detailedError += `\n   7. Restart backend and try again`;
          detailedError += `\n\n   NOTE: Having a cookie value saved ≠ LinkedIn is connected!`;
          detailedError += `\n   You MUST go through the "Connect" OAuth flow.`;
        }

        if (detailedError.includes('Timeout exceeded') || detailedError.includes('timeout')) {
          detailedError += `\n\n🔧 FIX FOR "Timeout exceeded" ERROR:`;
          detailedError += `\n   The PhantomBuster agent timed out trying to load LinkedIn.`;
          detailedError += `\n   This almost always means your **Session Cookie is invalid/expired** and LinkedIn redirected to the login page.`;
          detailedError += `\n   \n   ACTION REQUIRED:`;
          detailedError += `\n   1. Log into PhantomBuster`;
          detailedError += `\n   2. Open the phantom dashboard (ID: ${phantomId})`;
          detailedError += `\n   3. Re-connect your LinkedIn account (Session Cookie)`;
          detailedError += `\n   4. Save configuration`;
        }

        throw new Error(detailedError);
      }

      // Message Sender also scrapes basic profile – fetch result to capture enrichment data
      container.uniqueResultBase = `result_${Date.now()}`;
      let resultData = [];
      try {
        resultData = await this.fetchResultData(container);
        if (resultData.length > 0) {
          console.log(`📋 Message Sender returned ${resultData.length} record(s) – may include profile data for enrichment`);
        }
      } catch (fetchErr) {
        console.log(`⚠️ Could not fetch Message Sender result (non-fatal): ${fetchErr.message}`);
      }

      console.log(`✅ LinkedIn Message Send completed. Container ID: ${containerId}`);

      return {
        success: true,
        containerId,
        phantomId,
        profileUrl: profile.linkedin_url,
        messageLength: messageContent.length,
        resultData
      };
    } catch (error) {
      console.error("❌ Send Message Error:", error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const phantomService = new PhantomBusterService();

export default phantomService;

export const launchPhantom = (phantomId, sessionCookie, additionalArgs) =>
  phantomService.launchPhantom(phantomId, additionalArgs);

export const fetchPhantomStatus = (containerId) =>
  phantomService.fetchContainerStatus(containerId);

export const fetchPhantomResult = (resultObjectId) =>
  phantomService.fetchResultData({ resultObject: resultObjectId });

export const exportConnections = () =>
  phantomService.exportConnections();

export const searchLeads = (query, limit) =>
  phantomService.searchLeads(query, limit);

export const enrichProfile = (profileUrls) =>
  phantomService.enrichProfiles(profileUrls);

export const scrapeProfile = (profileUrl) =>
  phantomService.scrapeProfile(profileUrl);

export const autoConnect = (profiles) =>
  phantomService.autoConnect(profiles);

export const sendMessage = (profile, messageContent) =>
  phantomService.sendMessage(profile, messageContent);

export const waitForCompletion = (containerId, phantomId, maxMinutes) =>
  phantomService.waitForCompletion(containerId, phantomId, maxMinutes);