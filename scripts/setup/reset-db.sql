-- Reset and recreate the nodeguard user
-- This script handles user recreation safely

-- Connect to postgres database first
\c postgres;

-- Terminate any existing connections to nodeguard database
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nodeguard' AND pid <> pg_backend_pid();

-- Drop the user if it exists (ignore errors)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nodeguard') THEN
        -- Revoke all privileges first
        EXECUTE 'REVOKE ALL PRIVILEGES ON DATABASE nodeguard FROM nodeguard';
        -- Drop owned objects
        EXECUTE 'DROP OWNED BY nodeguard CASCADE';
        -- Drop the user
        EXECUTE 'DROP USER nodeguard';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors during cleanup
        NULL;
END $$;

-- Create the nodeguard user with the correct password (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nodeguard') THEN
        CREATE USER nodeguard WITH PASSWORD 'NodeGuard2025!SecureDB';
    END IF;
END $$;

-- Grant necessary privileges
ALTER USER nodeguard CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE nodeguard TO nodeguard;

-- Connect to the nodeguard database
\c nodeguard;

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS workflows;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO nodeguard;
GRANT ALL ON SCHEMA security TO nodeguard;
GRANT ALL ON SCHEMA analytics TO nodeguard;
GRANT ALL ON SCHEMA workflows TO nodeguard;

-- Grant table privileges (for existing tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workflows TO nodeguard;

-- Grant sequence privileges (for existing sequences)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA security TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workflows TO nodeguard;

-- Grant default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA security GRANT ALL ON TABLES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON TABLES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA workflows GRANT ALL ON TABLES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA security GRANT ALL ON SEQUENCES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON SEQUENCES TO nodeguard;
ALTER DEFAULT PRIVILEGES IN SCHEMA workflows GRANT ALL ON SEQUENCES TO nodeguard;

-- Make nodeguard the owner of the database
ALTER DATABASE nodeguard OWNER TO nodeguard;
