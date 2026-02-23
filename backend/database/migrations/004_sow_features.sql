-- 1. SOW Step 1: Auditing & Connection Export
-- Store the 1st degree connections
CREATE TABLE IF NOT EXISTS audit_connections (
    id SERIAL PRIMARY KEY,
    linkedin_id VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    title TEXT,
    company TEXT,
    profile_url TEXT,
    contact_details JSONB, -- Email, Phone, etc.
    connected_at TIMESTAMP,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SOW Step 2: Enrichment
-- Store deeper data for generic leads or connections
CREATE TABLE IF NOT EXISTS lead_enrichment (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    bio TEXT,
    interests TEXT[],
    mutual_connections_count INTEGER,
    recent_posts JSONB, -- Array of objects
    company_news JSONB,
    last_enriched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SOW Step 3: Human-in-the-Loop Approval Queue
-- Store generated messages before they are sent
CREATE TABLE IF NOT EXISTS approval_queue (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    lead_id INTEGER,
    step_type VARCHAR(50), -- connection_request, message, email
    generated_content TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, edited
    admin_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id, lead_id) REFERENCES campaign_leads(campaign_id, lead_id)
);

-- 4. SOW Step 3: Email Failover Configuration
-- Expand sequences table to support conditional failovers
ALTER TABLE sequences 
ADD COLUMN IF NOT EXISTS condition_type VARCHAR(50) DEFAULT 'time_delay'; -- time_delay, no_reply_linkedin

-- 5. SOW Step 4: Content Engine
-- Feeds to monitor
CREATE TABLE IF NOT EXISTS content_feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    url TEXT, -- RSS feed or API endpoint
    keywords TEXT[],
    type VARCHAR(50), -- news, blog, linkedin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated/Curated Posts
CREATE TABLE IF NOT EXISTS content_posts (
    id SERIAL PRIMARY KEY,
    source_url TEXT,
    original_title TEXT,
    ai_generated_content TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
