/**
 * Leads table column definitions (Green / Yellow / Red).
 * Green: default visible, priority order. Yellow: optional in dropdown. Red: backend only (not in this list).
 * accessor: lead field name (or phantom_metadata key). pinned: only first_name is pinned.
 */
export const LEADS_TABLE_COLUMN_DEFS = [
  { id: 'first_name', label: 'First Name', accessor: 'first_name', visibility: 'green', defaultVisible: true, priority: 1, pinned: true },
  { id: 'last_name', label: 'Last Name', accessor: 'last_name', visibility: 'green', defaultVisible: true, priority: 2, pinned: false },
  { id: 'full_name', label: 'Full Name', accessor: 'full_name', visibility: 'green', defaultVisible: true, priority: 3, pinned: false },
  { id: 'location', label: 'Location', accessor: 'location', visibility: 'green', defaultVisible: true, priority: 4, pinned: false },
  { id: 'linkedin_url', label: 'LinkedIn URL', accessor: 'linkedin_url', visibility: 'green', defaultVisible: true, priority: 5, pinned: false },
  { id: 'company', label: 'Company', accessor: 'company', visibility: 'green', defaultVisible: true, priority: 6, pinned: false },
  { id: 'headline', label: 'Headline', accessor: 'title', visibility: 'green', defaultVisible: true, priority: 7, pinned: false },
  { id: 'connection_degree', label: 'Connection', accessor: 'connection_degree', visibility: 'green', defaultVisible: true, priority: 8, pinned: false },
  // Yellow (optional) - from phantom_metadata or lead
  { id: 'timestamp', label: 'Timestamp', accessor: 'phantom_metadata.timestamp', visibility: 'yellow', defaultVisible: false, priority: 10, pinned: false },
  { id: 'category', label: 'Category', accessor: 'phantom_metadata.category', visibility: 'yellow', defaultVisible: false, priority: 11, pinned: false },
  { id: 'query', label: 'Query', accessor: 'phantom_metadata.query', visibility: 'yellow', defaultVisible: false, priority: 12, pinned: false },
  { id: 'company_url', label: 'Company URL', accessor: 'phantom_metadata.company_url', visibility: 'yellow', defaultVisible: false, priority: 13, pinned: false },
  { id: 'company_slug', label: 'Company Slug', accessor: 'phantom_metadata.company_slug', visibility: 'yellow', defaultVisible: false, priority: 14, pinned: false },
  { id: 'company_id', label: 'Company ID', accessor: 'phantom_metadata.company_id', visibility: 'yellow', defaultVisible: false, priority: 15, pinned: false },
  { id: 'industry', label: 'Industry', accessor: 'industry', visibility: 'yellow', defaultVisible: false, priority: 16, pinned: false },
  { id: 'company_2', label: 'Company 2', accessor: 'phantom_metadata.company_2', visibility: 'yellow', defaultVisible: false, priority: 17, pinned: false },
  { id: 'company_url_2', label: 'Company URL 2', accessor: 'phantom_metadata.company_url_2', visibility: 'yellow', defaultVisible: false, priority: 18, pinned: false },
  { id: 'job_title', label: 'Job Title', accessor: 'phantom_metadata.job_title', visibility: 'yellow', defaultVisible: false, priority: 19, pinned: false },
  { id: 'job_date_range', label: 'Job Date Range', accessor: 'phantom_metadata.job_date_range', visibility: 'yellow', defaultVisible: false, priority: 20, pinned: false },
  { id: 'job_title_2', label: 'Job Title 2', accessor: 'phantom_metadata.job_title_2', visibility: 'yellow', defaultVisible: false, priority: 21, pinned: false },
  { id: 'job_date_range_2', label: 'Job Date Range 2', accessor: 'phantom_metadata.job_date_range_2', visibility: 'yellow', defaultVisible: false, priority: 22, pinned: false },
  { id: 'school', label: 'School', accessor: 'phantom_metadata.school', visibility: 'yellow', defaultVisible: false, priority: 23, pinned: false },
  { id: 'school_degree', label: 'School Degree', accessor: 'phantom_metadata.school_degree', visibility: 'yellow', defaultVisible: false, priority: 24, pinned: false },
  { id: 'school_date_range', label: 'School Date Range', accessor: 'phantom_metadata.school_date_range', visibility: 'yellow', defaultVisible: false, priority: 25, pinned: false },
  { id: 'school_2', label: 'School 2', accessor: 'phantom_metadata.school_2', visibility: 'yellow', defaultVisible: false, priority: 26, pinned: false },
  { id: 'school_degree_2', label: 'School Degree 2', accessor: 'phantom_metadata.school_degree_2', visibility: 'yellow', defaultVisible: false, priority: 27, pinned: false },
  { id: 'school_date_range_2', label: 'School Date Range 2', accessor: 'phantom_metadata.school_date_range_2', visibility: 'yellow', defaultVisible: false, priority: 28, pinned: false },
  { id: 'search_account_full_name', label: 'Search Account', accessor: 'phantom_metadata.search_account_full_name', visibility: 'yellow', defaultVisible: false, priority: 29, pinned: false },
  { id: 'search_account_profile_id', label: 'Search Account ID', accessor: 'phantom_metadata.search_account_profile_id', visibility: 'yellow', defaultVisible: false, priority: 30, pinned: false },
  { id: 'additional_info', label: 'Additional Info', accessor: 'phantom_metadata.additional_info', visibility: 'yellow', defaultVisible: false, priority: 31, pinned: false },
];

const STORAGE_KEY = 'leadsTableColumns';

function getFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.order) && typeof data.visibility === 'object') return data;
  } catch (_) {}
  return null;
}

export function getDefaultColumnOrder() {
  return LEADS_TABLE_COLUMN_DEFS.map(c => c.id);
}

export function getDefaultColumnVisibility() {
  const vis = {};
  LEADS_TABLE_COLUMN_DEFS.forEach(c => {
    vis[c.id] = c.defaultVisible;
  });
  return vis;
}

export function loadColumnPreference() {
  const stored = getFromStorage();
  if (stored) {
    return { order: stored.order, visibility: stored.visibility };
  }
  return {
    order: getDefaultColumnOrder(),
    visibility: getDefaultColumnVisibility(),
  };
}

export function saveColumnPreference(order, visibility) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, visibility }));
  } catch (_) {}
}

/** Get cell value from lead by accessor (supports 'phantom_metadata.key') */
export function getLeadCellValue(lead, accessor) {
  if (lead == null) return null;
  if (accessor.startsWith('phantom_metadata.')) {
    const key = accessor.slice('phantom_metadata.'.length);
    const meta = lead.phantom_metadata || lead.phantomMetadata;
    return meta && meta[key] != null ? meta[key] : null;
  }
  const val = lead[accessor];
  return val != null && val !== '' ? val : null;
}
