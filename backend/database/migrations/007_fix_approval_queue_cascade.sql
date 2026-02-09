-- Fix approval_queue foreign key to cascade on delete
-- This allows campaigns to be deleted even when they have approval_queue entries

-- Find and drop the existing foreign key constraint (PostgreSQL auto-generates names)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint that references campaign_leads
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'approval_queue'::regclass
    AND contype = 'f'
    AND confrelid = 'campaign_leads'::regclass;
    
    -- Drop if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE approval_queue DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found to drop';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping constraint: %', SQLERRM;
END $$;

-- Re-add the foreign key with ON DELETE CASCADE
-- Only add if it doesn't already exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'approval_queue'::regclass 
        AND confrelid = 'campaign_leads'::regclass
        AND contype = 'f'
    ) THEN
        ALTER TABLE approval_queue 
        ADD CONSTRAINT approval_queue_campaign_id_lead_id_fkey 
        FOREIGN KEY (campaign_id, lead_id) 
        REFERENCES campaign_leads(campaign_id, lead_id) 
        ON DELETE CASCADE;
        RAISE NOTICE 'Added CASCADE constraint';
    ELSE
        RAISE NOTICE 'Constraint already exists with CASCADE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;
