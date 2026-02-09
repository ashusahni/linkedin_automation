import express from "express";
import {
    getLeads,
    getLeadById,
    searchLeads,
    updateLead,
    deleteLead,
    getStats,
    getImports,
    importLeads,
    importLeadsFromCSV,
    deleteCSVLeads,
    deleteAllLeads,
    enrichLead,
    enrichLeadsBatch,
    getLeadEnrichment,
    getEnrichedLeads,
    bulkEnrichAndPersonalize,
    generatePersonalizedMessage,
    // PHASE 4: Review & Approval
    bulkApproveLeads,
    bulkRejectLeads,
    moveToReview,
    getReviewStats,
    createLead
} from "../controllers/lead.controller.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// PHASE 4: Lead Review & Approval Routes (Must be before /:id)
router.get("/review-stats", getReviewStats);
router.post("/bulk-approve", bulkApproveLeads);
router.post("/bulk-reject", bulkRejectLeads);
router.post("/move-to-review", moveToReview);

router.get("/", getLeads);
router.post("/", createLead);
router.get("/search", searchLeads);
router.get("/stats", getStats);
router.get("/imports", getImports);
router.get("/enriched", getEnrichedLeads);
router.get("/:id", getLeadById);
router.get("/:id/enrichment", getLeadEnrichment);
router.put("/:id", updateLead);
// Destructive routes - order matters (specific before param routes)
router.delete("/csv-imports/all", deleteCSVLeads);
router.delete("/all", deleteAllLeads);
router.delete("/:id", deleteLead);
router.post("/import", importLeads);
router.post("/import-csv", upload.single('csvFile'), importLeadsFromCSV);
router.post("/enrich-batch", enrichLeadsBatch);
router.post("/bulk-enrich-personalize", bulkEnrichAndPersonalize);
router.post("/:id/enrich", enrichLead);
router.post("/:id/generate-message", generatePersonalizedMessage);

// End of routes

export default router;
