/**
 * Build LinkedIn people search URL from criteria (industry, location, job title, company).
 * Matches the logic used on the Lead Search page (buildSearchQuery + keywords).
 * LinkedIn people search: https://www.linkedin.com/search/results/people/?keywords=...
 */

const LINKEDIN_PEOPLE_SEARCH_BASE = "https://www.linkedin.com/search/results/people/";

/**
 * Build a keywords string from criteria (same order as Lead Search page).
 * @param {Object} criteria - { title?, jobTitle?, industry?, location?, company?, keywords? }
 * @returns {string} - Space-separated keywords for LinkedIn search
 */
export function buildSearchQueryFromCriteria(criteria) {
  if (!criteria || typeof criteria !== "object") return "";
  const title = criteria.title || criteria.jobTitle || "";
  const industry = criteria.industry || "";
  const location = criteria.location || "";
  const company = criteria.company ? `at ${criteria.company}` : "";
  const extra = criteria.keywords || "";
  const parts = [title, industry, location, company, extra].filter(Boolean);
  return parts.join(" ").trim();
}

/**
 * Build full LinkedIn people search URL from criteria.
 * @param {Object} criteria - { title?, jobTitle?, industry?, location?, company?, keywords? }
 * @returns {string} - Full LinkedIn search URL
 */
export function buildLinkedInSearchUrl(criteria) {
  const query = buildSearchQueryFromCriteria(criteria);
  if (!query) {
    return LINKEDIN_PEOPLE_SEARCH_BASE + "?origin=GLOBAL_SEARCH_HEADER";
  }
  const params = new URLSearchParams({
    keywords: query,
    origin: "GLOBAL_SEARCH_HEADER",
  });
  return `${LINKEDIN_PEOPLE_SEARCH_BASE}?${params.toString()}`;
}
