-- Add profile_image column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500);

-- Add index for better performance when filtering by image availability
CREATE INDEX IF NOT EXISTS idx_leads_profile_image ON leads(profile_image) WHERE profile_image IS NOT NULL;
