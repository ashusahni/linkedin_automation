// Scraper routes - global progress and stats endpoints
import express from 'express';
import * as scraperController from '../controllers/scraper.controller.js';

const router = express.Router();

// GET /api/scraper/global-progress - Get workspace-level scraping progress
router.get('/global-progress', scraperController.getGlobalProgress);

// GET /api/scraper/stats - Get overall scraping statistics
router.get('/stats', scraperController.getScrapingStats);

// GET /api/scraper/jobs - Get recent scraping jobs
router.get('/jobs', scraperController.getRecentJobs);

export default router;
