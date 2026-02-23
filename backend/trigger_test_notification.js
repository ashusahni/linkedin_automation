
import dotenv from 'dotenv';
dotenv.config();

import { NotificationService } from "./src/services/notification.service.js";
import pool from "./src/db.js";

async function testNotification() {
    console.log("🔔 Creating test notification...");
    try {
        const notif = await NotificationService.create({
            type: 'system_test',
            title: 'Test Notification from Script',
            message: 'This is a manually triggered test notification to verify the system works.',
            data: { test: true, timestamp: new Date().toISOString() }
        });

        if (notif && notif.id) {
            console.log(`✅ Success! Notification created with ID: ${notif.id}`);
            console.log("Check your frontend bell icon now.");
        } else {
            console.error("❌ Failed: NotificationService.create returned null.");
        }
    } catch (e) {
        console.error("❌ Error creating notification:", e);
    } finally {
        await pool.end();
    }
}

testNotification();
