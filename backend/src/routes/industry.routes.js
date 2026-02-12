import express from 'express';
import industryHierarchyService from '../services/industryHierarchy.service.js';

const router = express.Router();

/**
 * GET /api/industry/hierarchy
 * Returns the full industry hierarchy structure
 */
router.get('/hierarchy', async (req, res) => {
    try {
        const hierarchy = industryHierarchyService.getFullHierarchy();
        res.json({
            success: true,
            data: hierarchy
        });
    } catch (error) {
        console.error('Error fetching industry hierarchy:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/industry/subtags?industry=X
 * Returns subtags (sub-industries, job roles, metadata) for a specific industry
 */
router.get('/subtags', async (req, res) => {
    try {
        const { industry } = req.query;

        if (!industry) {
            return res.status(400).json({
                success: false,
                error: 'Industry parameter is required'
            });
        }

        const subtags = industryHierarchyService.getSubtags(industry);

        if (!subtags) {
            return res.status(404).json({
                success: false,
                error: `Industry '${industry}' not found`
            });
        }

        res.json({
            success: true,
            data: subtags
        });
    } catch (error) {
        console.error('Error fetching industry subtags:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/industry/top-level
 * Returns all top-level industries
 */
router.get('/top-level', async (req, res) => {
    try {
        const industries = industryHierarchyService.getTopLevelIndustries();
        res.json({
            success: true,
            data: industries
        });
    } catch (error) {
        console.error('Error fetching top-level industries:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/industry/prioritize
 * Sort industries by priority based on profile
 * Body: { industryCounts: {}, profile: {}, preferenceMode: boolean }
 */
router.post('/prioritize', async (req, res) => {
    try {
        const { industryCounts, profile, preferenceMode = false } = req.body;

        if (!industryCounts) {
            return res.status(400).json({
                success: false,
                error: 'industryCounts is required'
            });
        }

        console.log('🎯 Prioritizing industries:', {
            preferenceMode,
            hasProfile: !!profile,
            profile: profile ? {
                industry: profile.industry,
                title: profile.title,
                company: profile.company,
                metadataCount: profile.metadata?.length || 0
            } : null,
            industryCount: Object.keys(industryCounts).length
        });

        const sorted = industryHierarchyService.sortIndustriesByPriority(
            industryCounts,
            profile,
            preferenceMode
        );

        console.log('✅ Top 5 sorted industries:', sorted.slice(0, 5).map(i => ({
            name: i.name,
            count: i.count,
            score: i.score.toFixed(2)
        })));

        res.json({
            success: true,
            data: sorted
        });
    } catch (error) {
        console.error('Error prioritizing industries:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
