/**
 * Guide to get a fresh LinkedIn cookie
 */

console.log('\n🍪 How to Get a Fresh LinkedIn Cookie\n');
console.log('='.repeat(70));

console.log('\n📋 Step-by-Step Instructions:\n');

console.log('1️⃣ Open LinkedIn in Your Browser');
console.log('   - Go to: https://www.linkedin.com');
console.log('   - Make sure you are LOGGED IN to your LinkedIn account');
console.log('   - Use the SAME account that you want to use for sending messages\n');

console.log('2️⃣ Open Browser Developer Tools');
console.log('   - Press F12 (or right-click → Inspect)');
console.log('   - Click on the "Application" tab (Chrome) or "Storage" tab (Firefox)');
console.log('   - In the left sidebar, expand "Cookies"');
console.log('   - Click on "https://www.linkedin.com"\n');

console.log('3️⃣ Find the "li_at" Cookie');
console.log('   - Look for a cookie named "li_at"');
console.log('   - It should be a long string of characters');
console.log('   - Example: AQEDATN_eP8FFzckAAABnCDZZD8AAAGcROXoP04AwfVH9RsD6GSIQcof_xlyRfBfu2if3-5XUp0GUVZb-cNy0pQos5LAnqcYeq9Yq68QYhSPa7y3Kc93OQeiEhbocwKwPc-SWSIilzSbUqqXPxtKORHQ\n');

console.log('4️⃣ Copy the Cookie VALUE');
console.log('   - Click on the "li_at" cookie');
console.log('   - Copy the VALUE (not the name, just the value)');
console.log('   - It should start with "AQED..." or similar');
console.log('   - It should be about 150-160 characters long\n');

console.log('5️⃣ Update PhantomBuster Dashboard');
console.log('   - Go to: https://phantombuster.com/');
console.log('   - Open your Message Sender phantom (ID: 6916181421927761)');
console.log('   - Find the "sessionCookie" field in the configuration');
console.log('   - Paste the fresh cookie value');
console.log('   - Click "Save"\n');

console.log('6️⃣ Verify the Cookie');
console.log('   - Run: node scripts/detailed-phantom-check.js');
console.log('   - Check that the cookie in the dashboard matches what you copied\n');

console.log('⚠️  Important Notes:');
console.log('   - Cookies expire after some time (usually days/weeks)');
console.log('   - If you log out of LinkedIn, the cookie becomes invalid');
console.log('   - If you change your LinkedIn password, the cookie becomes invalid');
console.log('   - You need to get a fresh cookie when it expires\n');

console.log('💡 Alternative: Use OAuth Connection');
console.log('   - Instead of using a cookie, you can connect LinkedIn via OAuth');
console.log('   - This is more reliable and doesn\'t expire');
console.log('   - Follow the guide in: backend/docs/PHANTOMBUSTER_LINKEDIN_CONNECTION_GUIDE.md\n');

console.log('='.repeat(70));
console.log('\n✅ After updating the cookie in PhantomBuster dashboard, restart your backend and try again.\n');
