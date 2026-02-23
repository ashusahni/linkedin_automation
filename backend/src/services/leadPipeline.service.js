import { parsePhantomResults } from "./phantomParser.js";
import { saveLead } from "./lead.service.js";
import { exportLeadsToCSV } from "./csvExporter.js";

export async function processPhantomResults(resultData, meta = {}) {
  const leads = parsePhantomResults(resultData);

  let savedCount = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      // Auto-Approval Logic:
      // 1. 1st Degree Connections -> Automatically Approved
      // 2. Core Industry (Chemical) -> Automatically Approved

      let reviewStatus = 'to_be_reviewed';
      let autoApprovedReason = null;

      const degree = (lead.connectionDegree || '').toLowerCase();
      const industry = (lead.industry || '').toLowerCase();

      // Check 1st Degree
      if (degree === '1st' || degree.includes('1st')) {
        reviewStatus = 'approved';
        autoApprovedReason = '1st Degree Connection';
      }
      // Check Industry (Chemical)
      else if (industry.includes('chemical')) {
        reviewStatus = 'approved';
        autoApprovedReason = 'Target Industry Match (Chemical)';
      }

      // Also check company name or title for "chemical" as a fallback for industry targeting
      else if ((lead.company && lead.company.toLowerCase().includes('chemical')) ||
        (lead.title && lead.title.toLowerCase().includes('chemical'))) {
        reviewStatus = 'approved';
        autoApprovedReason = 'Target Keyword Match (Chemical)';
      }

      if (autoApprovedReason) {
        console.log(`✅ Auto-approving lead: ${lead.fullName} (${autoApprovedReason})`);
      }

      const saved = await saveLead({
        ...lead,
        source: meta.source || "unknown",
        reviewStatus: reviewStatus,
        // If auto-approved, we might want to set approved_at/by, but saveLead handles the basics.
        // If we want to track *why* it was auto-approved, we'd need a metadata field, but standard schema doesn't have it yet.
        // The review_status update is sufficient for the UI flow.
      });

      if (saved) savedCount++;
    } catch (err) {
      console.error(`❌ Error saving lead ${lead.linkedinUrl}:`, err.message);
      errors++;
    }
  }

  const { filepath, filename } = exportLeadsToCSV(leads);

  return {
    total: leads.length,
    saved: savedCount,
    duplicates: leads.length - savedCount - errors,
    errors,
    csvFile: filename,
    csvPath: filepath
  };
}
