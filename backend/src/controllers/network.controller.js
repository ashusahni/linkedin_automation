import { launchPhantom } from "../services/phantombuster.service.js";
import { exportLeadsToCSV } from "../services/csvExporter.js";
import { parsePhantomResults } from "../services/phantomParser.js";
import { saveLead } from "../services/lead.service.js";

/**
 * Extract connections of a specific LinkedIn profile
 */
export async function extractConnectionNetwork(req, res) {
  try {
    const { profileUrl, phantomId, sessionCookie } = req.body;

    if (!profileUrl || !phantomId || !sessionCookie) {
      return res.status(400).json({
        error: "profileUrl, phantomId, and sessionCookie are required",
        example: {
          profileUrl: "https://www.linkedin.com/in/john-doe/",
          phantomId: "your_network_scraper_phantom_id",
          sessionCookie: "your_li_at_cookie"
        }
      });
    }

    console.log("🔍 Launching network extraction for:", profileUrl);

    // Launch the phantom with the target profile URL
    const result = await launchPhantom(phantomId, sessionCookie, {
      profileUrls: [profileUrl]
    });

    console.log("PB Response:", result);

    const containerId = result.containerId;

    if (!containerId) {
      return res.status(500).json({
        error: "Phantom launched but no containerId returned"
      });
    }

    return res.status(200).json({
      message: "Network extraction started",
      containerId: containerId,
      targetProfile: profileUrl,
      note: "Use /api/network/import-network-results to import once completed"
    });

  } catch (error) {
    console.error("❌ Network extraction error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to start network extraction",
      details: error.message
    });
  }
}

/**
 * Import network extraction results
 */
export async function importNetworkResults(req, res) {
  try {
    const { resultUrl, sourceProfile } = req.body;
    
    if (!resultUrl) {
      return res.status(400).json({ 
        error: "resultUrl is required",
        example: "https://phantombuster.s3.amazonaws.com/.../result.json"
      });
    }

    console.log("📥 Fetching network results from PhantomBuster...");
    console.log("🔗 URL:", resultUrl);
    if (sourceProfile) {
      console.log("👤 Source Profile:", sourceProfile);
    }

    // Fetch results from PhantomBuster S3
    const response = await fetch(resultUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const resultData = await response.json();
    console.log("✅ Results fetched successfully");

    // Parse the leads
    const leads = parsePhantomResults(resultData);

    if (leads.length === 0) {
      return res.status(200).json({
        message: "No connections found in the result",
        totalLeads: 0
      });
    }

    // Save to database
    console.log("💾 Saving to database...");
    let savedCount = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const saved = await saveLead(lead);
        if (saved) savedCount++;
      } catch (err) {
        console.error("❌ Error saving lead:", err.message);
        errors++;
      }
    }

    // Export to CSV with source profile in filename
    console.log("📄 Exporting to CSV...");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sourceTag = sourceProfile ? `_from_${sourceProfile.split('/in/')[1]?.replace('/', '')}` : '';
    
    const { filepath, filename } = exportLeadsToCSV(leads);

    console.log("\n🎉 Network import completed!");
    console.log(`   Source Profile: ${sourceProfile || 'Unknown'}`);
    console.log(`   Total connections: ${leads.length}`);
    console.log(`   Saved to DB: ${savedCount}`);
    console.log(`   Duplicates: ${leads.length - savedCount - errors}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   CSV file: ${filename}\n`);

    return res.status(200).json({
      success: true,
      message: "Network connections imported successfully",
      sourceProfile: sourceProfile || "Unknown",
      totalConnections: leads.length,
      savedToDatabase: savedCount,
      duplicates: leads.length - savedCount - errors,
      errors: errors,
      csvFile: filename,
      csvPath: filepath
    });

  } catch (error) {
    console.error("❌ Import error:", error.message);
    return res.status(500).json({
      error: "Failed to import network results",
      details: error.message
    });
  }
}