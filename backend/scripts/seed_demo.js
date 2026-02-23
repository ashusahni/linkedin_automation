import pool from "../src/db.js";

const demoLeads = [
    {
        linkedinUrl: "https://www.linkedin.com/in/snehanshu-py/",
        firstName: "Snehanshu",
        lastName: ".py",
        fullName: "Snehanshu .py",
        title: "Full Stack Developer",
        company: "TechInnovation",
        status: "new"
    },
    {
        linkedinUrl: "https://www.linkedin.com/in/elon-musk-fake/",
        firstName: "Elon",
        lastName: "Musk",
        fullName: "Elon Musk",
        title: "Chief Engineer",
        company: "SpaceX",
        status: "new"
    },
    {
        linkedinUrl: "https://www.linkedin.com/in/satya-nadella-fake/",
        firstName: "Satya",
        lastName: "Nadella",
        fullName: "Satya Nadella",
        title: "CEO",
        company: "Microsoft",
        status: "enriched"
    },
    {
        linkedinUrl: "https://www.linkedin.com/in/sundar-pichai-fake/",
        firstName: "Sundar",
        lastName: "Pichai",
        fullName: "Sundar Pichai",
        title: "CEO",
        company: "Google",
        status: "approved"
    }
];

async function seedDemoData() {
    console.log("🌱 Starting demo data seeding...");

    try {
        // 1. Insert Leads
        console.log("👥 Inserting leads...");
        const leadIds = [];
        for (const lead of demoLeads) {
            const result = await pool.query(
                `INSERT INTO leads (linkedin_url, first_name, last_name, full_name, title, company, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (linkedin_url) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
                [lead.linkedinUrl, lead.firstName, lead.lastName, lead.fullName, lead.title, lead.company, lead.status]
            );
            leadIds.push(result.rows[0].id);
            console.log(`   ✅ Lead added: ${lead.fullName}`);
        }

        // 2. Insert a Demo Campaign
        console.log("Campaigns...");
        const campaignResult = await pool.query(
            `INSERT INTO campaigns (name, status, type)
       VALUES ($1, $2, $3)
       RETURNING id`,
            ["Q1 Outreach Campaign", "active", "standard"]
        );
        const campaignId = campaignResult.rows[0].id;
        console.log(`   ✅ Campaign created: Q1 Outreach Campaign (ID: ${campaignId})`);

        // 3. Link Leads to Campaign
        console.log("🔗 Linking leads to campaign...");
        for (const leadId of leadIds) {
            await pool.query(
                `INSERT INTO campaign_leads (campaign_id, lead_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, lead_id) DO NOTHING`,
                [campaignId, leadId, "pending"]
            );
        }
        console.log(`   ✅ Linked ${leadIds.length} leads to the campaign.`);

        console.log("\n✨ Demo seeding completed successfully!");
        console.log("   You can now view these leads in the 'Leads' page and the campaign in 'Campaigns' page.");

    } catch (error) {
        console.error("❌ Seeding failed:", error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

seedDemoData();
