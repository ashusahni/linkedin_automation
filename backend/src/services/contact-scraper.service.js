// Contact scraper service - REFACTORED for database-first, profile ID-based scraping
// Version 2.0 - Global cache with zero duplicate scraping
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import pool from '../db.js';
import { extractLinkedInProfileId, getProfileUrl, isValidLinkedInProfileId } from '../utils/linkedin.utils.js';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class ContactScraperService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.activeJobs = new Map();
        this.initialized = false;
    }

    async initialize(sessionCookie) {
        // Skip if already initialized with same session
        if (this.initialized && this.browser && this.sessionCookie === sessionCookie) {
            console.log('📌 Contact scraper already initialized with same session');
            return;
        }

        if (this.initialized && this.browser && this.sessionCookie !== sessionCookie) {
             console.log('hz Reloading contact scraper with new session cookie...');
        }

        console.log('🚀 Initializing contact scraper...');

        // Close existing browser if any
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (e) {
                // Ignore close errors
            }
        }

        this.browser = await puppeteer.launch({
            headless: process.env.SCRAPER_HEADLESS !== 'false', // Default to headless
            protocolTimeout: 300000, // 5 minutes - prevents "Page.navigate timed out" errors
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        this.page = await this.browser.newPage();

        // Set realistic viewport
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Set realistic user agent (use a more recent Chrome version)
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        );

        // Override webdriver property
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        // Override plugins
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
        });

        // Override languages
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });

        // Set extra headers
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });

        // 🆕 CRITICAL: Disable Puppeteer's default 30-second navigation timeout
        // This prevents "Navigation timeout of 30000 ms exceeded" errors
        await this.page.setDefaultNavigationTimeout(0);
        await this.page.setDefaultTimeout(0);

        // Set LinkedIn session cookie
        await this.page.setCookie({
            name: 'li_at',
            value: sessionCookie,
            domain: '.linkedin.com',
            path: '/',
            httpOnly: true,
            secure: true
        });

        // Navigate to LinkedIn to verify session
        // Strategy: Navigate to homepage first to establish session, then go to feed
        console.log('🌐 Navigating to LinkedIn homepage...');

        let navigationSuccess = false;
        let lastError = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // Step 1: Navigate to homepage first (less likely to trigger redirect loops)
                console.log(`   Attempt ${attempt}: Going to homepage...`);
                await this.page.goto('https://www.linkedin.com/', {
                    waitUntil: 'networkidle0',
                    timeout: 45000
                });

                // Wait for page to settle
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check current URL - LinkedIn might redirect us
                const currentUrl = this.page.url();
                console.log(`   Current URL: ${currentUrl}`);

                // If we're already on feed or logged in, great!
                if (currentUrl.includes('/feed/') || 
                    (!currentUrl.includes('/login') && !currentUrl.includes('/uas/login'))) {
                    console.log('   ✅ Already authenticated on homepage');
                    navigationSuccess = true;
                    break;
                }

                // Step 2: Try navigating to feed if we're on homepage
                if (currentUrl.includes('linkedin.com') && !currentUrl.includes('/login')) {
                    console.log('   Navigating to feed page...');
                    await this.page.goto('https://www.linkedin.com/feed/', {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    
                    // Wait a bit
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const feedUrl = this.page.url();
                    console.log(`   Feed URL: ${feedUrl}`);
                    
                    if (!feedUrl.includes('/login') && !feedUrl.includes('/uas/login')) {
                        navigationSuccess = true;
                        break;
                    }
                }

                // If we got here, navigation succeeded but might need to check login status
                navigationSuccess = true;
                break;

            } catch (error) {
                lastError = error;
                console.log(`⚠️  Navigation attempt ${attempt} failed: ${error.message}`);

                if (attempt < 3) {
                    console.log(`   🔄 Retrying in ${attempt * 2} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                } else {
                    console.error('❌ Failed to navigate to LinkedIn after 3 attempts');
                    throw new Error(`LinkedIn navigation failed: ${error.message}`);
                }
            }
        }

        if (!navigationSuccess) {
            throw new Error(`Failed to load LinkedIn: ${lastError?.message || 'Unknown error'}`);
        }

        // Wait a bit for page to settle
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if logged in
        const finalUrl = this.page.url();
        console.log(`   Final URL after navigation: ${finalUrl}`);
        
        const isLoggedIn = await this.page.evaluate(() => {
            return !window.location.href.includes('/login') &&
                !window.location.href.includes('/uas/login') &&
                !window.location.href.includes('/authwall');
        });

        if (!isLoggedIn) {
            console.error(`   ❌ Not logged in. Final URL: ${finalUrl}`);
            throw new Error('Failed to authenticate with LinkedIn. Check your session cookie - it may be expired or invalid.');
        }

        this.sessionCookie = sessionCookie;
        this.initialized = true;
        console.log('✅ Contact scraper initialized and authenticated');
    }

    /**
     * 🆕 NEW: Scrape contacts for approved leads (approval trigger)
     * This is called automatically after bulk approval
     */
    async scrapeApprovedLeads(leadIds) {
        const jobId = `scrape_approval_${Date.now()}`;
        console.log(`\n🎯 ============================================`);
        console.log(`🎯 APPROVAL-TRIGGERED SCRAPING`);
        console.log(`🎯 Job ID: ${jobId}`);
        console.log(`🎯 Leads: ${leadIds.length}`);
        console.log(`🎯 ============================================\n`);

        // Get profile IDs for these leads
        const result = await pool.query(`
            SELECT id, linkedin_url, linkedin_profile_id, first_name, last_name
            FROM leads
            WHERE id = ANY($1)
              AND linkedin_url IS NOT NULL
        `, [leadIds]);

        const leads = result.rows;
        console.log(`📋 Found ${leads.length} leads with LinkedIn URLs`);

        // Extract/update profile IDs if missing
        const profileIdsToScrape = [];
        for (const lead of leads) {
            let profileId = lead.linkedin_profile_id;
            console.log(`\n🔍 Processing Lead ID ${lead.id}:`);
            console.log(`   URL: ${lead.linkedin_url}`);
            console.log(`   Existing Profile ID: ${profileId || 'NULL'}`);

            // If profile ID is missing, extract it
            if (!profileId && lead.linkedin_url) {
                profileId = extractLinkedInProfileId(lead.linkedin_url);
                console.log(`   Extracted Profile ID: ${profileId || 'FAILED'}`);
                if (profileId) {
                    // Update the lead with the profile ID
                    await pool.query(
                        'UPDATE leads SET linkedin_profile_id = $1 WHERE id = $2',
                        [profileId, lead.id]
                    );
                    console.log(`   ✅ Updated lead with profile ID`);
                } else {
                    console.log(`   ❌ Failed to extract profile ID from URL`);
                }
            }

            if (profileId) {
                const isValid = isValidLinkedInProfileId(profileId);
                console.log(`   Validation: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
                if (isValid) {
                    profileIdsToScrape.push(profileId);
                    console.log(`   ✅ Added to scrape list`);
                } else {
                    console.log(`   ❌ Profile ID failed validation: "${profileId}"`);
                }
            } else {
                console.log(`   ❌ No profile ID available`);
            }
        }

        if (profileIdsToScrape.length === 0) {
            console.log('\n⚠️  No valid LinkedIn profile IDs found');
            console.log('   Possible reasons:');
            console.log('   1. LinkedIn URLs are invalid or malformed');
            console.log('   2. URLs don\'t match pattern: linkedin.com/in/{profile-id}');
            console.log('   3. Extracted profile IDs failed validation');
            return { jobId, message: 'No valid profiles to scrape' };
        }

        // Trigger scraping (runs in background)
        return await this.scrapeProfiles(profileIdsToScrape, {
            jobId,
            jobType: 'approval_trigger',
            campaignId: null
        });
    }

    /**
     * 🆕 REFACTORED: Campaign-based scraping (manual trigger)
     * Now uses global profile ID-based logic
     */
    async scrapeCampaignContacts(campaignId, leadIds = null) {
        const jobId = `scrape_campaign_${Date.now()}`;

        console.log(`\n🔍 ============================================`);
        console.log(`🔍 CAMPAIGN SCRAPING - Campaign ${campaignId}`);
        console.log(`🔍 Job ID: ${jobId}`);
        console.log(`🔍 ============================================\n`);

        // Check for existing running job for this campaign
        const existingJob = Array.from(this.activeJobs.values()).find(
            job => job.campaignId === campaignId && job.status === 'running'
        );

        if (existingJob) {
            console.log(`⚠️  Found existing job for campaign ${campaignId}, cancelling it...`);
            existingJob.status = 'cancelled';
            existingJob.cancelledAt = new Date();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get leads from campaign
        let query = `
            SELECT l.id, l.linkedin_url, l.linkedin_profile_id, l.first_name, l.last_name
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = $1
              AND l.linkedin_url IS NOT NULL
        `;
        const params = [campaignId];

        if (leadIds && Array.isArray(leadIds) && leadIds.length > 0) {
            query += ` AND l.id = ANY($2::int[])`;
            params.push(leadIds);
        }

        const result = await pool.query(query, params);
        const leads = result.rows;

        // Extract profile IDs
        const profileIdsToScrape = [];
        for (const lead of leads) {
            let profileId = lead.linkedin_profile_id;

            if (!profileId && lead.linkedin_url) {
                profileId = extractLinkedInProfileId(lead.linkedin_url);
                if (profileId) {
                    await pool.query(
                        'UPDATE leads SET linkedin_profile_id = $1 WHERE id = $2',
                        [profileId, lead.id]
                    );
                }
            }

            if (profileId && isValidLinkedInProfileId(profileId)) {
                profileIdsToScrape.push(profileId);
            }
        }

        if (profileIdsToScrape.length === 0) {
            return {
                jobId,
                alreadyComplete: true,
                message: 'No valid profiles to scrape',
                stats: { total: 0, needsScraping: 0 }
            };
        }

        // Trigger scraping
        return await this.scrapeProfiles(profileIdsToScrape, {
            jobId,
            jobType: 'campaign_manual',
            campaignId
        });
    }

    /**
     * 🆕 CORE FUNCTION: Database-first profile scraping
     * This is the heart of the new system
     */
    async scrapeProfiles(profileIds, options = {}) {
        const {
            jobId = `scrape_${Date.now()}`,
            jobType = 'manual',
            campaignId = null
        } = options;

        // STEP 1: Check scraped_contacts cache (DATABASE FIRST!)
        console.log(`\n📊 Step 1: Checking global cache for ${profileIds.length} profiles...`);

        const cacheCheck = await pool.query(`
            SELECT linkedin_profile_id, email, phone, scrape_status, scrape_attempts
            FROM scraped_contacts
            WHERE linkedin_profile_id = ANY($1)
        `, [profileIds]);

        const cachedProfiles = new Map();
        for (const row of cacheCheck.rows) {
            cachedProfiles.set(row.linkedin_profile_id, row);
        }

        // Separate profiles into: cached vs need scraping
        const needScraping = [];
        const alreadyCached = [];

        for (const profileId of profileIds) {
            const cached = cachedProfiles.get(profileId);
            if (cached) {
                alreadyCached.push({ profileId, ...cached });
            } else {
                needScraping.push(profileId);
            }
        }

        console.log(`   ✅ Already in cache: ${alreadyCached.length}`);
        console.log(`   🔍 Need scraping: ${needScraping.length}`);

        // If all profiles are cached, return immediately
        if (needScraping.length === 0) {
            console.log(`\n✅ All ${profileIds.length} profiles already in cache!`);

            // Sync cached data to leads table
            await this.syncCacheToLeads(alreadyCached);

            return {
                jobId,
                alreadyComplete: true,
                message: `All ${profileIds.length} profiles already have contact info`,
                stats: {
                    total: profileIds.length,
                    cached: alreadyCached.length,
                    needsScraping: 0
                }
            };
        }

        // STEP 2: Create scraping job in database
        await pool.query(`
            INSERT INTO scraping_jobs (job_id, job_type, campaign_id, total_profiles, skipped_profiles, status)
            VALUES ($1, $2, $3, $4, $5, 'running')
        `, [jobId, jobType, campaignId, profileIds.length, alreadyCached.length]);

        // STEP 3: Create in-memory job tracking
        this.activeJobs.set(jobId, {
            campaignId,
            jobType,
            status: 'running',
            total: needScraping.length,
            processed: 0,
            found: 0,
            failed: 0,
            skipped: alreadyCached.length,
            startTime: new Date(),
            cancelled: false
        });

        // STEP 4: Run scraping in background
        this.runScrapeJob(jobId, needScraping).catch(error => {
            console.error('Scrape job error:', error);
            const job = this.activeJobs.get(jobId);
            if (job) {
                job.status = 'error';
                job.error = error.message;
            }
        });

        // Sync already-cached profiles to leads table immediately
        if (alreadyCached.length > 0) {
            await this.syncCacheToLeads(alreadyCached);
        }

        return {
            jobId,
            needsScraping: needScraping.length,
            alreadyCached: alreadyCached.length,
            message: `Scraping ${needScraping.length} new profiles (${alreadyCached.length} already cached)`
        };
    }

    /**
     * 🆕 NEW: Sync cached contact data to leads table
     */
    async syncCacheToLeads(cachedProfiles) {
        for (const profile of cachedProfiles) {
            if (profile.email || profile.phone) {
                await pool.query(`
                    UPDATE leads
                    SET email = COALESCE(email, $1),
                        phone = COALESCE(phone, $2),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE linkedin_profile_id = $3
                      AND (email IS NULL OR phone IS NULL)
                `, [profile.email, profile.phone, profile.profileId]);
            }
        }
    }

    /**
     * 🆕 REFACTORED: Run scraping job with fault tolerance and retry logic
     */
    async runScrapeJob(jobId, profileIds) {
        const job = this.activeJobs.get(jobId);

        try {
            console.log(`\n🎯 Starting scrape: ${profileIds.length} profiles need contact info`);

            // Process each profile
            for (let i = 0; i < profileIds.length; i++) {
                // Check if job was cancelled
                if (job.cancelled || job.status === 'cancelled') {
                    console.log(`\n🛑 Job cancelled at ${job.processed}/${job.total} profiles`);
                    await pool.query(
                        `UPDATE scraping_jobs SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE job_id = $1`,
                        [jobId]
                    );
                    return;
                }

                const profileId = profileIds[i];
                console.log(`\n[${i + 1}/${profileIds.length}] Processing: ${profileId}`);

                // Extract contact info with retry logic
                const contactInfo = await this.extractContactInfoWithRetry(profileId);

                // Check cancellation again after slow operation
                if (job.cancelled || job.status === 'cancelled') {
                    console.log(`\n🛑 Job cancelled during extraction`);
                    await pool.query(
                        `UPDATE scraping_jobs SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE job_id = $1`,
                        [jobId]
                    );
                    return;
                }

                // Store in global cache (scraped_contacts table)
                await this.storeInCache(profileId, contactInfo);

                // Update job stats
                if (contactInfo.email || contactInfo.phone) {
                    job.found++;
                } else if (contactInfo.status === 'failed') {
                    job.failed++;
                }

                job.processed++;

                // Update database job progress
                await pool.query(`
                    UPDATE scraping_jobs
                    SET processed_profiles = $1,
                        found_contacts = $2,
                        failed_profiles = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE job_id = $4
                `, [job.processed, job.found, job.failed, jobId]);

                // Random delay between profiles (check cancellation during delay)
                const delayTime = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
                for (let d = 0; d < delayTime; d += 500) {
                    if (job.cancelled || job.status === 'cancelled') {
                        console.log(`\n🛑 Job cancelled during delay`);
                        await pool.query(
                            `UPDATE scraping_jobs SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE job_id = $1`,
                            [jobId]
                        );
                        return;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            job.status = 'completed';
            await pool.query(
                `UPDATE scraping_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE job_id = $1`,
                [jobId]
            );

            console.log(`\n✅ Scraping completed successfully!`);
            console.log(`   Total processed: ${job.processed}/${job.total}`);
            console.log(`   Contacts found: ${job.found}`);
            console.log(`   Failed: ${job.failed}`);
            console.log(`   Skipped (cached): ${job.skipped}`);

        } catch (error) {
            if (job.status !== 'cancelled') {
                job.status = 'error';
                job.error = error.message;
                await pool.query(
                    `UPDATE scraping_jobs SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE job_id = $2`,
                    [error.message, jobId]
                );
                console.error('Scrape job failed:', error);
            }
        }
    }

    /**
     * 🆕 NEW: Extract contact info with retry logic
     */
    async extractContactInfoWithRetry(profileId, maxRetries = 1) {
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                const profileUrl = getProfileUrl(profileId);
                const contactInfo = await this.extractContactInfo(profileUrl);

                // Success!
                return {
                    ...contactInfo,
                    status: 'success',
                    attempts: attempt
                };
            } catch (error) {
                lastError = error;
                console.error(`   ❌ Attempt ${attempt} failed: ${error.message}`);

                if (attempt <= maxRetries) {
                    console.log(`   🔄 Retrying in 3 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        // All retries failed - return NA status
        console.log(`   ⚠️  All ${maxRetries + 1} attempts failed, marking as NA`);
        return {
            email: null,
            phone: null,
            birthday: null,
            website: null,
            status: 'failed',
            error: lastError?.message,
            attempts: maxRetries + 1
        };
    }

    /**
     * 🆕 NEW: Store contact info in global cache
     */
    async storeInCache(profileId, contactInfo) {
        const scrapeStatus = contactInfo.status === 'failed' ? 'failed' :
            (contactInfo.email || contactInfo.phone) ? 'success' : 'na';

        await pool.query(`
            INSERT INTO scraped_contacts (
                linkedin_profile_id,
                email,
                phone,
                birthday,
                website,
                scrape_status,
                scrape_attempts,
                last_error
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (linkedin_profile_id) DO UPDATE SET
                email = COALESCE(EXCLUDED.email, scraped_contacts.email),
                phone = COALESCE(EXCLUDED.phone, scraped_contacts.phone),
                birthday = COALESCE(EXCLUDED.birthday, scraped_contacts.birthday),
                website = COALESCE(EXCLUDED.website, scraped_contacts.website),
                scrape_status = EXCLUDED.scrape_status,
                scrape_attempts = scraped_contacts.scrape_attempts + 1,
                last_scraped_at = CURRENT_TIMESTAMP,
                last_error = EXCLUDED.last_error,
                updated_at = CURRENT_TIMESTAMP
        `, [
            profileId,
            contactInfo.email,
            contactInfo.phone,
            contactInfo.birthday,
            contactInfo.website,
            scrapeStatus,
            contactInfo.attempts || 1,
            contactInfo.error || null
        ]);

        console.log(`   💾 Stored in cache: ${profileId} (${scrapeStatus})`);
    }

    /**
     * ✅ KEPT: Original extraction logic (works well)
     */
    async extractContactInfo(profileUrl) {
        try {
            console.log(`\n📄 Processing: ${profileUrl}`);

            // Check if page is still attached
            if (!this.page || this.page.isClosed()) {
                throw new Error('Browser page is closed or detached. Reinitialize the scraper.');
            }

            // Navigate to profile with increased timeout
            await this.page.goto(profileUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait for page to load
            await this.page.waitForSelector('main').catch(() => {
                console.log('   ⚠️  Main content slow to load, continuing anyway...');
            });

            // Wait a bit for page to fully render
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Click Contact Info button
            console.log('   🔍 Looking for Contact Info button...');
            const clicked = await this.page.evaluate(() => {
                // Method 1: Find by href containing 'contact-info'
                const contactLinks = Array.from(document.querySelectorAll('a'));
                const contactLink = contactLinks.find(link =>
                    link.href && link.href.includes('contact-info')
                );

                if (contactLink) {
                    contactLink.click();
                    return true;
                }

                // Method 2: Find by text content
                const textLink = contactLinks.find(link =>
                    link.textContent.toLowerCase().includes('contact info')
                );

                if (textLink) {
                    textLink.click();
                    return true;
                }

                return false;
            });

            if (!clicked) {
                console.log('   ⚠️  Contact Info button not found');
                return { email: null, phone: null, birthday: null, website: null };
            }

            console.log('   ✅ Contact Info button clicked');

            // Wait for modal to appear
            await this.page.waitForSelector('[role="dialog"]').catch(() => { });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Extract data from modal
            const contactData = await this.page.evaluate(() => {
                const modal = document.querySelector('[role="dialog"]');
                if (!modal) return null;

                const data = {
                    email: null,
                    phone: null,
                    birthday: null,
                    website: null
                };

                // Extract email
                const emailSection = Array.from(modal.querySelectorAll('section')).find(
                    section => section.textContent.includes('Email') || section.textContent.includes('@')
                );
                if (emailSection) {
                    const emailLink = emailSection.querySelector('a[href^="mailto:"]');
                    if (emailLink) {
                        data.email = emailLink.href.replace('mailto:', '');
                    } else {
                        // Try to find email in text
                        const emailMatch = emailSection.textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
                        if (emailMatch) {
                            data.email = emailMatch[0];
                        }
                    }
                }

                // Extract phone
                const phoneSection = Array.from(modal.querySelectorAll('section')).find(
                    section => section.textContent.includes('Phone')
                );
                if (phoneSection) {
                    const phoneText = phoneSection.textContent;
                    const phoneMatch = phoneText.match(/\d[\d\s()-]+\d/);
                    if (phoneMatch) {
                        data.phone = phoneMatch[0].trim();
                    }
                }

                // Extract birthday
                const birthdaySection = Array.from(modal.querySelectorAll('section')).find(
                    section => section.textContent.includes('Birthday')
                );
                if (birthdaySection) {
                    const birthdayText = birthdaySection.textContent;
                    const birthdayMatch = birthdayText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/);
                    if (birthdayMatch) {
                        data.birthday = birthdayMatch[0];
                    }
                }

                // Extract website
                const websiteSection = Array.from(modal.querySelectorAll('section')).find(
                    section => section.textContent.includes('Website') || section.querySelector('a[href^="http"]')
                );
                if (websiteSection) {
                    const websiteLink = websiteSection.querySelector('a[href^="http"]');
                    if (websiteLink) {
                        data.website = websiteLink.href;
                    }
                }

                return data;
            });

            // Close modal
            await this.page.evaluate(() => {
                const closeButton = document.querySelector('[aria-label="Dismiss"]') ||
                    document.querySelector('[data-test-modal-close-btn]');
                if (closeButton) {
                    closeButton.click();
                }
            }).catch(() => { });

            await new Promise(resolve => setTimeout(resolve, 500));

            if (contactData) {
                console.log(`   ✅ Email: ${contactData.email || 'N/A'}`);
                console.log(`   ✅ Phone: ${contactData.phone || 'N/A'}`);
                if (contactData.birthday) console.log(`   ✅ Birthday: ${contactData.birthday}`);
                if (contactData.website) console.log(`   ✅ Website: ${contactData.website}`);
                return contactData;
            } else {
                console.log('   ⚠️  No contact data found');
                return { email: null, phone: null, birthday: null, website: null };
            }

        } catch (error) {
            console.error(`   ❌ Error extracting from ${profileUrl}:`, error.message);
            throw error; // Re-throw for retry logic
        }
    }

    /**
     * ✅ KEPT: Cancel job functionality
     */
    cancelJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job && job.status === 'running') {
            console.log(`🛑 Cancelling scrape job: ${jobId}`);
            job.cancelled = true;
            job.status = 'cancelled';
            job.cancelledAt = new Date();
            return true;
        }
        return false;
    }

    /**
     * ✅ KEPT: Get job status
     */
    getJobStatus(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            return { status: 'unknown' };
        }

        return {
            status: job.status,
            total: job.total,
            processed: job.processed,
            found: job.found,
            skipped: job.skipped || 0,
            failed: job.failed || 0,
            progress: job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
            error: job.error,
            elapsedMs: Date.now() - job.startTime.getTime(),
            cancelled: job.cancelled || false,
            cancelledAt: job.cancelledAt
        };
    }

    /**
     * 🆕 NEW: Get global scraping progress (all active jobs)
     */
    async getGlobalProgress() {
        const result = await pool.query(`SELECT * FROM get_active_scraping_progress()`);
        return result.rows[0] || {
            total_profiles: 0,
            processed_profiles: 0,
            progress_percentage: 0,
            active_jobs_count: 0
        };
    }

    /**
     * 🆕 NEW: Get overall scraping statistics
     */
    async getScrapingStats() {
        const result = await pool.query(`SELECT * FROM get_scraping_stats()`);
        return result.rows[0] || {
            total_profiles_scraped: 0,
            profiles_with_email: 0,
            profiles_with_phone: 0,
            profiles_with_both: 0,
            profiles_na: 0,
            profiles_failed: 0,
            success_rate: 0
        };
    }

    /**
     * ✅ KEPT: Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Singleton instance
const contactScraperService = new ContactScraperService();

export default contactScraperService;
