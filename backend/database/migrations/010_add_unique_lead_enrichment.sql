-- Add UNIQUE constraint to lead_enrichment.lead_id
-- This allows ON CONFLICT (lead_id) to work properly

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM lead_enrichment a
USING lead_enrichment b
WHERE a.id < b.id
AND a.lead_id = b.lead_id;

-- Now add the UNIQUE constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'lead_enrichment_lead_id_unique'
    ) THEN
        ALTER TABLE lead_enrichment 
        ADD CONSTRAINT lead_enrichment_lead_id_unique UNIQUE (lead_id);
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead_id ON lead_enrichment(lead_id);
