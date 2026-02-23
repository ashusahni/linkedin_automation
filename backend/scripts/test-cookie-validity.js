/**
 * Test if a LinkedIn cookie is valid by attempting to access LinkedIn
 */

import axios from 'axios';

const cookie = process.argv[2];

if (!cookie) {
  console.log('\n❌ Usage: node test-cookie-validity.js <cookie_value>');
  console.log('   Example: node test-cookie-validity.js AQEDATN_eP8AupyOAAABnCEKEygAAAGcRRaXKE4AcJLr45scerrxXWd3hsjwf_29DxFzEZ7WSP4tSlt29w6LJDibP21VPurnRSPqY5uMBD-oiXB09m6ijsrtfE4QKnV83IKc_4FRlIaeeWBz4dIFqBdd\n');
  process.exit(1);
}

// Format cookie
let cookieValue = cookie.trim();
if (cookieValue.startsWith('li_at=')) {
  cookieValue = cookieValue.slice(6);
}

const cookieString = `li_at=${cookieValue}`;

async function testCookie() {
  console.log('\n🧪 Testing LinkedIn Cookie Validity\n');
  console.log('='.repeat(70));
  console.log(`Cookie: ${cookieValue.substring(0, 30)}...`);
  console.log(`Length: ${cookieValue.length} characters\n`);

  try {
    // Try to access LinkedIn feed with this cookie
    console.log('1️⃣ Testing cookie by accessing LinkedIn feed...');
    const response = await axios.get('https://www.linkedin.com/feed/', {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on any status
      timeout: 10000
    });

    console.log(`   Status Code: ${response.status}`);
    
    if (response.status === 200) {
      // Check if we're redirected to login
      const html = response.data;
      if (html.includes('login') || html.includes('sign-in') || html.includes('authwall')) {
        console.log('   ❌ Cookie is INVALID - redirected to login page');
        console.log('   💡 You need to get a fresh cookie from your browser\n');
        return false;
      } else if (html.includes('feed') || html.includes('linkedin.com')) {
        console.log('   ✅ Cookie appears to be VALID - can access LinkedIn feed');
        return true;
      } else {
        console.log('   ⚠️  Unable to determine cookie validity from response');
        return null;
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('   ❌ Cookie is INVALID - LinkedIn rejected it');
      console.log('   💡 You need to get a fresh cookie from your browser\n');
      return false;
    } else {
      console.log(`   ⚠️  Unexpected status code: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Error testing cookie:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
    return null;
  }
}

testCookie().then(isValid => {
  console.log('\n' + '='.repeat(70));
  if (isValid === false) {
    console.log('\n❌ Cookie is INVALID or EXPIRED');
    console.log('\n📋 Next Steps:');
    console.log('   1. Open LinkedIn in your browser (logged in)');
    console.log('   2. Press F12 → Application → Cookies → linkedin.com');
    console.log('   3. Find "li_at" cookie and copy the VALUE');
    console.log('   4. Update it in PhantomBuster dashboard');
    console.log('   5. Restart backend and try again\n');
    process.exit(1);
  } else if (isValid === true) {
    console.log('\n✅ Cookie appears to be VALID');
    console.log('   If you\'re still getting errors, the issue might be elsewhere.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Could not determine cookie validity');
    console.log('   Try getting a fresh cookie from your browser to be safe.\n');
    process.exit(0);
  }
}).catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
