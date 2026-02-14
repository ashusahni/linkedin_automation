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

/**
 * POST /api/scraper/scrape-contacts
 * Manually trigger contact scraping for selected leads or all approved leads missing info
 */
export async function startScraping(req, res) {
    try {
        const { leadIds } = req.body;
        
        let targetLeadIds = leadIds;
        
        if (!targetLeadIds || !Array.isArray(targetLeadIds) || targetLeadIds.length === 0) {
            const result = await pool.query(`
                SELECT id FROM leads 
                WHERE (review_status = 'approved' OR review_status IS NULL)
                  AND (email IS NULL OR email = '' OR phone IS NULL OR phone = '')
                  AND (linkedin_url IS NOT NULL AND linkedin_url != '')
            `);
            targetLeadIds = result.rows.map(r => r.id);
        }
        
        if (targetLeadIds.length === 0) {
            return res.json({
                success: true,
                message: 'No leads found that need contact scraping',
                count: 0
            });
        }
        
        const sessionCookie = process.env.LINKEDIN_SESSION_COOKIE;
        if (!sessionCookie) {
            return res.status(400).json({
                success: false,
                error: 'LinkedIn session cookie (LINKEDIN_SESSION_COOKIE) is not configured'
            });
        }
        
        // Force re-initialization if needed or just use existing
        try {
            await contactScraperService.initialize(sessionCookie);
        } catch (initError) {
            // LinkedIn is blocking Puppeteer automation - provide helpful error message
            if (initError.message.includes('ERR_TOO_MANY_REDIRECTS') || initError.message.includes('navigation failed')) {
                console.error('❌ LinkedIn is blocking automated browser access');
                return res.status(500).json({ 
                    error: 'LinkedIn bot detection is blocking contact scraping',
                    details: initError.message,
                    suggestions: [
                        'LinkedIn has detected automation and is blocking access',
                        'Try using PhantomBuster Profile Scraper instead (configure PROFILE_SCRAPER_PHANTOM_ID)',
                        'Or get a fresh LinkedIn cookie from a regular browser session',
                        'Consider using non-headless mode: Set SCRAPER_HEADLESS=false in .env'
                    ]
                });
            }
            throw initError; // Re-throw other errors
        }
        
        const result = await contactScraperService.scrapeApprovedLeads(targetLeadIds);
        
        res.json({
            success: true,
            message: `Contact scraping started for ${targetLeadIds.length} leads`,
            jobId: result.jobId,
            count: targetLeadIds.length
        });
    } catch (error) {
        console.error('Error starting scrape:', error);
        res.status(500).json({ error: error.message });
    }
}

/**
 * POST /api/scraper/stop-scraping
 * Stop all active scraping jobs
 */
export async function stopScraping(req, res) {
    try {
        const activeJobs = contactScraperService.activeJobs;
        let count = 0;
        
        for (const [jobId, job] of activeJobs.entries()) {
            if (job.status === 'running') {
                contactScraperService.cancelJob(jobId);
                count++;
            }
        }
        
        // Also update any 'running' jobs in DB to 'cancelled' just in case
        await pool.query(`
            UPDATE scraping_jobs 
            SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP 
            WHERE status = 'running'
        `);
        
        res.json({
            success: true,
            message: `Stopped ${count} active scraping jobs`,
            count
        });
    } catch (error) {
        console.error('Error stopping scrape:', error);
        res.status(500).json({ error: error.message });
    }
}
