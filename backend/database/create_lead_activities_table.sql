-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'CONNECTION_REQUEST', 'MESSAGE', 'STATUS_CHANGE', 'NOTE'
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Store flexible data (e.g. message content, phantom container ID)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by lead
CREATE INDEX IF NOT EXISTS idx_activity_lead_id ON lead_activities(lead_id);
