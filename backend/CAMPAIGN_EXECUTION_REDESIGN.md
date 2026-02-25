# Campaign Execution Logic Redesign

## 1. Updated Campaign State Machine Design

To enforce strictly sequential campaign pipelines and prevent overlapping execution conflicts, the state machine for campaigns is updated to include the following states:

- **`idle`**: Campaign is created but has not been scheduled or queued.
- **`queued`**: Campaign is ready to run but is waiting because another campaign is currently running for the user.
- **`running`**: Active execution; pre-validations have passed, and synchronous steps are executing.
- **`waiting_phantom`**: Campaign execution is paused, waiting for the active Auto-Connection or Message Phantom to report completion via webhook.
- **`waiting_email`**: Campaign execution is paused, waiting for the email sending process to report delivery or failure.
- **`completed`**: The entire pipeline for all approved leads in the campaign has finished successfully.
- **`failed`**: The pipeline encountered a fatal error (e.g., rate limits exceeded indefinitely, Phantom failure without recovery).

### State Transitions:
1. `idle` -> Play Clicked -> Check `RUNNING` campaigns.
2. If `0` active -> `running` (Pre-validations passed).
3. If `> 0` active -> `queued`.
4. `running` -> Auto-Connection triggered -> `waiting_phantom`.
5. `waiting_phantom` -> Webhook Success -> `running` (proceeds to Message).
6. `running` -> Message triggered -> `waiting_phantom`.
7. `waiting_phantom` -> Webhook Success -> `running` (proceeds to Email).
8. `running` -> Email triggered -> `waiting_email`.
9. `waiting_email` -> Callback Success -> `completed` (or loops if multiple batches).

---

## 2. Updated Database Schema Changes

To support the updated status enumerations, usage quotas, and rate limits, the following database schema changes are required:

```sql
-- Update valid statuses for enum/check constraint (if existing, modify accordingly)
ALTER TABLE campaigns 
  DROP CONSTRAINT IF EXISTS valid_campaign_statuses;

-- Add rate limits for the campaign
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS user_id INTEGER, -- Assuming foreign key to users if multi-tenant
  ADD COLUMN IF NOT EXISTS max_connections_per_day INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_messages_per_day INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_emails_per_day INTEGER DEFAULT 150,
  ADD COLUMN IF NOT EXISTS email_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_approved BOOLEAN DEFAULT FALSE;

-- Ensure job queue for advanced feature
CREATE TABLE IF NOT EXISTS campaign_jobs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INTEGER, 
    status VARCHAR(50) DEFAULT 'queued', -- queued, running, completed, failed
    position_in_queue SERIAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

-- Index for queue sorting
CREATE INDEX IF NOT EXISTS idx_campaign_jobs_user_status 
  ON campaign_jobs(user_id, status, position_in_queue);
```

*(Note: Depending on how `status` is bounded historically, you may need a direct update script turning `'active'` into `'running'`)*

---

## 3. Orchestrator Service Pseudocode

**Goal**: Keep it entirely in the backend with strictly sequential progression. No parallel tasks internally.

```javascript
class CampaignOrchestratorService {
    
    // Step 1: Entry Point from API (Play Button)
    async startCampaign(campaignId, userId) {
        // SQL Lock Check - Concurrency Control
        const isRunning = await this.checkActiveCampaigns(userId);
        
        if (isRunning) {
             // Optional Advanced Feature: Queueing
             const job = await JobQueue.enqueue(campaignId, userId);
             return { 
                 status: 'queued', 
                 message: 'Another campaign is currently running. Please wait until it completes.',
                 position: job.position_in_queue
             };
        }

        // Run Pre-Execution Validation
        const validation = await this.validateExecution(campaignId);
        if (!validation.passed) {
            await this.markCampaignFailed(campaignId, validation.reason);
            throw new Error(validation.reason);
        }

        // Mark running
        await CampaignDb.updateStatus(campaignId, 'running');
        
        // Start sequential pipeline
        this.executePipelineNextStep(campaignId);
        
        return { status: 'running', message: 'Campaign started successfully.' };
    }

    async executePipelineNextStep(campaignId) {
        const campaign = await CampaignDb.getById(campaignId);
        const leads = await LeadsDb.getPendingLeadsByCampaign(campaignId);

        if (leads.length === 0) {
            await this.markCampaignCompleted(campaignId);
            return;
        }

        // We process in strictly sequential batches or lead-by-lead depending on phantom logic
        for (const lead of leads) {
            // Rate Limit Checks
            if (await this.isRateLimitReached(campaign)) {
                console.log(`Rate limits reached. Halting pipeline for campaign ${campaignId}.`);
                await CampaignDb.updateStatus(campaignId, 'paused'); // Will resume next day via cron
                return;
            }

            // Step 2: Auto-Connection Stage
            if (lead.connection_level !== '1st_degree') {
                await CampaignDb.updateStatus(campaignId, 'waiting_phantom');
                await PhantomService.triggerAutoConnection(lead);
                // Ends here. Expected to be resumed by Webhook listener.
                return; 
            }

            // Step 3: Messaging Stage
            if (campaign.message_approved) {
                await CampaignDb.updateStatus(campaignId, 'waiting_phantom');
                await PhantomService.triggerMessage(lead);
                // Ends here. Expected to be resumed by Webhook listener.
                return;
            }

            // Step 4: Email Stage
            if (campaign.email_approved) {
                await CampaignDb.updateStatus(campaignId, 'waiting_email');
                await EmailService.sendViaSendGrid(lead);
                // Ends here. Expected to be resumed by Webhook listener or async callback.
                return;
            }
        }
    }

    async handlePhantomWebhook(payload) {
        const { campaignId, status, error } = payload;
        
        if (status === 'error' || error) {
             await this.handleFailure(campaignId, error);
             return;
        }
        
        // Resume pipeline
        await CampaignDb.updateStatus(campaignId, 'running');
        await this.executePipelineNextStep(campaignId);
    }
    
    // ... Additional utility methods
}
```

---

## 4. SQL Locking Query

To securely restrict parallel execution for campaigns mapped to a user, the following SQL block prevents race conditions when starting a campaign. Standard Postgres row/table level locks or simple count validation handles this.

```sql
BEGIN;

-- Lock the user context to prevent race conditions during concurrent "Play" requests
SELECT pg_advisory_xact_lock(user_id) FROM users WHERE user_id = $1;

-- Check for running/waiting campaigns
DO $$
DECLARE
    active_count INT;
BEGIN
    SELECT COUNT(*) INTO active_count 
    FROM campaigns 
    WHERE user_id = $1 
      AND status IN ('running', 'waiting_phantom', 'waiting_email');
      
    IF active_count > 0 THEN
        RAISE EXCEPTION 'Concurrency conflict: User currently has a running campaign.';
    END IF;
END $$;

-- If no exception is thrown, proceed with setting the new campaign to running
UPDATE campaigns SET status = 'running' WHERE id = $2 AND user_id = $1;

COMMIT;
```

---

## 5. Queue Implementation Option

When a user attempts to start a second campaign, instead of blindly rejecting, we queue it.

**Implementation Steps:**
1. Insert request into `campaign_jobs` with status `queued`.
2. Return a 202 Accepted to the frontend indicating it is queued.
3. Upon any campaign hitting the `completed` or `failed` state, the orchestrator triggers an automatic check:
   ```javascript
   async function onCampaignEnd(userId) {
       const nextJob = await db.query(
           `SELECT * FROM campaign_jobs WHERE user_id = $1 AND status = 'queued' ORDER BY position_in_queue ASC LIMIT 1`
       );
       if (nextJob) {
           await Orchestrator.startCampaign(nextJob.campaign_id, userId);
           await db.query(`UPDATE campaign_jobs SET status = 'running' WHERE id = $1`, [nextJob.id]);
       }
   }
   ```

---

## 6. Failure Recovery Plan

The pipeline must not stay in a perpetual `waiting_phantom` or `waiting_email` state if an external service goes dark.

1. **Phantom Failure:**
   - On Phantom callback failure/timeout: 
     - Update campaign state to `failed` to release the execution lock.
     - Emit system log / user notification: _"Campaign failed: Phantom execution error."_
     - Release the queue so the next campaign can start (if Queuing is enabled).

2. **SendGrid Failure:**
   - Utilize a backoff retry interceptor directly inside `EmailService` (3 max retries with exponential backoff).
   - If after 3 times it fails, mark the specific lead pipeline as failed, report via webhook/callback listener, and transition the `campaign` status to `failed` (or drop the lead and continue the campaign based on the business rule).
   
3. **Dead-letter Checks (Cron):**
   - A cron job runs every 30 minutes.
   - Query: `SELECT id FROM campaigns WHERE status IN ('waiting_phantom', 'waiting_email') AND updated_at < NOW() - INTERVAL '2 hours'`
   - Force reset these orphaned campaigns to `failed` and unlock the user's slot.
