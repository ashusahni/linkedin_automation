-- Create import_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    container_id VARCHAR(255),
    total_leads INTEGER DEFAULT 0,
    saved INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    csv_file VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_import_logs_timestamp ON import_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_source ON import_logs(source);
