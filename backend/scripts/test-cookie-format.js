/**
 * Test cookie format and what PhantomBuster expects
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('\n🔍 Testing Cookie Format\n');
console.log('='.repeat(60));

// Read cookie from env
let sessionCookie = process.env.LINKEDIN_SESSION_COOKIE || "";
sessionCookie = typeof sessionCookie === "string" ? sessionCookie.trim() : "";

console.log('\n1️⃣ Original Cookie from .env:');
console.log(`   Length: ${sessionCookie.length}`);
console.log(`   Starts with "li_at=": ${sessionCookie.toLowerCase().startsWith("li_at=")}`);
console.log(`   Preview: ${sessionCookie.substring(0, 30)}...`);

// Process cookie like the code does
if (sessionCookie && sessionCookie.toLowerCase().startsWith("li_at=")) {
  sessionCookie = sessionCookie.slice(6).trim();
}

const cookieForPhantom = sessionCookie ? `li_at=${sessionCookie}` : "";

console.log('\n2️⃣ Processed Cookie (what we send):');
console.log(`   Format: ${cookieForPhantom.substring(0, 20)}...`);
console.log(`   Full length: ${cookieForPhantom.length}`);

// Check what PhantomBuster dashboard has
console.log('\n3️⃣ What PhantomBuster Dashboard Expects:');
console.log('   According to debug output, dashboard has:');
console.log('   - sessionCookie: "li_at=AQEDASdWjsAEykCmAAAB..."');
console.log('   - Format: "li_at=<value>" (full cookie string)');

// Test different formats
console.log('\n4️⃣ Testing Different Formats:');
const formats = {
  'Current (li_at=value)': cookieForPhantom,
  'Just value': sessionCookie,
  'With quotes': `"${cookieForPhantom}"`,
};

for (const [name, format] of Object.entries(formats)) {
  console.log(`   ${name}: ${format.substring(0, 30)}...`);
}

console.log('\n5️⃣ Analysis:');
console.log('   ✅ CSV endpoint is working (200 response)');
console.log('   ❌ Error: "network-cookie-invalid"');
console.log('\n   Possible causes:');
console.log('   1. Cookie is expired (even if same as dashboard)');
console.log('   2. Cookie format mismatch');
console.log('   3. Sending cookie via API conflicts with dashboard cookie');
console.log('   4. PhantomBuster rejects API cookie when dashboard has one');

console.log('\n6️⃣ Recommendation:');
console.log('   Since cookie is same in dashboard and .env:');
console.log('   → Try NOT sending cookie via API');
console.log('   → Let phantom use dashboard connection only');
console.log('   → This avoids "network-cookie-invalid" conflict');

console.log('\n' + '='.repeat(60) + '\n');
