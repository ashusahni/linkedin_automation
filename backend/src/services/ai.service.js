import pool from '../db.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import '../config/index.js'; // Ensure config is loaded

// Determine which AI provider to use
const AI_PROVIDER = (process.env.AI_PROVIDER || 'openai').toLowerCase();

// Initialize OpenAI client
const openaiKey = process.env.OPENAI_API_KEY || '';
let openai = null;
if (openaiKey && AI_PROVIDER === 'openai') {
    openai = new OpenAI({
        apiKey: openaiKey
    });
}

// Initialize Anthropic (Claude) client
const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
let anthropic = null;
if (anthropicKey && AI_PROVIDER === 'claude') {
    anthropic = new Anthropic({
        apiKey: anthropicKey
    });
}

// Log configuration status on module load
console.log(`\n🤖 AI Configuration:`);
console.log(`   Provider: ${AI_PROVIDER.toUpperCase()}`);

if (AI_PROVIDER === 'claude') {
    if (anthropicKey) {
        console.log(`   ✅ Claude API Key loaded: ${anthropicKey.substring(0, 12)}...${anthropicKey.substring(anthropicKey.length - 4)}`);
        console.log(`   Model: ${process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229'}`);
    } else {
        console.warn('   ⚠️ ANTHROPIC_API_KEY not found in environment variables');
    }
} else {
    if (openaiKey) {
        console.log(`   ✅ OpenAI API Key loaded: ${openaiKey.substring(0, 7)}...${openaiKey.substring(openaiKey.length - 4)}`);
        console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
    } else {
        console.warn('   ⚠️ OPENAI_API_KEY not found in environment variables');
    }
}
console.log('');

class AIService {
    /**
     * Check if AI is configured (OpenAI or Claude)
     */
    static isConfigured() {
        if (AI_PROVIDER === 'claude') {
            const hasKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0;
            if (!hasKey) {
                console.warn('⚠️ ANTHROPIC_API_KEY not found or empty in environment variables');
                console.warn('   Check backend/.env file and ensure ANTHROPIC_API_KEY=sk-ant-... is set');
            }
            return hasKey;
        } else {
            const hasKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
            if (!hasKey) {
                console.warn('⚠️ OPENAI_API_KEY not found or empty in environment variables');
                console.warn('   Check backend/.env file and ensure OPENAI_API_KEY=sk-... is set');
            }
            return hasKey;
        }
    }

    /**
     * Call AI API (supports both OpenAI and Claude)
     */
    static async callAI(prompt, maxTokens = 300, temperature = 0.8) {
        if (AI_PROVIDER === 'claude') {
            if (!anthropic) {
                throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY in .env file.');
            }

            console.log('   📡 Calling Claude API...');
            const model = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229';
            console.log(`      Model: ${model}`);
            console.log(`      Prompt length: ${prompt.length} chars`);

            const response = await anthropic.messages.create({
                model: model,
                max_tokens: maxTokens,
                temperature: temperature,
                messages: [{ role: 'user', content: prompt }]
            });

            if (!response || !response.content || !response.content[0] || !response.content[0].text) {
                throw new Error('Invalid response format from Claude');
            }

            const message = response.content[0].text.trim();
            console.log(`   ✅ Claude API call successful (${message.length} chars)`);
            return message;

        } else {
            // OpenAI
            if (!openai) {
                throw new Error('OpenAI client not initialized. Please check OPENAI_API_KEY in .env file.');
            }

            console.log('   📡 Calling OpenAI API...');
            const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
            console.log(`      Model: ${model}`);
            console.log(`      Prompt length: ${prompt.length} chars`);

            const response = await openai.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: temperature,
                max_tokens: maxTokens
            });

            if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
                throw new Error('Invalid response format from OpenAI');
            }

            const message = response.choices[0].message.content.trim();
            console.log(`   ✅ OpenAI API call successful (${message.length} chars)`);
            return message;
        }
    }

    /**
     * Personalization options for connection requests (human-selectable before send).
     * @param {Object} options
     * @param {string} [options.tone] - professional | friendly | casual | formal | warm
     * @param {string} [options.length] - short | medium | long
     * @param {string} [options.focus] - recent_post | company | role | mutual_connection | general
     */
    static getFallbackConnectionMessage(lead, enrichment = null) {
        if (enrichment && enrichment.bio) {
            const bioSnippet = (enrichment.bio || '').substring(0, 80);
            return `Hi ${lead.first_name}, I noticed your work at ${lead.company || 'your company'} and your background in ${enrichment.interests?.[0] || lead.title || 'your field'}. ${bioSnippet}${bioSnippet.length >= 80 ? '...' : ''} I'd love to connect!`;
        }
        return `Hi ${lead.first_name}, I'd love to connect and explore potential synergies between our work.`;
    }

    /**
     * Generates a personalized connection request note (max 300 chars).
     * Supports optional personalization: tone, length, focus. On API/quota failure returns fallback so user can edit and send.
     * @param {Object} lead - Lead information
     * @param {Object} enrichment - Enriched profile data (optional)
     * @param {Object} options - Options including campaign context
     * @param {Object} options.campaign - Campaign details (goal, type, description, target_audience)
     */
    static async generateConnectionRequest(lead, enrichment = null, options = {}) {
        const tone = options.tone || 'professional';
        const length = options.length || 'medium';
        const focus = options.focus || 'general';
        const campaign = options.campaign || null;

        try {
            if (!this.isConfigured()) {
                console.warn('⚠️ AI not configured, using personalized template. Edit and send.');
                return this.getFallbackConnectionMessage(lead, enrichment);
            }

            // Build rich prompt with all available data
            let enrichmentContext = '';
            let hasEnrichmentData = false;

            if (enrichment) {
                hasEnrichmentData = true;
                if (enrichment.bio && enrichment.bio.trim().length > 0) {
                    enrichmentContext += `\n\nProfile Bio (USE THIS for personalization):\n${enrichment.bio}`;
                    console.log(`      Bio available: ${enrichment.bio.substring(0, 60)}...`);
                }
                if (enrichment.interests && Array.isArray(enrichment.interests) && enrichment.interests.length > 0) {
                    enrichmentContext += `\n\nInterests/Skills (REFERENCE THESE):\n${enrichment.interests.slice(0, 8).join(', ')}`;
                }
                if (enrichment.recent_posts && Array.isArray(enrichment.recent_posts) && enrichment.recent_posts.length > 0) {
                    enrichmentContext += `\n\nRecent Activity/Posts (MENTION IF RELEVANT):`;
                    enrichment.recent_posts.slice(0, 3).forEach((post, idx) => {
                        const postText = post.title || post.text || JSON.stringify(post);
                        enrichmentContext += `\n${idx + 1}. ${postText.substring(0, 200)}`;
                    });
                }
            }

            // Build campaign context
            let campaignContext = '';
            if (campaign) {
                campaignContext = '\n\nCAMPAIGN CONTEXT (ALIGN YOUR MESSAGE WITH THIS):';
                if (campaign.goal) {
                    campaignContext += `\n- Campaign Goal: ${campaign.goal}`;
                }
                if (campaign.type) {
                    campaignContext += `\n- Campaign Type: ${campaign.type}`;
                }
                if (campaign.description) {
                    campaignContext += `\n- Campaign Description: ${campaign.description}`;
                }
                if (campaign.target_audience) {
                    campaignContext += `\n- Target Audience: ${campaign.target_audience}`;
                }
                console.log(`      Campaign context: ${campaign.goal || 'N/A'} - ${campaign.type || 'N/A'}`);
            }

            const toneInstructions = {
                professional: 'Professional and polished. Respectful, clear, no slang.',
                friendly: 'Warm and approachable. Conversational but still professional.',
                casual: 'Relaxed and conversational. Slightly informal, human touch.',
                formal: 'Formal and businesslike. Best for senior/executive contacts.',
                warm: 'Warm and personable. Show genuine interest and enthusiasm.'
            };
            const lengthInstructions = {
                short: '2-3 sentences only. Target 150-250 characters. Be concise.',
                medium: '3-5 sentences. Target 400-600 characters. Balanced.',
                long: '4-6 sentences. Target 500-600 characters (LinkedIn limit). More detail.'
            };
            const focusInstructions = {
                recent_post: 'Reference or mention their recent post/activity if available. Show you saw it.',
                company: 'Focus on their company and role there. Why their company/industry interests you.',
                role: 'Focus on their job title and expertise. Tie to your shared domain.',
                mutual_connection: 'If you have mutual connections, you can reference shared context (keep it natural).',
                general: 'Use a mix of their bio, title, and company. Balanced personalization.'
            };

            const prompt = `You are writing a personalized LinkedIn connection request. Generate a UNIQUE message that shows you've researched this person's profile AND aligns with the campaign goals.

Lead Information:
- Name: ${lead.full_name}
- Title: ${lead.title || 'N/A'}
- Company: ${lead.company || 'N/A'}${enrichmentContext}${campaignContext}

PERSONALIZATION (follow these):
- TONE: ${toneInstructions[tone] || toneInstructions.professional}
- LENGTH: ${lengthInstructions[length] || lengthInstructions.medium}
- FOCUS: ${focusInstructions[focus] || focusInstructions.general}

RULES:
1. Reference SPECIFIC details from their profile (bio, title, company, or recent activity).
2. NO generic "I'd love to connect" without context. Explain WHY based on their profile.
3. ${campaign ? 'ALIGN the message with the campaign goal and context. Make it relevant to why you\'re reaching out in this campaign.' : ''}
4. NO emojis.
5. Generate ONLY the message body. No "Hi [Name]," prefix (I'll add it). No quotes.`;

            console.log(`   📡 Calling ${AI_PROVIDER.toUpperCase()} (tone=${tone}, length=${length}, focus=${focus})...`);

            let message = await this.callAI(prompt, length === 'short' ? 150 : 350, 0.8);

            if (!message || typeof message !== 'string') message = '';
            message = message.trim();
            if (!message.toLowerCase().startsWith('hi ') && !message.toLowerCase().startsWith('hello ')) {
                message = `Hi ${lead.first_name}, ${message}`;
            }

            const maxLen = length === 'short' ? 300 : 600;
            if (message.length > maxLen) {
                const sentences = message.match(/[^.!?]+[.!?]+/g);
                if (sentences && sentences.length > 1) {
                    let truncated = '';
                    for (const s of sentences) {
                        if ((truncated + s).length <= maxLen - 3) truncated += s;
                        else break;
                    }
                    message = (truncated.trim() || message.substring(0, maxLen - 3)) + '...';
                } else {
                    message = message.substring(0, maxLen - 3) + '...';
                }
            }

            console.log(`   ✅ AI call successful (${message.length} chars)`);
            return message;
        } catch (error) {
            console.error('❌ AI Connection Request Error:', error.message);
            if (error.response) {
                console.error('AI API Response:', error.response.status, error.response.data);
            }
            if (error.code === 'insufficient_quota') {
                console.warn('   ⚠️ API quota exceeded. Returning fallback — edit and send.');
            } else if (error.message && (error.message.includes('API key') || error.message.includes('401') || error.message.includes('429'))) {
                console.warn('   ⚠️ API key or rate limit issue. Returning fallback — edit and send.');
            }
            return this.getFallbackConnectionMessage(lead, enrichment);
        }
    }

    /**
     * Generates a personalized follow-up message
     * @param {Object} lead - Lead information
     * @param {Object} enrichment - Enriched profile data (optional)
     * @param {Array} previousMessages - Previous messages sent to this lead
     * @param {Object} options - Personalization options including campaign context
     * @param {string} [options.tone] - professional | friendly | casual | formal | warm
     * @param {string} [options.length] - short | medium | long
     * @param {string} [options.focus] - recent_post | company | role | mutual_connection | general
     * @param {Object} [options.campaign] - Campaign details (goal, type, description, target_audience)
     */
    static async generateFollowUpMessage(lead, enrichment = null, previousMessages = [], options = {}) {
        const tone = options.tone || 'professional';
        const length = options.length || 'medium';
        const focus = options.focus || 'general';
        const campaign = options.campaign || null;

        try {
            if (!this.isConfigured()) {
                console.warn(`⚠️ ${AI_PROVIDER.toUpperCase()} not configured, using personalized template`);
                // Even without AI, use enrichment data to personalize
                if (enrichment && enrichment.bio) {
                    const bioSnippet = enrichment.bio.substring(0, 80);
                    return `Hi ${lead.first_name}, following up on my previous message. I saw your recent work in ${enrichment.interests?.[0] || lead.title || 'your field'} and thought you might find this relevant. Would love to hear your thoughts!`;
                }
                return `Hi ${lead.first_name}, following up on my previous message. Would love to hear your thoughts!`;
            }

            // Build rich prompt with all available data
            let enrichmentContext = '';
            let hasEnrichmentData = false;

            if (enrichment) {
                hasEnrichmentData = true;
                if (enrichment.bio && enrichment.bio.trim().length > 0) {
                    enrichmentContext += `\n\nProfile Bio (USE THIS for personalization):\n${enrichment.bio}`;
                    console.log(`      Bio available: ${enrichment.bio.substring(0, 60)}...`);
                }
                if (enrichment.interests && Array.isArray(enrichment.interests) && enrichment.interests.length > 0) {
                    enrichmentContext += `\n\nInterests/Skills (REFERENCE THESE):\n${enrichment.interests.slice(0, 10).join(', ')}`;
                    console.log(`      Interests: ${enrichment.interests.slice(0, 5).join(', ')}`);
                }
                if (enrichment.recent_posts && Array.isArray(enrichment.recent_posts) && enrichment.recent_posts.length > 0) {
                    enrichmentContext += `\n\nRecent Activity/Posts (MENTION IF RELEVANT):`;
                    enrichment.recent_posts.slice(0, 3).forEach((post, idx) => {
                        const postText = post.title || post.text || JSON.stringify(post);
                        enrichmentContext += `\n${idx + 1}. ${postText.substring(0, 250)}`;
                    });
                    console.log(`      Recent posts: ${enrichment.recent_posts.length} items`);
                }
            }

            if (!hasEnrichmentData || enrichmentContext.trim().length === 0) {
                console.log(`      ⚠️  No enrichment data available - will use basic lead info only`);
            }

            // Build campaign context
            let campaignContext = '';
            if (campaign) {
                campaignContext = '\n\nCAMPAIGN CONTEXT (ALIGN YOUR MESSAGE WITH THIS):';
                if (campaign.goal) {
                    campaignContext += `\n- Campaign Goal: ${campaign.goal}`;
                }
                if (campaign.type) {
                    campaignContext += `\n- Campaign Type: ${campaign.type}`;
                }
                if (campaign.description) {
                    campaignContext += `\n- Campaign Description: ${campaign.description}`;
                }
                if (campaign.target_audience) {
                    campaignContext += `\n- Target Audience: ${campaign.target_audience}`;
                }
                console.log(`      Campaign context: ${campaign.goal || 'N/A'} - ${campaign.type || 'N/A'}`);
            }

            const toneInstructions = {
                professional: 'Professional and polished. Respectful, clear, no slang.',
                friendly: 'Warm and approachable. Conversational but still professional.',
                casual: 'Relaxed and conversational. Slightly informal, human touch.',
                formal: 'Formal and businesslike. Best for senior/executive contacts.',
                warm: 'Warm and personable. Show genuine interest and enthusiasm.'
            };
            const lengthInstructions = {
                short: '2-3 sentences only. Target 150-250 characters. Be concise.',
                medium: '3-5 sentences. Target 400-600 characters. Balanced.',
                long: '4-6 sentences. Target 500-800 characters. More detail.'
            };
            const focusInstructions = {
                recent_post: 'Reference or mention their recent post/activity if available. Show you saw it.',
                company: 'Focus on their company and role there. Why their company/industry interests you.',
                role: 'Focus on their job title and expertise. Tie to your shared domain.',
                mutual_connection: 'If you have mutual connections, you can reference shared context (keep it natural).',
                general: 'Use a mix of their bio, title, and company. Balanced personalization.'
            };

            const prompt = `You are writing a personalized LinkedIn follow-up message. Generate a DETAILED, UNIQUE message that shows you've researched this person and are providing genuine value, while aligning with the campaign goals.

Lead Information:
- Name: ${lead.full_name}
- Title: ${lead.title || 'N/A'}
- Company: ${lead.company || 'N/A'}${enrichmentContext}${campaignContext}

${previousMessages.length > 0 ? `\nPrevious Messages Sent:\n${previousMessages.join('\n---\n')}\n\nBuild on these previous messages naturally.` : ''}

PERSONALIZATION (follow these):
- TONE: ${toneInstructions[tone] || toneInstructions.professional}
- LENGTH: ${lengthInstructions[length] || lengthInstructions.medium}
- FOCUS: ${focusInstructions[focus] || focusInstructions.general}

CRITICAL REQUIREMENTS:
1. Reference SPECIFIC details from their profile - their bio, recent posts, interests, or work. Show you've been following their activity.
2. Provide genuine value or insight related to THEIR specific background or recent activity, not generic advice.
3. ${campaign ? 'ALIGN the message with the campaign goal and context. Make it relevant to why you\'re reaching out in this campaign and what you\'re trying to achieve.' : ''}
4. Make it UNIQUE - each message must be completely different based on what's unique about this person.
5. Show genuine interest in their work and demonstrate you've researched them.
6. NO generic follow-up phrases. Instead, reference something specific from their profile or recent activity.
7. NO emojis.
8. Generate ONLY the message body. No "Hi [Name]," prefix (I'll add it). No quotes.

Example of what NOT to write:
"Hi John, just following up on my previous message. Would love to hear your thoughts!"

Example of what TO write:
"Hi John, I noticed your recent post about the future of AI in healthcare, and it got me thinking about the challenges you mentioned around data privacy. In my experience working with similar projects, I've found that implementing federated learning approaches can address some of those concerns while maintaining patient confidentiality. I'd love to hear your perspective on this, especially given your background in healthcare technology. Would you be open to a quick conversation about this?"

Generate ONLY the message text, no quotes, no "Hi [Name]," prefix (I'll add that), just the message content.`;

            console.log(`   📡 Calling ${AI_PROVIDER.toUpperCase()} API (follow-up message, tone=${tone}, length=${length}, focus=${focus})...`);
            console.log(`      Enrichment data available: ${enrichment ? 'Yes' : 'No'}`);

            const maxTokens = length === 'short' ? 150 : length === 'long' ? 400 : 300;
            let message = await this.callAI(prompt, maxTokens, 0.85);

            // Add greeting if not present
            if (!message.toLowerCase().startsWith('hi ') && !message.toLowerCase().startsWith('hello ')) {
                message = `Hi ${lead.first_name}, ${message}`;
            }

            // Ensure reasonable length based on selected length option
            const maxLen = length === 'short' ? 300 : length === 'long' ? 800 : 600;
            if (message.length > maxLen) {
                // Try to cut at sentence boundary
                const sentences = message.match(/[^.!?]+[.!?]+/g);
                if (sentences && sentences.length > 1) {
                    let truncated = '';
                    for (const sentence of sentences) {
                        if ((truncated + sentence).length <= maxLen - 3) {
                            truncated += sentence;
                        } else {
                            break;
                        }
                    }
                    message = truncated.trim() || message.substring(0, maxLen - 3) + '...';
                } else {
                    message = message.substring(0, maxLen - 3) + '...';
                }
            }

            console.log(`   ✅ AI call successful (${message.length} chars)`);
            return message;
        } catch (error) {
            console.error('❌ AI Follow-up Message Error:', error.message);
            if (error.response) {
                console.error('AI API Response Error:', error.response.status, error.response.data);
            }
            if (error.code) {
                console.error('AI API Error Code:', error.code);
                if (error.code === 'insufficient_quota') {
                    throw new Error('AI API quota exceeded. Please check your account billing.');
                }
            }
            // Return fallback message
            return `Hi ${lead.first_name}, following up on my previous message. Would love to connect!`;
        }
    }

    /**
     * Generates a thought-leadership LinkedIn post from an article
     */
    static async generateThoughtLeadershipPost(article) {
        try {
            if (!this.isConfigured()) {
                console.warn(`⚠️ ${AI_PROVIDER.toUpperCase()} not configured, using template`);
                return `Interesting article: ${article.original_title}\n\n${article.source_url}\n\n#Leadership #Industry`;
            }

            const prompt = `Create a thought-leadership LinkedIn post based on this article.

Article Title: ${article.original_title}
Article URL: ${article.source_url}
${article.summary ? `Summary: ${article.summary}` : ''}

Requirements:
- Share your perspective on the topic
- Explain what it means for the industry
- Discuss potential impact or implications
- Professional yet engaging tone
- 200-300 words
- Include 3-5 relevant hashtags at the end
- Make it feel authentic and personal, not robotic
- Start with a hook that grabs attention

Generate ONLY the post text, no quotes or extra formatting.`;

            return await this.callAI(prompt, 500, 0.8);
        } catch (error) {
            console.error('❌ AI Post Generation Error:', error.message);
            return `Interesting insights from this article: ${article.original_title}\n\nRead more: ${article.source_url}\n\n#Industry #Insights`;
        }
    }

    /**
     * Generates a personalized message based on lead data and template
     * (Legacy method - enhanced with real AI)
     * @param {number} leadId - Lead ID
     * @param {string} template - Template string (optional)
     * @param {string} stepType - Step type (connection_request, message, follow_up)
     * @param {Object} campaignContext - Campaign context (optional)
     */
    static async generatePersonalizedMessage(leadId, template, stepType = 'message', campaignContext = null) {
        try {
            // 1. Fetch Lead & Enrichment Data
            const leadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
            const lead = leadResult.rows[0];

            if (!lead) {
                throw new Error('Lead not found');
            }

            const enrichmentResult = await pool.query("SELECT * FROM lead_enrichment WHERE lead_id = $1", [leadId]);
            const enrichment = enrichmentResult.rows[0];

            console.log(`   📋 Generating ${stepType} for: ${lead.first_name} ${lead.last_name}`);
            console.log(`      Enrichment: ${enrichment ? 'Available' : 'Not available'}`);
            console.log(`      Campaign context: ${campaignContext ? 'Available' : 'Not available'}`);
            console.log(`      AI Provider: ${this.isConfigured() ? AI_PROVIDER.toUpperCase() : 'Not configured (using template)'}`);

            // 2. Use AI based on step type
            let message = '';
            try {
                const options = campaignContext ? { campaign: campaignContext } : {};
                if (stepType === 'connection_request') {
                    message = await this.generateConnectionRequest(lead, enrichment, options);
                } else if (stepType === 'message' || stepType === 'follow_up') {
                    message = await this.generateFollowUpMessage(lead, enrichment, [], options);
                } else {
                    // Fallback to template replacement
                    message = template || '';
                    message = message.replace(/\{firstName\}/g, lead.first_name || "there");
                    message = message.replace(/\{lastName\}/g, lead.last_name || "");
                    message = message.replace(/\{fullName\}/g, lead.full_name || "there");
                    message = message.replace(/\{company\}/g, lead.company || "your company");
                    message = message.replace(/\{title\}/g, lead.title || "your role");
                }
            } catch (aiError) {
                console.error(`❌ Error during AI generation for ${stepType}:`, aiError.message);
                // Continue to fallback below
            }

            // Ensure we always return a message
            if (!message || message.trim().length === 0) {
                console.warn(`⚠️ Generated empty message, using fallback`);
                if (stepType === 'connection_request') {
                    message = `Hi ${lead.first_name}, I'd love to connect and explore potential synergies between our work.`;
                } else {
                    message = `Hi ${lead.first_name}, I hope this message finds you well. I'd love to connect and discuss how we might work together.`;
                }
            }

            console.log(`   ✅ Generated message (${message.length} chars)`);
            return message;
        } catch (error) {
            console.error("❌ AI Generation Error:", error.message);
            console.error("Error stack:", error.stack);

            // Always return a fallback message
            const leadResult = await pool.query("SELECT * FROM leads WHERE id = $1", [leadId]);
            const lead = leadResult.rows[0];

            if (stepType === 'connection_request') {
                return `Hi ${lead?.first_name || 'there'}, I'd love to connect and explore potential synergies between our work.`;
            } else {
                return `Hi ${lead?.first_name || 'there'}, I hope this message finds you well. I'd love to connect and discuss how we might work together.`;
            }
        }
    }

    /**
     * Generate email content for failover
     */
    static async generateEmailFailover(lead, enrichment = null, linkedinMessages = []) {
        try {
            if (!this.isConfigured()) {
                return `Hi ${lead.first_name},\n\nI tried reaching out on LinkedIn but wanted to follow up via email.\n\nBest regards`;
            }

            const prompt = `Generate a professional email for LinkedIn failover.

Lead Information:
- Name: ${lead.full_name}
- Title: ${lead.title || 'N/A'}
- Company: ${lead.company || 'N/A'}

Context: We connected on LinkedIn but haven't received a response. This is a respectful follow-up via email.

Requirements:
- Professional email format
- Acknowledge the LinkedIn connection attempt
- Provide value or insight
- Clear call-to-action
- Respectful of their time
- 150-200 words

Generate ONLY the email body, no subject line.`;

            return await this.callAI(prompt, 300, 0.7);
        } catch (error) {
            console.error('❌ AI Email Generation Error:', error.message);
            return `Hi ${lead.first_name},\n\nI tried reaching out on LinkedIn but wanted to follow up via email.\n\nBest regards`;
        }
    }

    /**
     * Generate personalized email outreach (direct email, not failover)
     */
    async generateEmailOutreach(lead, enrichment = null, template = null) {
        try {
            // Build context about the lead
            let context = `Lead: ${lead.first_name} ${lead.last_name}
Title: ${lead.title || 'Unknown'}
Company: ${lead.company || 'Unknown'}`;

            if (enrichment) {
                if (enrichment.bio) context += `\nBio: ${enrichment.bio}`;
                if (enrichment.interests?.length > 0) {
                    context += `\nInterests: ${enrichment.interests.join(', ')}`;
                }
            }

            const prompt = `You are an expert at writing personalized, professional outreach emails.

${context}

Task: Write a compelling email to ${lead.first_name} that will get a response.

${template ? `Style guide/Template:\n${template}\n` : ''}

Requirements:
- Start with a personalized hook based on their background
- Show genuine interest in their work
- Provide clear value proposition
- Include a specific call-to-action
- Keep it conversational and human
- 120-180 words max
- Do NOT sound like a sales pitch
- Mention that you found their contact info and wanted to reach out directly

Generate ONLY the email body (no subject line).`;

            return await this.callAI(prompt, 300, 0.8);
        } catch (error) {
            console.error('❌ AI Email Outreach Generation Error:', error.message);
            return `Hi ${lead.first_name},\n\nI came across your profile and was impressed by your work at ${lead.company || 'your company'}. I'd love to connect and explore potential collaboration.\n\nWould you be open to a quick chat?\n\nBest regards`;
        }
    }

    /**
     * Generate personalized SMS message (max 160 chars)
     */
    async generateSMSOutreach(lead, enrichment = null) {
        try {
            const prompt = `Generate a short, personalized SMS message for ${lead.first_name} ${lead.last_name}, ${lead.title || 'professional'} at ${lead.company || 'their company'}.

Requirements:
- MAX 160 characters (strict limit)
- Friendly, not salesy
- Mention LinkedIn connection
- Clear CTA
- Professional but casual tone

Example good SMS:
"Hi John! Connected on LinkedIn - loved your recent post on AI. Quick q: open to chat about XYZ? -Mike"

Generate ONLY the SMS text, nothing else.`;

            const result = await this.callAI(prompt, 50, 0.9);
            // Ensure it's under 160 chars
            return result.substring(0, 160);
        } catch (error) {
            console.error('❌ AI SMS Generation Error:', error.message);
            return `Hi ${lead.first_name}! Saw your LinkedIn profile. Would love to connect. Can we chat?`;
        }
    }
}

export default AIService;
