/**
 * industryHierarchy.service.js
 *
 * Uses linkedin_industry_code_v2_all_eng.json (via industryList) to assign
 * primary/secondary/tertiary by comparing user profile industry to lead industry.
 * - Primary (hot): same top-level and same or no subcategory.
 * - Secondary (warm): same top-level, different subcategory.
 * - Tertiary (cold): different top-level.
 */

import { getIndustryList } from './industryList.service.js';
import { INDUSTRY_KEYWORDS } from '../config/industries.js';
import { SUB_INDUSTRY_KEYWORDS } from '../config/industries.js';

function normalise(str = '') {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Distinct top-level industry names from the JSON list. */
let topLevelCache = null;

export async function getTopLevelIndustries() {
  if (topLevelCache) return topLevelCache;
  const list = await getIndustryList();
  const set = new Set(list.map((i) => i.top_level_industry).filter(Boolean));
  topLevelCache = [...set].sort();
  return topLevelCache;
}

/**
 * Resolve lead company+title to top-level industry (same as preferenceScoring).
 * Returns top-level name from INDUSTRY_KEYWORDS or null.
 */
export function resolveLeadTopLevel(company = '', title = '') {
  const text = normalise(`${company} ${title}`);
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS || {})) {
    if (keywords.some((k) => text.includes(normalise(k)))) return industry;
  }
  return null;
}

/**
 * Resolve lead to sub-industry within a top-level (from SUB_INDUSTRY_KEYWORDS).
 * Returns sub name (e.g. "Chemical Manufacturing") or null.
 */
export function resolveLeadSubIndustry(company = '', title = '', topLevel) {
  if (!topLevel || !SUB_INDUSTRY_KEYWORDS[topLevel]) return null;
  const text = normalise(`${company} ${title}`);
  for (const sub of SUB_INDUSTRY_KEYWORDS[topLevel]) {
    if (sub.keywords.some((k) => text.includes(normalise(k)))) return sub.name;
  }
  return null;
}

/**
 * Map a profile industry label (e.g. "Chemical Manufacturing", "Manufacturing") to top-level.
 * Uses industry list: find item whose label or hierarchy contains the given label.
 */
export async function getTopLevelFromIndustryLabel(label) {
  if (!label || typeof label !== 'string') return null;
  const list = await getIndustryList();
  const n = normalise(label);
  // Exact or contains match on label/name
  for (const item of list) {
    const itemLabel = normalise(item.label || item.name || '');
    if (itemLabel === n || itemLabel.includes(n) || n.includes(itemLabel)) return item.top_level_industry || null;
  }
  // Hierarchy contains the label (e.g. "Manufacturing > Chemical Manufacturing")
  for (const item of list) {
    const hierarchy = normalise(item.hierarchy || '');
    if (hierarchy.includes(n)) return item.top_level_industry || null;
  }
  return null;
}

/**
 * Map a profile industry label to sub_category (second-level) when possible.
 */
export async function getSubCategoryFromIndustryLabel(label) {
  if (!label || typeof label !== 'string') return null;
  const list = await getIndustryList();
  const n = normalise(label);
  for (const item of list) {
    const itemLabel = normalise(item.label || item.name || '');
    if (itemLabel === n || itemLabel.includes(n) || n.includes(itemLabel)) return item.sub_category || null;
  }
  for (const item of list) {
    const hierarchy = normalise(item.hierarchy || '');
    if (hierarchy.includes(n)) return item.sub_category || null;
  }
  return null;
}

/**
 * Get tier from hierarchy comparison.
 * - primary: same top-level and (same sub or either missing)
 * - secondary: same top-level, different sub
 * - tertiary: different top-level
 */
export function getTierFromHierarchy(userTopLevel, userSub, leadTopLevel, leadSub) {
  if (!userTopLevel || !leadTopLevel) return 'tertiary';
  const sameTop = normalise(String(userTopLevel)) === normalise(String(leadTopLevel));
  if (!sameTop) return 'tertiary';

  if (!userSub && !leadSub) return 'primary';
  if (!userSub || !leadSub) return 'primary'; // one missing => treat as same
  const sameSub = normalise(String(userSub)) === normalise(String(leadSub));
  return sameSub ? 'primary' : 'secondary';
}

// --- Default export for server.js and industry.routes.js ---

let fullHierarchyCache = null;
let listCache = null;

async function loadIndustryData() {
  const list = await getIndustryList();
  listCache = list;
  topLevelCache = null;
  await getTopLevelIndustries();
  fullHierarchyCache = null;
}

function getFullHierarchy() {
  if (fullHierarchyCache) return fullHierarchyCache;
  if (!listCache) return {};
  const map = {};
  for (const item of listCache) {
    const top = item.top_level_industry || item.hierarchy?.split('>')[0]?.trim();
    if (!top) continue;
    if (!map[top]) map[top] = [];
    const sub = item.sub_category || (item.hierarchy?.split('>').map((p) => p.trim()).filter(Boolean)[1]);
    if (sub && !map[top].includes(sub)) map[top].push(sub);
  }
  fullHierarchyCache = map;
  return map;
}

function getSubtags(industry) {
  if (!listCache) return null;
  const norm = normalise(String(industry));
  const items = listCache.filter(
    (i) => (i.top_level_industry && normalise(i.top_level_industry) === norm) || (i.hierarchy && normalise(i.hierarchy.split('>')[0] || '') === norm)
  );
  if (items.length === 0) return null;
  return items.map((i) => ({ name: i.label || i.name, code: i.code, hierarchy: i.hierarchy, sub_category: i.sub_category }));
}

function getTopLevelIndustriesSync() {
  return topLevelCache || [];
}

function sortIndustriesByPriority(industryCounts, profile, preferenceMode) {
  const entries = Object.entries(industryCounts || {}).map(([name, count]) => ({ name, count: Number(count) || 0 }));
  if (!profile || !preferenceMode) {
    return entries.sort((a, b) => b.count - a.count).map((e) => ({ ...e, score: e.count }));
  }
  const userIndustry = profile.industry || profile.title || profile.company || '';
  let userTop = null;
  for (const [top, keywords] of Object.entries(INDUSTRY_KEYWORDS || {})) {
    if (keywords.some((k) => normalise(userIndustry).includes(normalise(k)))) {
      userTop = top;
      break;
    }
  }
  const scored = entries.map((e) => {
    const leadTop = resolveLeadTopLevel('', e.name);
    const same = userTop && leadTop && normalise(String(userTop)) === normalise(String(leadTop));
    const score = (same ? 2 : 1) * e.count;
    return { ...e, score };
  });
  return scored.sort((a, b) => b.score - a.score);
}

export default {
  loadIndustryData,
  getFullHierarchy,
  getSubtags,
  getTopLevelIndustries: getTopLevelIndustriesSync,
  sortIndustriesByPriority,
};
