import pool from "../db.js";

// ============================================
// APPROVAL QUEUE ENDPOINTS (Human-in-the-Loop)
// ============================================

/**
 * GET /api/sow/approvals
 * Fetch all pending approvals for admin review
 */
export async function getApprovals(req, res) {
    try {
        const { status = 'pending', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT 
        aq.id,
        aq.campaign_id,
        aq.lead_id,
        aq.step_type,
        aq.generated_content,
        aq.status,
        aq.admin_feedback,
        aq.created_at,
        l.full_name as lead_name,
        l.title as lead_title,
        l.company as lead_company,
        l.linkedin_url,
        c.name as campaign_name
      FROM approval_queue aq
      JOIN leads l ON aq.lead_id = l.id
      JOIN campaigns c ON aq.campaign_id = c.id
      WHERE aq.status = $1
      ORDER BY aq.created_at DESC
      LIMIT $2 OFFSET $3`,
            [status, limit, offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM approval_queue WHERE status = $1',
            [status]
        );

        return res.json({
            approvals: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching approvals:', error);
        return res.status(500).json({
            error: 'Failed to fetch approvals',
            details: error.message
        });
    }
}

/**
 * POST /api/sow/approvals/:id/review
 * Approve, reject, or edit a pending approval
 */
export async function reviewApproval(req, res) {
    try {
        const { id } = req.params;
        const { action, edited_content, admin_feedback } = req.body;

        // Validate action
        if (!['approve', 'reject', 'edit'].includes(action)) {
            return res.status(400).json({
                error: 'Invalid action. Must be approve, reject, or edit'
            });
        }

        // Fetch the approval record
        const approvalResult = await pool.query(
            'SELECT * FROM approval_queue WHERE id = $1',
            [id]
        );

        if (approvalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Approval not found' });
        }

        const approval = approvalResult.rows[0];

        // Update based on action
        let newStatus;
        let finalContent = approval.generated_content;

        switch (action) {
            case 'approve':
                newStatus = 'approved';
                break;
            case 'reject':
                newStatus = 'rejected';
                break;
            case 'edit':
                if (!edited_content) {
                    return res.status(400).json({
                        error: 'edited_content is required for edit action'
                    });
                }
                newStatus = 'approved';
                finalContent = edited_content;
                break;
        }

        // Update approval record
        const updateResult = await pool.query(
            `UPDATE approval_queue 
       SET status = $1, 
           generated_content = $2,
           admin_feedback = $3
       WHERE id = $4
       RETURNING *`,
            [newStatus, finalContent, admin_feedback || null, id]
        );

        // If approved, trigger the automation
        if (newStatus === 'approved') {
            // Insert into automation queue or update campaign_leads
            // This will be picked up by the scheduler immediately
            await pool.query(
                `UPDATE campaign_leads
         SET status = 'pending',
             next_action_due = NOW(),
             last_action_at = NOW()
         WHERE campaign_id = $1 AND lead_id = $2`,
                [approval.campaign_id, approval.lead_id]
            );

            // Log the approval
            await pool.query(
                `INSERT INTO automation_logs (campaign_id, lead_id, action, status, details)
         VALUES ($1, $2, $3, $4, $5)`,
                [
                    approval.campaign_id,
                    approval.lead_id,
                    'approval_reviewed',
                    'approved',
                    JSON.stringify({
                        approval_id: id,
                        step_type: approval.step_type,
                        edited: action === 'edit'
                    })
                ]
            );
        }

        return res.json({
            success: true,
            approval: updateResult.rows[0],
            message: `Approval ${newStatus} successfully`
        });
    } catch (error) {
        console.error('Error reviewing approval:', error);
        return res.status(500).json({
            error: 'Failed to review approval',
            details: error.message
        });
    }
}

// ============================================
// CONTENT ENGINE ENDPOINTS
// ============================================

/**
 * GET /api/sow/content/posts
 * Fetch all content posts (draft, scheduled, published)
 */
export async function getContentPosts(req, res) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT 
        id,
        source_url,
        original_title,
        ai_generated_content,
        status,
        scheduled_for,
        published_at,
        created_at
      FROM content_posts
    `;

        const params = [];

        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const countQuery = status
            ? 'SELECT COUNT(*) FROM content_posts WHERE status = $1'
            : 'SELECT COUNT(*) FROM content_posts';

        const countParams = status ? [status] : [];
        const countResult = await pool.query(countQuery, countParams);

        return res.json({
            posts: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching content posts:', error);
        return res.status(500).json({
            error: 'Failed to fetch content posts',
            details: error.message
        });
    }
}

/**
 * POST /api/sow/content/fetch
 * Trigger AI content generation from feeds
 */
export async function fetchContent(req, res) {
    try {
        // This is a placeholder - will be implemented with AI service
        // For now, return a mock response

        // In the future, this will:
        // 1. Fetch active feeds from content_feeds table
        // 2. Scan RSS feeds for new articles
        // 3. Filter by keywords
        // 4. Generate AI content for each article
        // 5. Insert into content_posts table

        return res.json({
            success: true,
            message: 'Content fetch triggered. AI service integration pending.',
            generated_count: 0,
            note: 'This endpoint will be fully functional after AI service integration (Priority 2)'
        });
    } catch (error) {
        console.error('Error fetching content:', error);
        return res.status(500).json({
            error: 'Failed to fetch content',
            details: error.message
        });
    }
}

/**
 * POST /api/sow/content/posts/:id/schedule
 * Schedule a post for future publishing
 */
export async function schedulePost(req, res) {
    try {
        const { id } = req.params;
        const { scheduled_for } = req.body;

        if (!scheduled_for) {
            return res.status(400).json({
                error: 'scheduled_for timestamp is required'
            });
        }

        const result = await pool.query(
            `UPDATE content_posts
       SET status = 'scheduled',
           scheduled_for = $1
       WHERE id = $2
       RETURNING *`,
            [scheduled_for, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        return res.json({
            success: true,
            post: result.rows[0],
            message: 'Post scheduled successfully'
        });
    } catch (error) {
        console.error('Error scheduling post:', error);
        return res.status(500).json({
            error: 'Failed to schedule post',
            details: error.message
        });
    }
}

/**
 * POST /api/sow/content/posts/:id/publish
 * Mark a post as published
 */
export async function publishPost(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE content_posts
       SET status = 'published',
           published_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Log the publish action
        await pool.query(
            `INSERT INTO automation_logs (campaign_id, lead_id, action, status, details)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                null, // No campaign for content posts
                null, // No lead for content posts
                'content_published',
                'success',
                JSON.stringify({ post_id: id, title: result.rows[0].original_title })
            ]
        );

        return res.json({
            success: true,
            post: result.rows[0],
            message: 'Post published successfully'
        });
    } catch (error) {
        console.error('Error publishing post:', error);
        return res.status(500).json({
            error: 'Failed to publish post',
            details: error.message
        });
    }
}

/**
 * GET /api/sow/content/feeds
 * Get all content feeds
 */
export async function getContentFeeds(req, res) {
    try {
        const result = await pool.query(
            `SELECT * FROM content_feeds ORDER BY created_at DESC`
        );

        return res.json({
            feeds: result.rows
        });
    } catch (error) {
        console.error('Error fetching content feeds:', error);
        return res.status(500).json({
            error: 'Failed to fetch content feeds',
            details: error.message
        });
    }
}

/**
 * POST /api/sow/content/feeds
 * Add a new content feed
 */
export async function addContentFeed(req, res) {
    try {
        const { name, url, keywords, type } = req.body;

        if (!name || !url || !type) {
            return res.status(400).json({
                error: 'name, url, and type are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO content_feeds (name, url, keywords, type, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name, url, keywords || [], type, true]
        );

        return res.json({
            success: true,
            feed: result.rows[0],
            message: 'Content feed added successfully'
        });
    } catch (error) {
        console.error('Error adding content feed:', error);
        return res.status(500).json({
            error: 'Failed to add content feed',
            details: error.message
        });
    }
}
