-- 1. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
    type VARCHAR(50) DEFAULT 'standard', -- standard, event, webinar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sequences Table (Steps in a campaign)
CREATE TABLE IF NOT EXISTS sequences (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL, -- 1, 2, 3
    type VARCHAR(50) NOT NULL, -- connection_request, message, email
    content TEXT, -- The message template or note
    delay_days INTEGER DEFAULT 0, -- Days to wait after previous step
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Campaign Leads (Leads assigned to a campaign)
CREATE TABLE IF NOT EXISTS campaign_leads (
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, replied, failed
    current_step INTEGER DEFAULT 1, -- Which step of the sequence they are on
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, lead_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON campaign_leads(lead_id);
