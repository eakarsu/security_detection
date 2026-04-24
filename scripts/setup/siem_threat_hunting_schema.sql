-- SIEM, Threat Hunting, and Advanced Detection Schema
-- Creates all tables in the security schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS security;

-- ============================================================
-- SIEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS security.log_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('firewall', 'endpoint', 'cloud', 'iam', 'dns', 'email', 'proxy', 'custom')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('syslog', 'cef', 'leef', 'json')),
    description TEXT,
    host VARCHAR(255),
    port INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.raw_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES security.log_sources(id) ON DELETE SET NULL,
    format VARCHAR(20) NOT NULL,
    raw_content TEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS security.normalized_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_log_id UUID REFERENCES security.raw_logs(id) ON DELETE SET NULL,
    timestamp TIMESTAMP NOT NULL,
    source_type VARCHAR(50),
    source_name VARCHAR(255),
    action VARCHAR(255),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    src_ip VARCHAR(45),
    dst_ip VARCHAR(45),
    src_port INTEGER,
    dst_port INTEGER,
    protocol VARCHAR(20),
    username VARCHAR(255),
    hostname VARCHAR(255),
    message TEXT,
    extra_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_normalized_logs_timestamp ON security.normalized_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_source_type ON security.normalized_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_src_ip ON security.normalized_logs(src_ip);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_dst_ip ON security.normalized_logs(dst_ip);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_severity ON security.normalized_logs(severity);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_username ON security.normalized_logs(username);
CREATE INDEX IF NOT EXISTS idx_normalized_logs_action ON security.normalized_logs(action);

CREATE TABLE IF NOT EXISTS security.alerting_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    threshold INTEGER DEFAULT 1,
    window_seconds INTEGER DEFAULT 300,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    actions JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.alerting_rule_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES security.alerting_rules(id) ON DELETE CASCADE,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    matched_events JSONB,
    details TEXT
);

CREATE TABLE IF NOT EXISTS security.log_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type VARCHAR(50) NOT NULL,
    retention_days INTEGER NOT NULL DEFAULT 90,
    archive_enabled BOOLEAN DEFAULT FALSE,
    archive_location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- THREAT HUNTING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS security.hunt_hypotheses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    hypothesis TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'invalidated', 'closed')),
    mitre_tactic VARCHAR(100),
    mitre_technique VARCHAR(100),
    created_by VARCHAR(255),
    assigned_to VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    findings_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.hunt_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hunt_id UUID REFERENCES security.hunt_hypotheses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    evidence JSONB DEFAULT '{}',
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    source_event_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.ioc_sweeps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    ioc_list JSONB NOT NULL,
    time_range_start TIMESTAMP,
    time_range_end TIMESTAMP,
    results_count INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.ioc_sweep_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sweep_id UUID REFERENCES security.ioc_sweeps(id) ON DELETE CASCADE,
    ioc_value VARCHAR(500) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,
    matched_log_id UUID REFERENCES security.normalized_logs(id) ON DELETE SET NULL,
    matched_field VARCHAR(100),
    context TEXT,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.ueba_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'host', 'service', 'application')),
    baseline_data JSONB NOT NULL DEFAULT '{}',
    sample_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ueba_baselines_entity ON security.ueba_baselines(entity_id, entity_type);

CREATE TABLE IF NOT EXISTS security.ueba_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL,
    score FLOAT NOT NULL,
    deviation FLOAT,
    details JSONB DEFAULT '{}',
    baseline_id UUID REFERENCES security.ueba_baselines(id) ON DELETE SET NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS security.mitre_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detection_type VARCHAR(255),
    detection_rule_id UUID,
    tactic_id VARCHAR(20) NOT NULL,
    tactic_name VARCHAR(100) NOT NULL,
    technique_id VARCHAR(20) NOT NULL,
    technique_name VARCHAR(255) NOT NULL,
    sub_technique_id VARCHAR(20),
    sub_technique_name VARCHAR(255),
    confidence VARCHAR(20) DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.kill_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    src_ip VARCHAR(45),
    related_incident_id UUID,
    status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'confirmed', 'mitigated')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.kill_chain_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_id UUID REFERENCES security.kill_chains(id) ON DELETE CASCADE,
    phase VARCHAR(50) NOT NULL CHECK (phase IN ('reconnaissance', 'weaponization', 'delivery', 'exploitation', 'installation', 'command_and_control', 'actions_on_objectives')),
    event_id UUID,
    event_type VARCHAR(100),
    description TEXT,
    timestamp TIMESTAMP,
    sequence_order INTEGER
);

CREATE TABLE IF NOT EXISTS security.sigma_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    yaml_content TEXT NOT NULL,
    parsed_logic JSONB,
    status VARCHAR(20) DEFAULT 'testing' CHECK (status IN ('active', 'testing', 'disabled')),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    logsource_category VARCHAR(100),
    logsource_product VARCHAR(100),
    tags TEXT[],
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sigma_rules_status ON security.sigma_rules(status);

-- ============================================================
-- ADVANCED DETECTION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS security.custom_detection_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    logic_operator VARCHAR(5) DEFAULT 'AND' CHECK (logic_operator IN ('AND', 'OR')),
    actions JSONB DEFAULT '[]',
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.yara_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_content TEXT NOT NULL,
    tags TEXT[],
    enabled BOOLEAN DEFAULT TRUE,
    compiled BOOLEAN DEFAULT FALSE,
    scan_count INTEGER DEFAULT 0,
    last_scanned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.yara_scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES security.yara_rules(id) ON DELETE CASCADE,
    target VARCHAR(500),
    matched BOOLEAN DEFAULT FALSE,
    match_details JSONB DEFAULT '{}',
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.correlation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_sequence JSONB NOT NULL,
    window_seconds INTEGER DEFAULT 300,
    threshold INTEGER DEFAULT 1,
    severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security.correlation_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES security.correlation_rules(id) ON DELETE CASCADE,
    matched_events JSONB,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
