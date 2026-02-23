
import { NotificationService } from "./services/notification.service.js";
import pool from "./db.js";

async function test() {
    console.log("Testing NotificationService...");
    try {
        const notif = await NotificationService.create({
            type: 'system_test',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system works.',
            data: { test: true }
        });
        console.log("Notification created:", notif);
        if (notif && notif.id) {
            console.log("SUCCESS: Notification inserted into DB.");
        } else {
            console.error("FAILURE: Notification not returned.");
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await pool.end();
    }
}

test();
