import pool from '../db.js';
import Parser from 'rss-parser';
import AIService from './ai.service.js';

const parser = new Parser({
    customFields: {
        item: ['description', 'content:encoded', 'contentSnippet']
    }
});

export const ContentService = {
    // 1. Manage Feeds
    async addFeed(feedData) {
        const { name, url, keywords, type } = feedData;
        const result = await pool.query(
            "INSERT INTO content_feeds (name, url, keywords, type) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, url, keywords, type]
        );
        return result.rows[0];
    },

    async getFeeds() {
        const result = await pool.query("SELECT * FROM content_feeds ORDER BY created_at DESC");
        return result.rows;
    },

    async updateFeed(id, updates) {
        const { name, url, keywords, type, is_active } = updates;
        const result = await pool.query(
            `UPDATE content_feeds 
             SET name = COALESCE($1, name),
                 url = COALESCE($2, url),
                 keywords = COALESCE($3, keywords),
                 type = COALESCE($4, type),
                 is_active = COALESCE($5, is_active)
             WHERE id = $6
             RETURNING *`,
            [name, url, keywords, type, is_active, id]
        );
        return result.rows[0];
    },

    async deleteFeed(id) {
        await pool.query("DELETE FROM content_feeds WHERE id = $1", [id]);
        return { success: true };
    },

    // 2. Fetch & Store News (REAL IMPLEMENTATION)
    async fetchExternalNews() {
        console.log("📰 Fetching external news from RSS feeds...");

        // Get all active feeds
        const feedsResult = await pool.query(
            "SELECT * FROM content_feeds WHERE is_active = true"
        );
        const feeds = feedsResult.rows;

        if (feeds.length === 0) {
            console.log("⚠️ No active feeds found");
            return [];
        }

        const savedPosts = [];

        for (const feed of feeds) {
            try {
                console.log(`📡 Parsing feed: ${feed.name} (${feed.url})`);

                // Parse RSS feed
                const feedData = await parser.parseURL(feed.url);

                // Filter articles by keywords
                const relevantArticles = feedData.items.filter(item => {
                    if (!feed.keywords || feed.keywords.length === 0) {
                        return true; // No keyword filter
                    }

                    const title = item.title?.toLowerCase() || '';
                    const description = item.contentSnippet?.toLowerCase() || item.description?.toLowerCase() || '';
                    const content = `${title} ${description}`;

                    return feed.keywords.some(keyword =>
                        content.includes(keyword.toLowerCase())
                    );
                });

                console.log(`✅ Found ${relevantArticles.length} relevant articles from ${feed.name}`);

                // Process first 5 relevant articles
                const articlesToProcess = relevantArticles.slice(0, 5);

                for (const article of articlesToProcess) {
                    try {
                        // Check if article already exists
                        const existingPost = await pool.query(
                            "SELECT id FROM content_posts WHERE source_url = $1",
                            [article.link]
                        );

                        if (existingPost.rows.length > 0) {
                            console.log(`⏭️ Article already exists: ${article.title}`);
                            continue;
                        }

                        // Generate AI content for the article
                        console.log(`🤖 Generating AI post for: ${article.title}`);
                        const aiContent = await AIService.generateThoughtLeadershipPost({
                            original_title: article.title,
                            source_url: article.link,
                            summary: article.contentSnippet || article.description || ''
                        });

                        // Save to database
                        const result = await pool.query(
                            `INSERT INTO content_posts (source_url, original_title, ai_generated_content, status) 
                             VALUES ($1, $2, $3, 'draft') RETURNING *`,
                            [article.link, article.title, aiContent]
                        );

                        savedPosts.push(result.rows[0]);
                        console.log(`✅ Saved post: ${article.title}`);

                    } catch (articleError) {
                        console.error(`❌ Error processing article "${article.title}":`, articleError.message);
                    }
                }

            } catch (feedError) {
                console.error(`❌ Error parsing feed "${feed.name}":`, feedError.message);
            }
        }

        console.log(`\n📊 Summary: Generated ${savedPosts.length} new posts`);
        return savedPosts;
    },

    // 3. Manage Posts
    async getPosts(status = 'all') {
        let query = "SELECT * FROM content_posts";
        const params = [];
        if (status !== 'all') {
            query += " WHERE status = $1";
            params.push(status);
        }
        query += " ORDER BY created_at DESC";
        const result = await pool.query(query, params);
        return result.rows;
    },

    async getPostById(id) {
        const result = await pool.query("SELECT * FROM content_posts WHERE id = $1", [id]);
        return result.rows[0];
    },

    async updatePostStatus(id, status, content = null) {
        let query = "UPDATE content_posts SET status = $1";
        const params = [status, id];

        if (content) {
            query += ", ai_generated_content = $3";
            params.push(content);
        }

        if (status === 'published') {
            query += ", published_at = NOW()";
        }

        query += " WHERE id = $2 RETURNING *";
        const result = await pool.query(query, params);
        return result.rows[0];
    },

    async schedulePost(id, scheduledFor) {
        const result = await pool.query(
            `UPDATE content_posts 
             SET status = 'scheduled', scheduled_for = $1 
             WHERE id = $2 
             RETURNING *`,
            [scheduledFor, id]
        );
        return result.rows[0];
    },

    async deletePost(id) {
        await pool.query("DELETE FROM content_posts WHERE id = $1", [id]);
        return { success: true };
    },

    // 4. Regenerate AI content for a post
    async regeneratePostContent(id) {
        const post = await this.getPostById(id);
        if (!post) {
            throw new Error('Post not found');
        }

        console.log(`🔄 Regenerating AI content for: ${post.original_title}`);
        const newContent = await AIService.generateThoughtLeadershipPost({
            original_title: post.original_title,
            source_url: post.source_url,
            summary: ''
        });

        const result = await pool.query(
            "UPDATE content_posts SET ai_generated_content = $1 WHERE id = $2 RETURNING *",
            [newContent, id]
        );

        return result.rows[0];
    }
};
