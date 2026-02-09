import {
  fetchPhantomStatus,
  fetchPhantomResult
} from "../services/phantombuster.service.js";
import { parsePhantomResults } from "../services/phantomParser.js";
import { saveLead } from "../services/lead.service.js";

export async function checkJobStatus(req, res) {
  try {
    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({ error: "agentId is required" });
    }

    const statusData = await fetchPhantomStatus(agentId);
    console.log("📦 Status Response:", JSON.stringify(statusData, null, 2));

    const container = statusData.container;

    if (!container) {
      return res.status(200).json({
        status: "idle",
        message: "Container not found or never executed"
      });
    }

    // RUNNING
    if (container.status === "running") {
      return res.status(200).json({
        status: "running",
        progress: container.progress || 0,
        message: "Phantom is currently extracting connections..."
      });
    }

    // FAILED
    if (container.status === "error") {
      return res.status(200).json({
        status: "failed",
        message: container.exitMessage || "Phantom execution failed"
      });
    }

    // FINISHED - THIS IS WHERE THE MAGIC HAPPENS
    if (container.status === "finished") {
      if (!container.resultObject) {
        return res.status(200).json({
          status: "completed",
          message: "Phantom finished but no results available",
          leadsCount: 0
        });
      }

      // Fetch the actual result data
      const resultData = await fetchPhantomResult(container.resultObject);
      console.log("📊 Result Data:", JSON.stringify(resultData, null, 2));

      // Parse the results into lead objects
      const leads = parsePhantomResults(resultData);
      console.log(`✅ Parsed ${leads.length} leads`);

      // Save leads to database
      let savedCount = 0;
      for (const lead of leads) {
        const saved = await saveLead(lead);
        if (saved) savedCount++;
      }

      return res.status(200).json({
        status: "completed",
        message: "Connection export completed successfully",
        totalLeads: leads.length,
        newLeads: savedCount,
        duplicates: leads.length - savedCount
      });
    }

    // fallback for other statuses
    return res.status(200).json({
      status: container.status,
      message: `Container is in ${container.status} state`
    });

  } catch (error) {
    console.error("❌ Job polling error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to fetch job status",
      details: error.message
    });
  }
}