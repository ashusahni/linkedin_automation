/**
 * CRM API integration: fetch search criteria and push leads.
 * Configure via .env: CRM_BASE_URL, CRM_API_KEY, optional paths for criteria and import.
 * If CRM is not configured, getSearchCriteriaFromCrm returns null and pushLeadsToCrm is a no-op.
 */

import axios from "axios";

const LOG_PREFIX = "[CRM]";

function getConfig() {
  const baseUrl = (process.env.CRM_BASE_URL || process.env.CRM_API_URL || "").replace(/\/$/, "");
  const apiKey = process.env.CRM_API_KEY || process.env.CRM_API_TOKEN || "";
  const criteriaPath = process.env.CRM_SEARCH_CRITERIA_PATH || "/api/search-criteria";
  const importPath = process.env.CRM_LEADS_IMPORT_PATH || "/api/leads/import";
  return {
    baseUrl,
    apiKey,
    criteriaUrl: baseUrl ? `${baseUrl}${criteriaPath.startsWith("/") ? criteriaPath : `/${criteriaPath}`}` : "",
    importUrl: baseUrl ? `${baseUrl}${importPath.startsWith("/") ? importPath : `/${importPath}`}` : "",
    enabled: Boolean(baseUrl && apiKey),
  };
}

/**
 * Build auth headers for CRM API (Bearer or X-API-Key).
 */
function getAuthHeaders() {
  const apiKey = process.env.CRM_API_KEY || process.env.CRM_API_TOKEN || "";
  if (!apiKey) return {};
  if (process.env.CRM_AUTH_HEADER === "Bearer" || apiKey.toLowerCase().startsWith("bearer ")) {
    return { Authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}` };
  }
  return { "X-API-Key": apiKey };
}

/**
 * Fetch search criteria (industry, location, job title, company) from CRM API.
 * Expected response shape: { industry?, location?, jobTitle?, title?, company?, keywords? }
 * @returns {Promise<Object|null>} - Criteria object or null if CRM not configured / request failed
 */
export async function getSearchCriteriaFromCrm() {
  const { criteriaUrl, enabled } = getConfig();
  if (!enabled || !criteriaUrl) {
    console.log(`${LOG_PREFIX} CRM not configured (CRM_BASE_URL + CRM_API_KEY); skipping criteria fetch.`);
    return null;
  }

  try {
    console.log(`${LOG_PREFIX} GET ${criteriaUrl}`);
    const response = await axios.get(criteriaUrl, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const data = response.data && typeof response.data === "object" ? response.data : {};
    const criteria = {
      industry: data.industry ?? data.Industry ?? "",
      location: data.location ?? data.Location ?? "",
      jobTitle: data.jobTitle ?? data.job_title ?? "",
      title: data.title ?? data.Title ?? "",
      company: data.company ?? data.Company ?? "",
      keywords: data.keywords ?? data.Keywords ?? "",
    };
    console.log(`${LOG_PREFIX} Criteria received:`, JSON.stringify(criteria));
    return criteria;
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to fetch search criteria:`, err.message);
    if (err.response) {
      console.error(`${LOG_PREFIX} Status: ${err.response.status}`, err.response.data);
    }
    throw err;
  }
}

/**
 * Push leads to CRM via API. No-op if CRM import URL not configured.
 * Sends array of leads with linkedinUrl, firstName, lastName, fullName, title, company, location, profileImage.
 * @param {Array<Object>} leads - Parsed lead objects from PhantomBuster
 * @returns {Promise<{ pushed: number, error?: string }>}
 */
export async function pushLeadsToCrm(leads) {
  const { importUrl, enabled } = getConfig();
  if (!enabled || !importUrl || !Array.isArray(leads) || leads.length === 0) {
    if (!enabled || !importUrl) {
      console.log(`${LOG_PREFIX} CRM import not configured; skipping push.`);
    }
    return { pushed: 0 };
  }

  try {
    const payload = leads.map((lead) => ({
      linkedin_url: lead.linkedinUrl,
      first_name: lead.firstName,
      last_name: lead.lastName,
      full_name: lead.fullName,
      title: lead.title,
      company: lead.company,
      location: lead.location,
      profile_image: lead.profileImage,
      source: "linkedin_search_export",
    }));

    console.log(`${LOG_PREFIX} POST ${importUrl} (${leads.length} leads)`);
    const response = await axios.post(importUrl, { leads: payload }, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      timeout: 60000,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const pushed = response.data?.imported ?? response.data?.count ?? leads.length;
    console.log(`${LOG_PREFIX} Pushed ${pushed} leads to CRM.`);
    return { pushed };
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to push leads to CRM:`, err.message);
    if (err.response) {
      console.error(`${LOG_PREFIX} Status: ${err.response.status}`, err.response.data);
    }
    return { pushed: 0, error: err.message };
  }
}

/**
 * Check if CRM is configured (base URL + API key present).
 */
export function isCrmConfigured() {
  return getConfig().enabled;
}
