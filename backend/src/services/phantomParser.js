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

  const leads = rows.map((row, index) => {
    const r = normalizeRow(row);
    
    // Debug: Log available fields for first few rows
    if (index < 3) {
      console.log(`\n🔍 Row ${index + 1} - Available fields:`, Object.keys(r));
      console.log(`   Sample values:`, Object.entries(r).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', '));
    }
    
    // Extract LinkedIn URL – Connections Export & Search Export use various column names
    const linkedinUrl = r.profileUrl
      || r.linkedinProfileUrl
      || r.linkedInUrl
      || r.linkedinUrl
      || r.url
      || r.profile
      || r.linkedin
      || r.vmid
      || r.profileUrl
      || r.linkedInProfileUrl
      || r['Profile URL']
      || r['LinkedIn URL']
      || r['LinkedIn Profile URL']
      || r['profile_url']
      || r['linkedin_url']
      || (typeof r.profile === "string" && r.profile.includes("linkedin.com") ? r.profile : null)
      || null;
    
    // Debug: Log URL extraction result for first few rows
    if (index < 3) {
      if (linkedinUrl) {
        console.log(`   ✅ Found LinkedIn URL: ${linkedinUrl.substring(0, 50)}...`);
      } else {
        console.log(`   ❌ No LinkedIn URL found in row ${index + 1}`);
        // Try to find any field that might contain a LinkedIn URL
        const possibleUrlFields = Object.entries(r).filter(([k, v]) => 
          typeof v === 'string' && (v.includes('linkedin.com') || v.includes('linkedin'))
        );
        if (possibleUrlFields.length > 0) {
          console.log(`   💡 Found potential URL fields:`, possibleUrlFields.map(([k, v]) => `${k}: ${v.substring(0, 50)}`).join(', '));
        }
      }
    }

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
    console.warn("\n⚠️ No valid leads (missing LinkedIn URL)");
    console.warn("Sample row keys:", Object.keys(normalizeRow(rows[0])));
    console.warn("Sample row:", JSON.stringify(rows[0], null, 2));
    
    // Check all rows to see if any have LinkedIn URLs
    const rowsWithUrls = rows.filter((row, idx) => {
      const r = normalizeRow(row);
      const url = r.profileUrl || r.linkedinProfileUrl || r.linkedInUrl || r.linkedinUrl || r.url || r.profile || r.linkedin;
      return url && typeof url === 'string' && url.includes('linkedin.com');
    });
    console.warn(`\n📊 Analysis: ${rowsWithUrls.length} out of ${rows.length} rows have LinkedIn URLs`);
  } else if (leads.length < rows.length) {
    const missingCount = rows.length - leads.length;
    console.warn(`\n⚠️ ${missingCount} rows were filtered out (missing LinkedIn URL)`);
    
    // Show sample of rows that were filtered
    const filteredRows = rows.filter((row, idx) => {
      const r = normalizeRow(row);
      const url = r.profileUrl || r.linkedinProfileUrl || r.linkedInUrl || r.linkedinUrl || r.url || r.profile || r.linkedin;
      return !url || (typeof url === 'string' && !url.includes('linkedin.com'));
    }).slice(0, 3);
    
    if (filteredRows.length > 0) {
      console.warn("Sample filtered row keys:", Object.keys(normalizeRow(filteredRows[0])));
    }
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