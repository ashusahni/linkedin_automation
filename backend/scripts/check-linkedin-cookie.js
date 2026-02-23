/**
 * Check if LinkedIn session cookie is configured
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('\n🔍 Checking LinkedIn Session Cookie Configuration\n');
console.log('='.repeat(60));

const cookie = process.env.LINKEDIN_SESSION_COOKIE;

if (!cookie) {
  console.error('❌ LINKEDIN_SESSION_COOKIE not set in .env');
  console.log('\n💡 To fix:');
  console.log('   1. Go to LinkedIn in your browser');
  console.log('   2. Open Developer Tools (F12)');
  console.log('   3. Go to Application/Storage → Cookies → linkedin.com');
  console.log('   4. Find the "li_at" cookie');
  console.log('   5. Copy its value');
  console.log('   6. Add to backend/.env:');
  console.log('      LINKEDIN_SESSION_COOKIE=your_cookie_value_here');
  console.log('\n   OR connect LinkedIn in PhantomBuster dashboard for your phantom');
} else {
  const cookieValue = cookie.trim();
  const isFullFormat = cookieValue.startsWith('li_at=');
  const actualValue = isFullFormat ? cookieValue.slice(6) : cookieValue;
  
  console.log('✅ LINKEDIN_SESSION_COOKIE is set');
  console.log(`   Format: ${isFullFormat ? 'li_at=...' : 'Just value'}`);
  console.log(`   Length: ${actualValue.length} characters`);
  console.log(`   Preview: ${actualValue.substring(0, 20)}...`);
  
  if (actualValue.length < 50) {
    console.warn('\n⚠️  Cookie value seems too short - may be invalid');
  }
  
  console.log('\n💡 Note: If you still get "cookie-missing" error:');
  console.log('   1. Cookie may be expired - get a fresh one from LinkedIn');
  console.log('   2. OR connect LinkedIn in PhantomBuster dashboard:');
  console.log('      - Go to PhantomBuster dashboard');
  console.log('      - Open your Message Sender phantom');
  console.log('      - Click "Connect to LinkedIn"');
  console.log('      - Authenticate with LinkedIn');
}

console.log('\n' + '='.repeat(60) + '\n');
