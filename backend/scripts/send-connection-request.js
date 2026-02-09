// Script to send a connection request to a LinkedIn profile
// Usage: node backend/scripts/send-connection-request.js

import 'dotenv/config';
import pool from '../src/db.js';
import phantomService from '../src/services/phantombuster.service.js';
import enrichmentService from '../src/services/enrichment.service.js';
import AIService from '../src/services/ai.service.js';
import { saveLead } from '../src/services/lead.service.js';

const LINKEDIN_URL = 'https://www.linkedin.com/in/iamsnehanshu/';
const PHANTOM_ID = '8856152304286634'; // Phantom Outreach ID

async function sendConnectionRequest() {
    try {
        console.log('\n🎯 === SENDING CONNECTION REQUEST ===\n');
        console.log(`📋 LinkedIn URL: ${LINKEDIN_URL}`);
        console.log(`🤖 Phantom ID: ${PHANTOM_ID}\n`);

        // Step 1: Check if lead exists, if not create it
        console.log('📊 Step 1: Checking if lead exists in database...');
        let leadResult = await pool.query(
            'SELECT * FROM leads WHERE linkedin_url = $1',
            [LINKEDIN_URL]
        );

        let lead;
        if (leadResult.rows.length === 0) {
            console.log('   ⚠️  Lead not found, creating new lead...');
            // First, try to enrich the profile to get basic info
            try {
                const enrichResult = await phantomService.enrichProfiles([LINKEDIN_URL]);
                if (enrichResult.data && enrichResult.data.length > 0) {
                    const profileData = enrichResult.data[0];
                    const parsedLead = {
                        linkedinUrl: LINKEDIN_URL,
                        firstName: profileData.firstName || profileData.scraperFirstName || null,
                        lastName: profileData.lastName || profileData.scraperLastName || null,
                        fullName: profileData.scraperFullName || profileData.fullName || 
                                 `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || 'Unknown',
                        title: profileData.title || profileData.headline || null,
                        company: profileData.company || profileData.companyName || null,
                        profileImage: profileData.profileImageUrl || profileData.imgUrl || null
                    };
                    lead = await saveLead(parsedLead);
                    if (lead) {
                        console.log(`   ✅ Lead created: ${lead.full_name} (ID: ${lead.id})`);
                    } else {
                        // If saveLead returned null (duplicate), fetch it
                        leadResult = await pool.query(
                            'SELECT * FROM leads WHERE linkedin_url = $1',
                            [LINKEDIN_URL]
                        );
                        lead = leadResult.rows[0];
                        console.log(`   ℹ️  Lead already exists: ${lead.full_name} (ID: ${lead.id})`);
                    }
                } else {
                    // Create minimal lead if enrichment fails
                    const minimalLead = {
                        linkedinUrl: LINKEDIN_URL,
                        fullName: 'Snehanshu',
                        firstName: 'Snehanshu'
                    };
                    lead = await saveLead(minimalLead);
                    if (!lead) {
                        leadResult = await pool.query(
                            'SELECT * FROM leads WHERE linkedin_url = $1',
                            [LINKEDIN_URL]
                        );
                        lead = leadResult.rows[0];
                    }
                    console.log(`   ✅ Minimal lead created: ${lead.full_name} (ID: ${lead.id})`);
                }
            } catch (enrichError) {
                console.log(`   ⚠️  Enrichment failed: ${enrichError.message}`);
                // Create minimal lead
                const minimalLead = {
                    linkedinUrl: LINKEDIN_URL,
                    fullName: 'Snehanshu',
                    firstName: 'Snehanshu'
                };
                lead = await saveLead(minimalLead);
                if (!lead) {
                    leadResult = await pool.query(
                        'SELECT * FROM leads WHERE linkedin_url = $1',
                        [LINKEDIN_URL]
                    );
                    lead = leadResult.rows[0];
                }
                console.log(`   ✅ Minimal lead created: ${lead.full_name} (ID: ${lead.id})`);
            }
        } else {
            lead = leadResult.rows[0];
            console.log(`   ✅ Lead found: ${lead.full_name} (ID: ${lead.id})`);
        }

        // Step 2: Enrich the lead to get detailed information
        console.log('\n🔍 Step 2: Enriching lead profile...');
        let enrichmentData = null;
        try {
            const enrichResult = await enrichmentService.enrichLead(lead.id);
            if (enrichResult && enrichResult.success) {
                enrichmentData = enrichResult.enrichmentData;
                console.log('   ✅ Enrichment completed');
                if (enrichmentData.bio) {
                    console.log(`   📝 Bio: ${enrichmentData.bio.substring(0, 100)}...`);
                }
                if (enrichmentData.interests && enrichmentData.interests.length > 0) {
                    console.log(`   🎯 Interests: ${enrichmentData.interests.slice(0, 5).join(', ')}`);
                }
            } else {
                // Try to get existing enrichment
                const dbEnrichment = await pool.query(
                    'SELECT * FROM lead_enrichment WHERE lead_id = $1',
                    [lead.id]
                );
                if (dbEnrichment.rows.length > 0) {
                    enrichmentData = {
                        bio: dbEnrichment.rows[0].bio,
                        interests: dbEnrichment.rows[0].interests,
                        recent_posts: dbEnrichment.rows[0].recent_posts
                    };
                    console.log('   ✅ Using existing enrichment data');
                } else {
                    console.log('   ⚠️  No enrichment data available');
                }
            }
        } catch (enrichError) {
            console.log(`   ⚠️  Enrichment error: ${enrichError.message}`);
            // Try to get existing enrichment
            const dbEnrichment = await pool.query(
                'SELECT * FROM lead_enrichment WHERE lead_id = $1',
                [lead.id]
            );
            if (dbEnrichment.rows.length > 0) {
                enrichmentData = {
                    bio: dbEnrichment.rows[0].bio,
                    interests: dbEnrichment.rows[0].interests,
                    recent_posts: dbEnrichment.rows[0].recent_posts
                };
                console.log('   ✅ Using existing enrichment data');
            }
        }

        // Step 3: Generate personalized connection request message
        console.log('\n🤖 Step 3: Generating personalized connection request message...');
        let message;
        try {
            message = await AIService.generateConnectionRequest(lead, enrichmentData);
            console.log(`   ✅ Message generated (${message.length} characters)`);
            console.log(`   📝 Message preview:\n   "${message.substring(0, 150)}..."\n`);
        } catch (aiError) {
            console.log(`   ⚠️  AI generation failed: ${aiError.message}`);
            // Fallback message with better personalization using enrichment data
            if (enrichmentData) {
                const firstName = lead.first_name || 'there';
                const title = lead.title || 'your field';
                const company = lead.company || 'your company';
                const bio = enrichmentData.bio || '';
                const interests = enrichmentData.interests || [];
                
                // Build a personalized message
                let personalizedParts = [];
                
                if (title) {
                    personalizedParts.push(`I noticed your work as a ${title}`);
                    if (company) {
                        personalizedParts.push(`at ${company}`);
                    }
                }
                
                if (bio && bio.length > 0) {
                    const bioSnippet = bio.substring(0, 120);
                    personalizedParts.push(`Your background in ${bioSnippet}...`);
                } else if (interests && interests.length > 0) {
                    const topInterests = interests.slice(0, 3).join(', ');
                    personalizedParts.push(`your expertise in ${topInterests}`);
                }
                
                if (personalizedParts.length > 0) {
                    message = `Hi ${firstName}, ${personalizedParts.join(' and ')} caught my attention. I'd love to connect and explore potential synergies between our work.`;
                } else {
                    message = `Hi ${firstName}, I came across your profile and was impressed by your professional background. I'd love to connect and explore how we might collaborate.`;
                }
            } else {
                message = `Hi ${lead.first_name || 'there'}, I hope this message finds you well. I came across your profile and would love to connect to explore potential opportunities for collaboration.`;
            }
            console.log(`   📝 Using fallback message (${message.length} characters)`);
        }

        // Step 4: Send connection request via PhantomBuster
        console.log('\n🚀 Step 4: Sending connection request via PhantomBuster...');
        console.log(`   Using Phantom ID: ${PHANTOM_ID}`);
        
        // Prepare profile object for autoConnect
        const profile = {
            linkedin_url: LINKEDIN_URL,
            full_name: lead.full_name,
            first_name: lead.first_name,
            last_name: lead.last_name
        };

        // Override the phantom ID in environment for this call
        const originalPhantomId = process.env.LINKEDIN_OUTREACH_PHANTOM_ID;
        process.env.LINKEDIN_OUTREACH_PHANTOM_ID = PHANTOM_ID;

        try {
            // Use autoConnect method which will use the environment variable
            const result = await phantomService.autoConnect([profile], [message]);
            
            console.log('\n✅ === CONNECTION REQUEST SENT ===');
            console.log(`   Container ID: ${result.containerId}`);
            console.log(`   Phantom ID: ${result.phantomId}`);
            console.log(`   Message: ${message.substring(0, 100)}...`);
            console.log('\n💡 Check PhantomBuster dashboard to monitor the connection request.');
            console.log(`   Container URL: https://phantombuster.com/containers/${result.containerId}\n`);
            console.log('📋 Full message:');
            console.log(`   "${message}"\n`);

            // Restore original phantom ID
            if (originalPhantomId) {
                process.env.LINKEDIN_OUTREACH_PHANTOM_ID = originalPhantomId;
            } else {
                delete process.env.LINKEDIN_OUTREACH_PHANTOM_ID;
            }

            return {
                success: true,
                containerId: result.containerId,
                phantomId: result.phantomId,
                message: message,
                leadId: lead.id
            };
        } catch (phantomError) {
            // Restore original phantom ID
            if (originalPhantomId) {
                process.env.LINKEDIN_OUTREACH_PHANTOM_ID = originalPhantomId;
            } else {
                delete process.env.LINKEDIN_OUTREACH_PHANTOM_ID;
            }
            throw phantomError;
        }

    } catch (error) {
        console.error('\n❌ === ERROR ===');
        console.error(`   ${error.message}`);
        if (error.code) {
            console.error(`   Error Code: ${error.code}`);
        }
        if (error.status) {
            console.error(`   Status: ${error.status}`);
        }
        
        // Provide helpful error messages
        if (error.status === 412) {
            console.error('\n💡 TROUBLESHOOTING:');
            console.error('   The PhantomBuster workflow is stopped and requires auto-launch to be enabled.');
            console.error('   To fix this:');
            console.error('   1. Go to https://phantombuster.com/');
            console.error(`   2. Find your phantom with ID: ${PHANTOM_ID}`);
            console.error('   3. Enable "Auto Launch" in the phantom settings');
            console.error('   4. Run this script again\n');
        }
        
        console.error('\n');
        process.exit(1);
    }
}

// Run the script
sendConnectionRequest()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
