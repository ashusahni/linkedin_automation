import pool from "../src/db.js";

async function seedSOW() {
    console.log("🌱 Seeding SOW Showcase Data...");

    try {
        // 1. Seed Content Feeds & Posts (SOW Step 4)
        console.log("📝 Seeding Content Engine...");
        const feedRes = await pool.query(
            "INSERT INTO content_feeds (name, url, keywords, type) VALUES ($1, $2, $3, $4) RETURNING id",
            ["Global Tech News", "https://techcrunch.com/feed", ["AI", "SaaS"], "news"]
        );

        await pool.query(
            `INSERT INTO content_posts (source_url, original_title, ai_generated_content, status) 
             VALUES ($1, $2, $3, 'draft')`,
            [
                "https://techcrunch.com/2026/01/ai-sales",
                "AI is taking over Sales Outbound",
                "I just read a fascinating article on how AI is changing sales. Here are my thoughts...\n\n1. Personalization is key\n2. Speed is the second key.\n\n#AI #SalesAutomation",
            ]
        );

        // 2. Seed Audit Connections (SOW Step 1)
        console.log("🌐 Seeding Network Audit...");
        await pool.query(
            `INSERT INTO audit_connections (linkedin_id, name, title, company, profile_url, connected_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING`,
            ["id_demo_1", "Marc Benioff", "CEO", "Salesforce", "https://linkedin.com/in/marc"]
        );

        // 3. Seed Approval Queue (SOW Step 3)
        console.log("🚥 Seeding Approval Queue...");
        // Need an active campaign and lead first
        const campRes = await pool.query("SELECT id FROM campaigns LIMIT 1");
        const leadRes = await pool.query("SELECT id FROM leads LIMIT 1");

        if (campRes.rows.length > 0 && leadRes.rows.length > 0) {
            const campaignId = campRes.rows[0].id;
            const leadId = leadRes.rows[0].id;

            // Ensure campaign_lead entry exists
            await pool.query(
                "INSERT INTO campaign_leads (campaign_id, lead_id, status) VALUES ($1, $2, 'needs_approval') ON CONFLICT DO NOTHING",
                [campaignId, leadId]
            );

            await pool.query(
                `INSERT INTO approval_queue (campaign_id, lead_id, step_type, generated_content, status)
                 VALUES ($1, $2, 'message', 'Hi there, I saw your profile and loved your work at your company!', 'pending')`,
                [campaignId, leadId]
            );
        }

        console.log("✨ SOW Seeding Completed!");
    } catch (err) {
        console.error("❌ Seed failed:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seedSOW();
