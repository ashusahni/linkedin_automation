import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import pool from "../src/db.js";

async function viewEnrichedProfiles() {
    try {
        console.log("🔍 Viewing Enriched Profile Data...\n");

        // Get all enriched profiles with lead details
        const enrichedResult = await pool.query(`
            SELECT 
                l.id as lead_id,
                l.full_name,
                l.company,
                l.title,
                l.linkedin_url,
                l.email,
                le.bio,
                le.interests,
                le.mutual_connections_count,
                le.recent_posts,
                le.company_news,
                le.last_enriched_at
            FROM leads l
            INNER JOIN lead_enrichment le ON l.id = le.lead_id
            ORDER BY le.last_enriched_at DESC
        `);

        if (enrichedResult.rows.length === 0) {
            console.log("⚠️ No enriched profiles found in database.\n");
            console.log("💡 To enrich a lead, use:");
            console.log("   POST /api/leads/:id/enrich\n");
            return;
        }

        console.log(`✅ Found ${enrichedResult.rows.length} enriched profile(s):\n`);
        console.log("=".repeat(80));

        enrichedResult.rows.forEach((profile, index) => {
            console.log(`\n📋 Profile ${index + 1}: ${profile.full_name}`);
            console.log(`   Lead ID: ${profile.lead_id}`);
            console.log(`   Company: ${profile.company || 'N/A'}`);
            console.log(`   Title: ${profile.title || 'N/A'}`);
            console.log(`   LinkedIn: ${profile.linkedin_url || 'N/A'}`);
            console.log(`   Email: ${profile.email || 'N/A'}`);
            console.log(`   Last Enriched: ${profile.last_enriched_at}`);
            
            if (profile.bio) {
                console.log(`\n   📝 Bio:`);
                console.log(`      ${profile.bio.substring(0, 200)}${profile.bio.length > 200 ? '...' : ''}`);
            }
            
            if (profile.interests && profile.interests.length > 0) {
                console.log(`\n   🎯 Interests:`);
                profile.interests.forEach(interest => {
                    console.log(`      - ${interest}`);
                });
            }
            
            if (profile.mutual_connections_count) {
                console.log(`\n   👥 Mutual Connections: ${profile.mutual_connections_count}`);
            }
            
            if (profile.recent_posts) {
                const posts = Array.isArray(profile.recent_posts) ? profile.recent_posts : [];
                console.log(`\n   📰 Recent Posts: ${posts.length} post(s)`);
                if (posts.length > 0) {
                    posts.slice(0, 2).forEach((post, idx) => {
                        const postText = typeof post === 'string' ? post : (post.text || post.content || JSON.stringify(post));
                        console.log(`      ${idx + 1}. ${postText.substring(0, 100)}...`);
                    });
                }
            }
            
            if (profile.company_news) {
                const news = Array.isArray(profile.company_news) ? profile.company_news : [];
                console.log(`\n   📢 Company News: ${news.length} item(s)`);
            }
            
            console.log("\n" + "-".repeat(80));
        });

        // Summary statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_enriched,
                COUNT(CASE WHEN bio IS NOT NULL THEN 1 END) as with_bio,
                COUNT(CASE WHEN interests IS NOT NULL AND array_length(interests, 1) > 0 THEN 1 END) as with_interests,
                COUNT(CASE WHEN recent_posts IS NOT NULL THEN 1 END) as with_posts
            FROM lead_enrichment
        `);

        const stats = statsResult.rows[0];
        console.log("\n📊 Enrichment Statistics:");
        console.log(`   Total Enriched: ${stats.total_enriched}`);
        console.log(`   With Bio: ${stats.with_bio}`);
        console.log(`   With Interests: ${stats.with_interests}`);
        console.log(`   With Recent Posts: ${stats.with_posts}`);

        console.log("\n✅ View complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

viewEnrichedProfiles();
