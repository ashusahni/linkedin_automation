import { parsePhantomResults } from "./phantomParser.js";
import { saveLead } from "./lead.service.js";
import { exportLeadsToCSV } from "./csvExporter.js";

export async function processPhantomResults(resultData, meta = {}) {
  const leads = parsePhantomResults(resultData);

  let savedCount = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const saved = await saveLead({
        ...lead,
        source: meta.source || "unknown",
        reviewStatus: 'to_be_reviewed'
      });
      if (saved) savedCount++;
    } catch {
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
