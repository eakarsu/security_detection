-- NodeGuard AI Security Platform Database Initialization
-- This script sets up the initial database schema and data

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS nodeguard;

-- Use the nodeguard database
-- \c nodeguard;

-- Create the nodeguard user if it doesn't exist
-- Note: The password should match POSTGRES_PASSWORD in .env file
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'nodeguard') THEN
      
      CREATE ROLE nodeguard LOGIN PASSWORD 'NodeGuard2025!SecureDB';
   END IF;
END
$do$;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS workflows;

-- Users and authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security events
CREATE TABLE IF NOT EXISTS security.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    source_ip INET,
    destination_ip INET,
    user_id VARCHAR(255),
    endpoint VARCHAR(255),
    description TEXT,
    raw_data JSONB,
    ml_score DECIMAL(5,4),
    ai_analysis JSONB,
    status VARCHAR(50) DEFAULT 'open',
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Threat intelligence
CREATE TABLE IF NOT EXISTS security.threat_intel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator_type VARCHAR(50) NOT NULL,
    indicator_value VARCHAR(500) NOT NULL,
    threat_type VARCHAR(100),
    confidence_score DECIMAL(3,2),
    source VARCHAR(100),
    description TEXT,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows
CREATE TABLE IF NOT EXISTS workflows.playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_conditions JSONB,
    workflow_definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS workflows.executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID REFERENCES workflows.playbooks(id),
    event_id UUID REFERENCES security.events(id),
    status VARCHAR(50) DEFAULT 'running',
    execution_log JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_by UUID
);

-- Analytics and metrics
CREATE TABLE IF NOT EXISTS analytics.metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_type VARCHAR(50),
    tags JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_created_at ON security.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_severity ON security.events(severity);
CREATE INDEX IF NOT EXISTS idx_events_status ON security.events(status);
CREATE INDEX IF NOT EXISTS idx_events_source_ip ON security.events(source_ip);
CREATE INDEX IF NOT EXISTS idx_threat_intel_indicator ON security.threat_intel(indicator_value);
CREATE INDEX IF NOT EXISTS idx_threat_intel_type ON security.threat_intel(indicator_type);
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON analytics.metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Insert default admin user (password: admin123 - change in production!)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'admin@nodeguard.ai', 
    crypt('admin123', gen_salt('bf')), 
    'System', 
    'Administrator', 
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample analyst user
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'analyst@nodeguard.ai', 
    crypt('analyst123', gen_salt('bf')), 
    'Security', 
    'Analyst', 
    'analyst'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample threat intelligence data
INSERT INTO security.threat_intel (indicator_type, indicator_value, threat_type, confidence_score, source, description) 
VALUES 
    ('ip', '192.168.1.100', 'malware', 0.85, 'internal_detection', 'Suspicious internal IP with malware indicators'),
    ('domain', 'malicious-site.com', 'phishing', 0.92, 'threat_feed', 'Known phishing domain'),
    ('hash', 'a1b2c3d4e5f6', 'malware', 0.78, 'virus_total', 'Malicious file hash detected')
ON CONFLICT DO NOTHING;

-- Insert sample security events
INSERT INTO security.events (event_type, severity, source_ip, destination_ip, user_id, description, ml_score, status) 
VALUES 
    ('failed_login', 'medium', '192.168.1.50', '192.168.1.10', 'user123', 'Multiple failed login attempts detected', 0.75, 'open'),
    ('suspicious_traffic', 'high', '10.0.0.100', '8.8.8.8', 'system', 'Unusual outbound traffic pattern detected', 0.89, 'investigating'),
    ('malware_detection', 'critical', '192.168.1.75', NULL, 'user456', 'Malware detected on endpoint', 0.95, 'open')
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON security.events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON workflows.playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO nodeguard;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA workflows TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA security TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA analytics TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA workflows TO nodeguard;
