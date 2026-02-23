// backend/src/services/csvExporter.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function exportLeadsToCSV(leads, filenamePrefix = "linkedin_leads") {
  try {
    if (!leads || leads.length === 0) {
      console.warn("⚠️ No leads to export");
      return { filepath: null, filename: null };
    }

    // Create CSV header
    const headers = [
      "LinkedIn URL",
      "First Name",
      "Last Name",
      "Full Name",
      "Title",
      "Company",
      "Location",
      "Profile Image",
      "Connection Since"
    ];

    // Create CSV rows
    const rows = leads.map(lead => [
      lead.linkedinUrl || "",
      lead.firstName || "",
      lead.lastName || "",
      lead.fullName || "",
      lead.title || "",
      lead.company || "",
      lead.location || "",
      lead.profileImage || "",
      lead.connectionSince || ""
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }).join(","))
    ].join("\n");

    // Save to exports folder
    const exportsDir = path.resolve(__dirname, "../../exports");

    // Create exports folder if it doesn't exist
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split('.')[0];
    const filename = `${filenamePrefix}_${timestamp}.csv`;
    const filepath = path.join(exportsDir, filename);

    fs.writeFileSync(filepath, csvContent, "utf8");

    console.log(`✅ CSV exported: ${filename}`);
    return { filepath, filename };

  } catch (error) {
    console.error("❌ CSV export error:", error.message);
    throw error;
  }
}