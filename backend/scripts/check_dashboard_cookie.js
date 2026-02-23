
import phantomService from '../src/services/phantombuster.service.js';
import '../src/config/index.js'; // load .env

async function checkCookie() {
    try {
        const phantomId = process.env.MESSAGE_SENDER_PHANTOM_ID;
        console.log(`Checking Phantom ID: ${phantomId}`);

        const agentConfig = await phantomService.fetchAgent(phantomId);
        if (!agentConfig) {
            console.log('❌ Could not fetch agent config');
            return;
        }

        console.log('Agent Name:', agentConfig.name);

        let args = agentConfig.argument;
        if (typeof args === 'string') {
            try {
                args = JSON.parse(args);
            } catch (e) {
                console.log('Error parsing args JSON');
            }
        }

        console.log('--- Saved Arguments in Dashboard ---');
        console.log(JSON.stringify(args, null, 2));

        const hasCookie = !!(args.sessionCookie || args.linkedinSessionCookie);
        if (hasCookie) {
            console.log('\n✅ sessionCookie IS present in dashboard config.');
            console.log('   The backend will use this and SKIP sending the .env cookie.');
        } else {
            console.log('\n❌ sessionCookie is MISSING from dashboard config.');
            console.log('   The backend will try to use the .env cookie (which might fail due to IP check).');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkCookie();
