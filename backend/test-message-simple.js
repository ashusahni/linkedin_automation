/**
 * Simple test script - Uses your running backend API
 * Tests Message Sender with two LinkedIn profiles
 * Run from backend folder: node test-message-simple.js
 */

const BACKEND_URL = 'http://localhost:5000';

// Test profiles from your request
const profiles = [
    {
        name: 'Sandy Sharma',
        linkedinUrl: 'https://www.linkedin.com/in/sandy-sharma-184124217/',
        message: 'Hi Sandy! Testing our message sender - hope this reaches you well!',
        source: 'Phantom directly'
    },
    {
        name: 'Martin Rauch',
        linkedinUrl: 'https://www.linkedin.com/in/martin-rauch-a9215a31b/',
        message: 'Hi Martin! This is a test message from our CRM system. Looking forward to connecting!',
        source: 'Imported to CRM'
    }
];

async function sendTestMessage(profile) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 Sending message to: ${profile.name}`);
    console.log(`   Source: ${profile.source}`);
    console.log(`   LinkedIn: ${profile.linkedinUrl}`);
    console.log(`   Message: "${profile.message}"`);
    console.log(`${'='.repeat(60)}`);

    try {
        const response = await fetch(`${BACKEND_URL}/api/phantom/send-message-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                linkedinUrl: profile.linkedinUrl,
                message: profile.message
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const err = new Error(data.error || data.message || `HTTP ${response.status}`);
            err.responseData = data;
            throw err;
        }

        console.log(`✅ SUCCESS!`);
        console.log(`   Container ID: ${data.containerId || 'N/A'}`);
        console.log(`   Status: ${data.status || 'launched'}`);
        
        return {
            success: true,
            profile: profile.name,
            containerId: data.containerId
        };

    } catch (error) {
        console.error(`\n❌ FAILED for ${profile.name}`);
        const msg = error.message || '';
        const cause = error.cause ? ` (${error.cause.message || error.cause.code || error.cause})` : '';
        console.error(`   Error: ${msg}${cause}`);
        if (msg === 'fetch failed' && !cause) {
            console.error(`   → Is the backend running? Start it with: npm run dev (port 5000)`);
        }
        if (error.responseData?.helpUrl) {
            console.error(`   Help: ${error.responseData.helpUrl}`);
        }

        return {
            success: false,
            profile: profile.name,
            error: error.message
        };
    }
}

async function main() {
    console.log('\n🧪 LinkedIn Message Sender Test');
    console.log('='.repeat(60));
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log(`🔗 Backend: ${BACKEND_URL}`);
    console.log(`👥 Testing ${profiles.length} profiles\n`);

    const results = [];

    // Send messages sequentially (avoid rate limits)
    for (let i = 0; i < profiles.length; i++) {
        const result = await sendTestMessage(profiles[i]);
        results.push(result);

        // Wait between messages
        if (i < profiles.length - 1) {
            console.log(`\n⏸️  Waiting 10 seconds before next profile...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    // Summary
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n✅ Successful: ${successful}/${profiles.length}`);
    console.log(`❌ Failed: ${failed}/${profiles.length}\n`);

    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        console.log(`   ${icon} ${result.profile}`);
        if (result.containerId) {
            console.log(`      Container: ${result.containerId}`);
        }
        if (result.error) {
            console.log(`      Error: ${result.error}`);
        }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏁 Completed: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(60)}\n`);

    if (successful > 0) {
        console.log(`✨ Check your LinkedIn messages to verify delivery!`);
        console.log(`📊 View phantom runs: https://phantombuster.com/app\n`);
    }
}

main().catch(error => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
});
