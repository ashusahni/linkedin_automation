/**
 * Diagnose LinkedIn connection issues for Message Sender phantom
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID || '6916181421927761';

async function diagnose() {
  console.log('\n🔍 Diagnosing LinkedIn Connection Issue\n');
  console.log('='.repeat(60));

  // Check cookie in .env
  const cookie = process.env.LINKEDIN_SESSION_COOKIE;
  console.log('\n1️⃣ Cookie in .env:');
  if (cookie) {
    console.log('   ✅ LINKEDIN_SESSION_COOKIE is set');
    console.log(`   Length: ${cookie.trim().length} characters`);
  } else {
    console.log('   ❌ LINKEDIN_SESSION_COOKIE not set');
  }

  // Check phantom configuration
  console.log('\n2️⃣ Phantom Configuration:');
  try {
    const agentConfig = await phantomService.fetchAgent(phantomId);
    if (agentConfig && agentConfig.argument) {
      let savedArgs = {};
      try {
        savedArgs = typeof agentConfig.argument === 'string' 
          ? JSON.parse(agentConfig.argument) 
          : agentConfig.argument;
      } catch (e) {
        console.log('   ⚠️  Could not parse saved arguments');
      }

      const dashboardCookie = savedArgs.sessionCookie;
      console.log('   Phantom ID:', phantomId);
      console.log('   Phantom Name:', agentConfig.name || 'Unknown');
      
      if (dashboardCookie) {
        console.log('   ✅ Cookie found in dashboard saved config');
        const cookieMatch = cookie && dashboardCookie.includes(cookie.trim().replace(/^li_at=/, ''));
        if (cookieMatch) {
          console.log('   ✅ Cookie in .env matches dashboard cookie');
        } else {
          console.log('   ⚠️  Cookie in .env may differ from dashboard');
        }
      } else {
        console.log('   ❌ No cookie in dashboard saved config');
        console.log('   💡 You need to connect LinkedIn in PhantomBuster dashboard');
      }
    }
  } catch (err) {
    console.log('   ⚠️  Could not fetch phantom config:', err.message);
  }

  // Recommendations
  console.log('\n3️⃣ Recommendations:\n');
  console.log('   The "cookie-missing" error means the phantom needs LinkedIn authentication.');
  console.log('   Since you have cookie in both places, try:\n');
  
  console.log('   Option A: Connect LinkedIn in Dashboard (RECOMMENDED)');
  console.log('   1. Go to https://phantombuster.com/');
  console.log('   2. Open your Message Sender phantom');
  console.log('   3. Look for "Connect to LinkedIn" or "LinkedIn Account" section');
  console.log('   4. Click "Connect" and authenticate');
  console.log('   5. Make sure it shows as "Connected" (green checkmark)');
  console.log('   6. Save the configuration\n');
  
  console.log('   Option B: Get Fresh Cookie');
  console.log('   1. Open LinkedIn in browser (logged in)');
  console.log('   2. Press F12 → Application → Cookies → linkedin.com');
  console.log('   3. Find "li_at" cookie');
  console.log('   4. Copy the VALUE (not the full cookie string)');
  console.log('   5. Update .env: LINKEDIN_SESSION_COOKIE=<fresh_value>');
  console.log('   6. Restart backend server\n');

  console.log('   Option C: Check Cookie Expiration');
  console.log('   - LinkedIn cookies expire after some time');
  console.log('   - Even if cookie looks correct, it might be expired');
  console.log('   - Get a fresh cookie from browser\n');

  console.log('='.repeat(60));
  console.log('\n💡 After fixing, restart your backend server and try again.\n');
}

diagnose().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
