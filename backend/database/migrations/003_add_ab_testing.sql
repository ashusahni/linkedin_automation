-- Create sequence_variants table for A/B testing
CREATE TABLE IF NOT EXISTS sequence_variants (
    id SERIAL PRIMARY KEY,
    sequence_id INTEGER REFERENCES sequences(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- The message template
    weight INTEGER DEFAULT 50, -- For split testing (e.g., 50/50)
    is_active BOOLEAN DEFAULT TRUE,
    sent_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing content to the first variant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sequences' AND column_name='content') THEN
        INSERT INTO sequence_variants (sequence_id, content, weight)
        SELECT id, content, 100 FROM sequences WHERE content IS NOT NULL;
    END IF;
END $$;

-- Remove content column from sequences as it's now in variants
ALTER TABLE sequences DROP COLUMN IF EXISTS content;

-- Add variant tracking to campaign_leads
ALTER TABLE campaign_leads 
ADD COLUMN IF NOT EXISTS assigned_variant_id INTEGER REFERENCES sequence_variants(id);
