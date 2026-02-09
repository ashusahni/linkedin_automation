import express from "express";
import { extractConnectionNetwork, importNetworkResults } from "../controllers/network.controller.js";

const router = express.Router();

// Launch network extraction for a specific profile
router.post("/extract-network", extractConnectionNetwork);

// Import the results after phantom completes
router.post("/import-network-results", importNetworkResults);

export default router;