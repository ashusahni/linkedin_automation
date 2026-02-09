// backend/src/routes/phantom.routes.js

import express from "express";
import {
  exportConnectionsComplete,
  searchLeadsComplete,
  importByContainerId,
  enrichProfilesComplete,
  sendMessageComplete,
  crmSearchRun,
  startConnectionExport,
  importPhantomResults
} from "../controllers/phantom.controller.js";
import phantomService from "../services/phantombuster.service.js";
import pool from "../db.js";

const router = express.Router();

// Store active import jobs in memory (in production, use Redis)
const activeJobs = new Map();

import { get, remove } from "../services/messageCsvStore.js";

/**
 * GET /api/phantom/message-csv/:token
 * Returns CSV with LinkedInUrl,Message for PhantomBuster to fetch.
 * Used to pass AI-generated messages instead of dashboard "First Name" config.
 */
router.get("/message-csv/:token", (req, res) => {
  const { token } = req.params;
  const data = get(token);
  if (!data) {
    return res.status(404).set("Content-Type", "text/plain").send("CSV expired or not found");
  }
  // Don't remove token immediately - PhantomBuster may need to fetch it multiple times
  // Token will expire automatically after TTL (30 minutes)
  // remove(token); // Removed - let it expire naturally
  const csv = `LinkedInUrl,Message\n"${(data.linkedinUrl || "").replace(/"/g, '""')}","${(data.message || "").replace(/"/g, '""')}"`;
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" }).send(csv);
});

// ============================================
// SEARCH EXPORT IMPORT WORKFLOW (/search-import, /status/:jobId)
// ============================================

/**
 * POST /api/phantom/search-import
 * Launch Search Export Phantom and import leads
 */
router.post("/search-import", async (req, res) => {
  try {
    const { searchUrl, query } = req.body;
    const phantomId = process.env.SEARCH_EXPORT_PHANTOM_ID;

    if (!phantomId) {
      return res.status(400).json({
        success: false,
        error: 'Search Export Phantom ID not configured. Please set SEARCH_EXPORT_PHANTOM_ID in .env'
      });
    }

    let finalSearchUrl = searchUrl;
    if (!finalSearchUrl && query) {
      finalSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
    }
    if (!finalSearchUrl) {
      finalSearchUrl = "https://www.linkedin.com/search/results/people/?keywords=CEO";
    }

    const additionalArgs = { search: finalSearchUrl };
    const result = await phantomService.launchPhantom(phantomId, additionalArgs, { minimalArgsForSearch: true });

    activeJobs.set(result.containerId, {
      status: 'running',
      startTime: new Date(),
      phantomId: phantomId,
      type: 'search-export'
    });

    res.json({
      success: true,
      jobId: result.containerId,
      message: 'Search Export started. This may take 2-5 minutes.'
    });
  } catch (error) {
    console.error('❌ Search import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phantom/status/:jobId
 * Check status of phantom execution and import progress
 */
router.get("/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobInfo = activeJobs.get(jobId);
    if (!jobInfo) {
      return res.json({
        status: 'unknown',
        message: 'Job not found or expired'
      });
    }

    const phantomStatus = await phantomService.fetchContainerStatus(jobId);

    let progress = 0;
    let message = '';
    let status = 'running';

    if (phantomStatus.status === 'running') {
      const elapsed = Date.now() - jobInfo.startTime.getTime();
      progress = Math.min(Math.floor((elapsed / 180000) * 70), 70);
      message = 'Extracting LinkedIn search results...';
      status = 'running';
    } else if (phantomStatus.status === 'finished' || phantomStatus.exitCode === 0) {
      if (!jobInfo.processed) {
        jobInfo.processed = true;
        jobInfo.processing = true;
        progress = 80;
        message = 'Saving leads to database...';
        status = 'running';

        (async () => {
          try {
            const containerForFetch = { ...phantomStatus, agentId: jobInfo.phantomId };
            const resultData = await phantomService.fetchResultData(containerForFetch);
            if (resultData && resultData.length > 0) {
              let savedCount = 0;
              let duplicateCount = 0;
              for (const lead of resultData) {
                try {
                  const linkedinUrl = lead.profileUrl || lead['Profile Url'] || lead.linkedinUrl || lead.url;
                  const fullName = lead.fullName || lead['Full Name'] || lead.name;
                  const firstName = lead.firstName || lead['First Name'] || fullName?.split(' ')[0];
                  const lastName = lead.lastName || lead['Last Name'] || fullName?.split(' ').slice(1).join(' ');
                  const profileImageUrl = lead.profileImageUrl || lead['Profile Image Url'] || lead.imgUrl;
                  const queryVal = lead.query || lead.Query;
                  const connectionDegree = lead.connectionDegree || lead['Connection Degree'] || lead.connection_degree || null;

                  if (!linkedinUrl) continue;

                  const result = await pool.query(
                    `INSERT INTO leads (
                      linkedin_url, first_name, last_name, full_name,
                      title, company, profile_image_url, status, source, connection_degree
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (linkedin_url) DO UPDATE SET
                      first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
                      last_name = COALESCE(EXCLUDED.last_name, leads.last_name),
                      full_name = COALESCE(EXCLUDED.full_name, leads.full_name),
                      title = COALESCE(EXCLUDED.title, leads.title),
                      company = COALESCE(EXCLUDED.company, leads.company),
                      profile_image_url = COALESCE(EXCLUDED.profile_image_url, leads.profile_image_url),
                      connection_degree = COALESCE(EXCLUDED.connection_degree, leads.connection_degree),
                      updated_at = NOW()
                    RETURNING (xmax = 0) AS inserted`,
                    [
                      linkedinUrl,
                      firstName,
                      lastName,
                      fullName,
                      lead.title || lead.headline,
                      lead.company || lead.companyName,
                      profileImageUrl,
                      'new',
                      queryVal || 'search_export',
                      connectionDegree
                    ]
                  );
                  if (result.rows[0]?.inserted) savedCount++;
                  else duplicateCount++;
                } catch (err) {
                  // skip row
                }
              }
              jobInfo.savedCount = savedCount;
              jobInfo.duplicateCount = duplicateCount;
              jobInfo.totalProcessed = savedCount + duplicateCount;
            }
            jobInfo.processing = false;
            jobInfo.completed = true;
          } catch (error) {
            jobInfo.error = error.message;
            jobInfo.processing = false;
          }
        })();
      }

      if (jobInfo.completed) {
        progress = 100;
        status = 'completed';
        message = `Success! Imported ${jobInfo.savedCount || 0} leads`;
        activeJobs.delete(jobId);
      } else if (jobInfo.processing) {
        progress = 85;
        message = 'Saving leads to database...';
        status = 'running';
      } else if (jobInfo.error) {
        progress = 0;
        status = 'error';
        message = `Error: ${jobInfo.error}`;
        activeJobs.delete(jobId);
      }
    } else if (phantomStatus.status === 'error') {
      progress = 0;
      status = 'error';
      message = 'Import failed. Check PhantomBuster configuration.';
      activeJobs.delete(jobId);
    }

    res.json({
      status,
      progress,
      message,
      jobInfo: {
        type: jobInfo.type,
        startTime: jobInfo.startTime,
        savedCount: jobInfo.savedCount,
        totalProcessed: jobInfo.totalProcessed
      }
    });
  } catch (error) {
    console.error('❌ Get status error:', error);
    res.json({
      status: 'error',
      progress: 0,
      message: error.message
    });
  }
});

// ============================================
// CRM SEARCH RUN (criteria from CRM or body → LinkedIn URL → PhantomBuster → DB → CRM)
// ============================================
router.post("/crm-search-run", crmSearchRun);

// ============================================
// ONE-CLICK COMPLETE WORKFLOWS
// ============================================
router.post("/export-connections-complete", exportConnectionsComplete);
router.post("/search-leads-complete", searchLeadsComplete);
router.post("/import-by-container", importByContainerId);
router.post("/enrich-profiles-complete", enrichProfilesComplete);
router.post("/send-message-complete", sendMessageComplete);

// ============================================
// LEGACY: Two-step process (kept for backward compatibility)
// ============================================
router.post("/connection-export", startConnectionExport);
router.post("/import-results", importPhantomResults);

export default router;