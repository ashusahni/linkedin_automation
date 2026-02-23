-- Migration: Add email column to leads table if it doesn't exist
-- This ensures the email column is present for email failover functionality

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'leads' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE leads ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to leads table';
    ELSE
        RAISE NOTICE 'Email column already exists in leads table';
    END IF;
END $$;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
