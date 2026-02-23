import express from "express";
import { checkJobStatus } from "../controllers/job.controller.js";

const router = express.Router();

/**
 * GET /api/jobs/:agentId/status
 */
router.get("/:agentId/status", checkJobStatus);

export default router;
