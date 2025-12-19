-- Initialize the jobsmato database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by TypeORM, but we can add some custom ones here

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE jobsmato_db TO jobsmato_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jobsmato_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jobsmato_user;
