// backend/src/services/phantomParser.js

// Normalize object keys to camelCase (e.g. "Profile URL" -> profileUrl, "profile_url" -> profileUrl)
function toCamelCase(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/_(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = toCamelCase(k);
    out[key] = v;
  }
  return out;
}

export function parsePhantomResults(resultData) {
  console.log("🔍 Parsing PhantomBuster results...");

  // Handle different result formats
  let rows = [];

  if (Array.isArray(resultData)) {
    rows = resultData;
  } else if (resultData && Array.isArray(resultData.data)) {
    rows = resultData.data;
  } else if (resultData && Array.isArray(resultData.result)) {
    rows = resultData.result;
  } else if (resultData && Array.isArray(resultData.leads)) {
    rows = resultData.leads;
  } else if (resultData && Array.isArray(resultData.profiles)) {
    rows = resultData.profiles;
  } else if (resultData && typeof resultData === 'object') {
    rows = [resultData];
  } else {
    console.warn("⚠️ Unexpected result format:", typeof resultData);
    return [];
  }

  console.log(`📊 Found ${rows.length} raw entries`);

  const leads = rows.map(row => {
    const r = normalizeRow(row);
    // Extract LinkedIn URL – Connections Export & Search Export use various column names
    const linkedinUrl = r.profileUrl
      || r.linkedinProfileUrl
      || r.linkedInUrl
      || r.linkedinUrl
      || r.url
      || r.profile
      || r.linkedin
      || r.vmid
      || (typeof r.profile === "string" && r.profile.includes("linkedin.com") ? r.profile : null)
      || null;

    // Build full name if not present
    let fullName = r.fullName || r.name || r.scraperFullName || null;
    if (!fullName && (r.firstName || r.lastName)) {
      fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    }

    const lead = {
      linkedinUrl,
      firstName: r.firstName || null,
      lastName: r.lastName || null,
      fullName,
      title: r.title || r.headline || r.linkedinHeadline || r.occupation || null,
      company: r.company || r.companyName || r.currentCompany || r.organization || r.jobCompany || null,
      location: r.location || r.city || null,
      profileImage: r.profileImageUrl || r.imgUrl || r.profilePicture || null,
      // Handle all possible connection degree field variations
      connectionDegree: r.connectionDegree || r.connection_degree || r.connectiondegree ||
        r.connection || r.degree || r.connectionLevel || r.connection_level || null,
      connectionSince: r.connectionSince || r.connectedDate || null
    };

    // Fallback: If company is missing, try to extract it from the title (e.g. "Role at Company" or "Role @ Company")
    if (!lead.company && lead.title) {
      // Improved regex:
      // 1. Matches " at " or " @ " (with or without surrounding spaces for @)
      // 2. Captures everything until a separator (| • -) or end of string
      const atMatch = lead.title.match(/(?:\s+at\s+|@\s*)(.+?)(?:\s+[|•-]\s+|$)/i);
      if (atMatch && atMatch[1]) {
        lead.company = atMatch[1].trim();
      }
    }

    return lead;
  }).filter(lead => lead.linkedinUrl);

  console.log(`✅ Parsed ${leads.length} valid leads (from ${rows.length} raw)`);

  if (leads.length === 0 && rows.length > 0) {
    console.warn("⚠️ No valid leads (missing LinkedIn URL). Sample row keys:", Object.keys(normalizeRow(rows[0])));
    console.warn("Sample row:", JSON.stringify(rows[0], null, 2));
  }

  // Debug: Log connection degree and company extraction
  if (leads.length > 0) {
    const sampleLead = leads[0];
    const sampleRaw = normalizeRow(rows[0]);
    console.log("📊 Sample lead title:", sampleLead.title);
    console.log("📊 Sample lead company:", sampleLead.company);
    console.log("📊 Sample raw row keys:", Object.keys(sampleRaw));

    // Log any field that might contain connection info
    const connectionFields = Object.keys(sampleRaw).filter(k =>
      k.toLowerCase().includes('connection') || k.toLowerCase().includes('degree')
    );
    if (connectionFields.length > 0) {
      console.log("📊 Connection-related fields found:", connectionFields.map(k => `${k}: ${sampleRaw[k]}`));
    } else {
      console.log("⚠️ No connection-related fields found in PhantomBuster data");
    }

    // Log any field that might contain company info
    const companyFields = Object.keys(sampleRaw).filter(k =>
      k.toLowerCase().includes('company') || k.toLowerCase().includes('job') || k.toLowerCase().includes('organization')
    );
    if (companyFields.length > 0) {
      console.log("📊 Company-related fields found:", companyFields.map(k => `${k}: ${sampleRaw[k]}`));
    }
  }

  return leads;
}