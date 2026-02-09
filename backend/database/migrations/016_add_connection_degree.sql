-- Add connection_degree column to leads table if it doesn't exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS connection_degree TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_connection_degree ON leads(connection_degree);

-- Add comment to document the column
COMMENT ON COLUMN leads.connection_degree IS 'LinkedIn connection degree: 1st, 2nd, or null/empty for non-connections';
