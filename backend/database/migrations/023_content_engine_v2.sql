-- Content Engine V2: Full Campaign Publishing Flow
-- Migration 023

-- Content Sources (replaces old content_feeds, keeps backward compat)
CREATE TABLE IF NOT EXISTS content_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'manual',  -- rss / keyword / manual
    url TEXT,                           -- RSS feed URL (for rss type)
    keywords TEXT[],                    -- keywords to monitor
    industry_tag VARCHAR(255),
    persona_tag VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CTA Templates
CREATE TABLE IF NOT EXISTS cta_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default CTA templates
INSERT INTO cta_templates (name, template_text) VALUES
    ('Question Hook', 'What do you think about this? Drop your thoughts below 👇'),
    ('DM for More', 'Interested in learning more? DM me directly.'),
    ('Share if Useful', 'If you found this useful, share it with your network! ♻️'),
    ('Book a Call', 'Want to discuss this further? Book a call with me: [link]'),
    ('Follow for More', 'Follow me for more insights on [topic]. 🔔')
ON CONFLICT DO NOTHING;

-- Content Items: the main pipeline entity
CREATE TABLE IF NOT EXISTS content_items (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES content_sources(id) ON DELETE SET NULL,
    title TEXT,
    generated_content TEXT,            -- AI-generated base content
    edited_content TEXT,               -- User-edited version
    persona VARCHAR(255),
    industry VARCHAR(255),
    objective VARCHAR(255),            -- thought_leadership / product_launch / engagement / educational
    cta_type INTEGER REFERENCES cta_templates(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'IDEA', -- IDEA / DRAFT / REVIEW / APPROVED / SCHEDULED / POSTED
    scheduled_at TIMESTAMP,
    posted_at TIMESTAMP,
    post_url TEXT,
    phantom_container_id TEXT,         -- Phantom job container id
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_at ON content_items(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_items_source_id ON content_items(source_id);

-- State transition audit log
CREATE TABLE IF NOT EXISTS content_item_history (
    id SERIAL PRIMARY KEY,
    content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
