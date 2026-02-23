import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import AIService from "../src/services/ai.service.js";

async function testAI() {
    try {
        console.log("🧪 Testing AI Message Generation\n");
        console.log("=" + "=".repeat(60) + "\n");

        // Check configuration
        console.log("📋 Configuration:");
        console.log(`   AI Provider: OpenAI`);
        console.log(`   Configured: ${AIService.isConfigured() ? 'Yes ✅' : 'No ❌'}`);
        console.log(`   OpenAI Key: ${process.env.OPENAI_API_KEY ? 'Set ✅' : 'Not set ❌'}`);
        
        console.log("\n" + "=" + "=".repeat(60) + "\n");

        if (!AIService.isConfigured()) {
            console.error("❌ AI is not configured. Please set up your .env file.");
            console.log("\nFor OpenAI:");
            console.log("   OPENAI_API_KEY=sk-your-key");
            return;
        }

        // Test data
        const testLead = {
            id: 1,
            full_name: "John Smith",
            first_name: "John",
            last_name: "Smith",
            title: "Senior Product Manager",
            company: "TechCorp"
        };

        const testEnrichment = {
            bio: "Experienced Product Manager with 10+ years in SaaS. Passionate about AI and machine learning applications in healthcare. Recently launched a successful product that increased user engagement by 40%.",
            interests: ["Artificial Intelligence", "Product Management", "Healthcare Technology", "Machine Learning"],
            recent_posts: [
                {
                    title: "The future of AI in healthcare is here",
                    engagement: 120,
                    date: "2026-01-25"
                }
            ]
        };

        console.log("📝 Test Lead:");
        console.log(`   Name: ${testLead.full_name}`);
        console.log(`   Title: ${testLead.title}`);
        console.log(`   Company: ${testLead.company}`);
        console.log(`   Bio: ${testEnrichment.bio.substring(0, 80)}...`);
        console.log(`   Interests: ${testEnrichment.interests.slice(0, 3).join(', ')}`);
        
        console.log("\n" + "=" + "=".repeat(60) + "\n");

        // Test connection request
        console.log("🔵 Test 1: Generating Connection Request...\n");
        const connectionRequest = await AIService.generateConnectionRequest(testLead, testEnrichment);
        console.log("\n📧 Generated Connection Request:");
        console.log("─".repeat(60));
        console.log(connectionRequest);
        console.log("─".repeat(60));
        console.log(`Length: ${connectionRequest.length} characters\n`);

        console.log("=" + "=".repeat(60) + "\n");

        // Test follow-up message
        console.log("🔵 Test 2: Generating Follow-up Message...\n");
        const followUp = await AIService.generateFollowUpMessage(testLead, testEnrichment, [connectionRequest]);
        console.log("\n📧 Generated Follow-up Message:");
        console.log("─".repeat(60));
        console.log(followUp);
        console.log("─".repeat(60));
        console.log(`Length: ${followUp.length} characters\n`);

        console.log("=" + "=".repeat(60) + "\n");
        console.log("✅ All tests passed! AI is working correctly.\n");

    } catch (error) {
        console.error("\n❌ Test failed:", error.message);
        if (error.stack) {
            console.error("\nStack trace:");
            console.error(error.stack);
        }
        
    }
}

testAI();
