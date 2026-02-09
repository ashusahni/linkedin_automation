// Scraper controller - handles global scraping progress and stats
import pool from '../db.js';
import contactScraperService from '../services/contact-scraper.service.js';

/**
 * GET /api/scraper/global-progress
 * Returns workspace-level scraping progress
 */
export async function getGlobalProgress(req, res) {
    try {
        const progress = await contactScraperService.getGlobalProgress();

        res.json({
            success: true,
            progress: {
                totalProfiles: parseInt(progress.total_profiles) || 0,
                processedProfiles: parseInt(progress.processed_profiles) || 0,
                progressPercentage: parseInt(progress.progress_percentage) || 0,
                activeJobsCount: parseInt(progress.active_jobs_count) || 0,
                oldestJobStartedAt: progress.oldest_job_started_at,
                isActive: parseInt(progress.active_jobs_count) > 0
            }
        });
    } catch (error) {
        console.error('Error fetching global progress:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * GET /api/scraper/stats
 * Returns overall scraping statistics
 */
export async function getScrapingStats(req, res) {
    try {
        const stats = await contactScraperService.getScrapingStats();

        res.json({
            success: true,
            stats: {
                totalProfilesScraped: parseInt(stats.total_profiles_scraped) || 0,
                profilesWithEmail: parseInt(stats.profiles_with_email) || 0,
                profilesWithPhone: parseInt(stats.profiles_with_phone) || 0,
                profilesWithBoth: parseInt(stats.profiles_with_both) || 0,
                profilesNA: parseInt(stats.profiles_na) || 0,
                profilesFailed: parseInt(stats.profiles_failed) || 0,
                successRate: parseFloat(stats.success_rate) || 0,
                lastScrapeAt: stats.last_scrape_at
            }
        });
    } catch (error) {
        console.error('Error fetching scraping stats:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * GET /api/scraper/jobs
 * Returns recent scraping jobs
 */
export async function getRecentJobs(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const result = await pool.query(`
            SELECT 
                job_id,
                job_type,
                total_profiles,
                processed_profiles,
                found_contacts,
                skipped_profiles,
                failed_profiles,
                status,
                started_at,
                completed_at,
                error_message
            FROM scraping_jobs
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);

        res.json({
            success: true,
            jobs: result.rows
        });
    } catch (error) {
        console.error('Error fetching recent jobs:', error);
        res.status(500).json({ error: error.message });
    }
}
