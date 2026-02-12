// Quick test to verify Claude API integration
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

console.log('\n🧪 Testing Claude API Integration...\n');
console.log(`AI Provider: ${AI_PROVIDER}`);
console.log(`Anthropic API Key: ${ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
console.log(`Claude Model: ${process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'}`);

if (AI_PROVIDER === 'claude' && ANTHROPIC_API_KEY) {
    console.log('\n✅ Configuration looks good!');
    console.log('\nTesting API connection...\n');

    const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY
    });

    try {
        const response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: 50,
            messages: [{
                role: 'user',
                content: 'Say "Hello! Claude API is working!" in a friendly way.'
            }]
        });

        console.log('✅ SUCCESS! Claude API Response:');
        console.log(response.content[0].text);
        console.log('\n🎉 Claude integration is working perfectly!\n');
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        if (error.status) {
            console.error(`Status: ${error.status}`);
        }
        console.log('\n⚠️ Please check your API key and try again.\n');
    }
} else {
    console.log('\n⚠️ AI_PROVIDER is not set to "claude" or ANTHROPIC_API_KEY is missing');
    console.log('Please update your .env file:\n');
    console.log('AI_PROVIDER=claude');
    console.log('ANTHROPIC_API_KEY=sk-ant-api03-...\n');
}
