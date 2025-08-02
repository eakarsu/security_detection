-- NodeGuard AI Security Platform - Realistic Security Data Seeding
-- This script populates the database with realistic security events and threat intelligence

-- Clear existing sample data (except users)
DELETE FROM security.events WHERE description LIKE '%sample%' OR description LIKE '%Multiple failed login attempts detected%';
DELETE FROM security.threat_intel WHERE description LIKE '%Suspicious internal IP%' OR description LIKE '%Known phishing domain%';

-- Insert realistic threat intelligence data
INSERT INTO security.threat_intel (indicator_type, indicator_value, threat_type, confidence_score, source, description, first_seen, last_seen, is_active) VALUES
-- Malicious IPs
('ip', '185.220.101.182', 'tor_exit_node', 0.95, 'tor_project', 'Known Tor exit node used for anonymization', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', true),
('ip', '45.142.214.219', 'malware_c2', 0.92, 'threat_feed', 'Command and control server for Emotet malware', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 hours', true),
('ip', '103.224.182.251', 'botnet', 0.88, 'internal_detection', 'Part of Mirai botnet infrastructure', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 hours', true),
('ip', '194.147.140.123', 'scanning', 0.75, 'honeypot', 'Aggressive port scanning activity detected', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour', true),
('ip', '91.240.118.172', 'phishing', 0.90, 'phishtank', 'Hosting phishing pages targeting financial institutions', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 hours', true),

-- Malicious domains
('domain', 'secure-bank-update.tk', 'phishing', 0.94, 'urlvoid', 'Phishing domain mimicking major bank login page', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 hours', true),
('domain', 'microsoft-security-alert.ml', 'phishing', 0.91, 'phishtank', 'Fake Microsoft security alert campaign', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', true),
('domain', 'covid19-relief-fund.ga', 'scam', 0.87, 'manual_analysis', 'COVID-19 themed scam website', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', true),
('domain', 'free-netflix-premium.cf', 'malware', 0.83, 'virustotal', 'Distributing credential stealer malware', NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 hours', true),
('domain', 'urgent-paypal-verification.tk', 'phishing', 0.96, 'openphish', 'PayPal credential harvesting campaign', NOW() - INTERVAL '4 days', NOW() - INTERVAL '30 minutes', true),

-- File hashes
('hash', 'a4b2c8d9e1f3a7b5c2d8e9f1a3b7c5d2', 'ransomware', 0.98, 'virustotal', 'WannaCry ransomware variant', NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days', true),
('hash', 'b7c3d1e5f9a2b8c4d7e1f5a9b3c7d1e5', 'trojan', 0.93, 'hybrid_analysis', 'Banking trojan targeting European banks', NOW() - INTERVAL '18 days', NOW() - INTERVAL '6 hours', true),
('hash', 'c8d4e2f6a1b9c5d8e2f6a1b9c5d8e2f6', 'spyware', 0.89, 'cuckoo_sandbox', 'Keylogger with screen capture capabilities', NOW() - INTERVAL '11 days', NOW() - INTERVAL '1 day', true),
('hash', 'd9e5f3a7b2c1d6e9f3a7b2c1d6e9f3a7', 'backdoor', 0.91, 'internal_analysis', 'Remote access trojan with persistence', NOW() - INTERVAL '14 days', NOW() - INTERVAL '8 hours', true),
('hash', 'e1f7a4b8c3d2e7f1a4b8c3d2e7f1a4b8', 'cryptominer', 0.85, 'yara_rules', 'Monero cryptocurrency miner', NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 hours', true),

-- URLs
('url', 'http://bit.ly/urgent-security-update', 'phishing', 0.88, 'url_shortener_analysis', 'Shortened URL leading to credential theft page', NOW() - INTERVAL '2 days', NOW() - INTERVAL '45 minutes', true),
('url', 'https://dropbox-secure-share.herokuapp.com/login', 'phishing', 0.92, 'manual_review', 'Fake Dropbox login page', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 hours', true),

-- Email addresses
('email', 'security@microsooft.com', 'phishing', 0.89, 'email_analysis', 'Typosquatting Microsoft domain for phishing', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 hour', true),
('email', 'noreply@paypal-security.net', 'phishing', 0.94, 'dmarc_analysis', 'Spoofing PayPal for credential theft', NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 minutes', true);

-- Insert realistic security events (all with today's timestamps)
INSERT INTO security.events (event_type, severity, source_ip, destination_ip, user_id, endpoint, description, raw_data, ml_score, ai_analysis, status, created_at) VALUES
-- Critical events (today)
('malware_detection', 'critical', '192.168.1.45', NULL, 'jsmith', '/home/jsmith/Downloads/invoice.exe', 'Ransomware detected on endpoint - WannaCry variant', 
 '{"file_path": "/home/jsmith/Downloads/invoice.exe", "hash": "a4b2c8d9e1f3a7b5c2d8e9f1a3b7c5d2", "process_id": 1234, "parent_process": "explorer.exe"}', 
 0.98, '{"threat_type": "ransomware", "family": "wannacry", "confidence": 0.98, "recommended_action": "immediate_isolation"}', 'open', CURRENT_DATE + INTERVAL '10 hours'),

('data_exfiltration', 'critical', '192.168.1.67', '45.142.214.219', 'mwilson', '/api/customer-data', 'Large data transfer to known malicious IP detected', 
 '{"bytes_transferred": 2147483648, "duration_seconds": 1800, "destination_country": "Russia", "protocol": "HTTPS"}', 
 0.95, '{"anomaly_score": 0.95, "baseline_deviation": "500x normal", "data_classification": "sensitive"}', 'investigating', CURRENT_DATE + INTERVAL '11 hours'),

('privilege_escalation', 'critical', '192.168.1.23', NULL, 'temp_user', '/bin/sudo', 'Unauthorized privilege escalation attempt detected', 
 '{"command": "sudo su -", "user": "temp_user", "success": false, "attempts": 15, "time_window": "5 minutes"}', 
 0.92, '{"attack_pattern": "credential_stuffing", "user_risk_score": 0.89, "account_age_days": 2}', 'open', CURRENT_DATE + INTERVAL '12 hours'),

-- High severity events (today)
('suspicious_login', 'high', '103.224.182.251', '192.168.1.10', 'admin', '/admin/login', 'Admin login from suspicious IP address', 
 '{"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "geolocation": "Unknown", "tor_exit_node": true}', 
 0.87, '{"risk_factors": ["tor_usage", "admin_account", "unusual_location"], "recommendation": "require_2fa"}', 'investigating', CURRENT_DATE + INTERVAL '9 hours'),

('network_anomaly', 'high', '192.168.1.89', '8.8.8.8', 'system', 'DNS', 'Unusual DNS query pattern detected - possible DNS tunneling', 
 '{"query_count": 1500, "unique_subdomains": 847, "entropy_score": 0.92, "base_domain": "malicious-c2.com"}', 
 0.84, '{"technique": "dns_tunneling", "data_volume_mb": 15.7, "detection_confidence": 0.84}', 'open', CURRENT_DATE + INTERVAL '13 hours'),

('brute_force', 'high', '194.147.140.123', '192.168.1.5', 'multiple', '/ssh', 'SSH brute force attack detected', 
 '{"failed_attempts": 2847, "unique_usernames": 156, "duration_hours": 6, "success_rate": 0.0}', 
 0.91, '{"attack_type": "dictionary_attack", "targeted_accounts": ["root", "admin", "user"], "source_reputation": "malicious"}', 'blocked', CURRENT_DATE + INTERVAL '8 hours'),

-- Medium severity events (today)
('failed_login', 'medium', '192.168.1.156', '192.168.1.10', 'bthomas', '/login', 'Multiple failed login attempts from internal user', 
 '{"attempts": 8, "time_window": "10 minutes", "account_locked": true, "last_success": "2024-01-15T09:30:00Z"}', 
 0.65, '{"user_behavior": "anomalous", "possible_causes": ["forgotten_password", "account_compromise"], "risk_level": "medium"}', 'open', CURRENT_DATE + INTERVAL '6 hours'),

('policy_violation', 'medium', '192.168.1.78', '91.240.118.172', 'kjohnson', '/web-proxy', 'Access to blocked website category detected', 
 '{"category": "phishing", "url": "secure-bank-update.tk", "action": "blocked", "user_override_attempted": true}', 
 0.72, '{"violation_type": "web_filtering", "user_training_required": true, "repeat_offender": false}', 'resolved', CURRENT_DATE + INTERVAL '7 hours'),

('file_integrity', 'medium', '192.168.1.34', NULL, 'system', '/etc/passwd', 'Critical system file modification detected', 
 '{"file": "/etc/passwd", "change_type": "modification", "user": "root", "process": "usermod", "checksum_before": "abc123", "checksum_after": "def456"}', 
 0.68, '{"legitimate_change": "likely", "admin_approval": "pending", "rollback_available": true}', 'investigating', CURRENT_DATE + INTERVAL '5 hours'),

-- Low severity events (today)
('port_scan', 'low', '192.168.1.200', '192.168.1.0/24', 'security_scanner', 'network', 'Authorized vulnerability scan detected', 
 '{"scan_type": "tcp_syn", "ports_scanned": 65535, "hosts_scanned": 254, "scanner_id": "nessus_01"}', 
 0.25, '{"authorized_scan": true, "scanner_authenticated": true, "compliance_scan": true}', 'resolved', CURRENT_DATE + INTERVAL '4 hours'),

('software_update', 'low', '192.168.1.99', '13.107.42.14', 'system', 'windows_update', 'System update installation completed', 
 '{"updates_installed": 15, "security_updates": 8, "reboot_required": true, "installation_time": "45 minutes", "update_server": "update.microsoft.com"}', 
 0.15, '{"update_criticality": "important", "security_impact": "positive", "system_stability": "stable"}', 'resolved', CURRENT_DATE + INTERVAL '3 hours'),

-- Additional events to reach realistic numbers
('suspicious_traffic', 'medium', '192.168.1.101', '203.0.113.45', 'user1', '/api/data', 'Unusual data access pattern detected', 
 '{"requests_per_minute": 150, "normal_baseline": 12, "data_volume_mb": 45}', 
 0.73, '{"anomaly_type": "volume", "risk_score": 0.73}', 'open', CURRENT_DATE + INTERVAL '14 hours'),

('phishing_attempt', 'high', '198.51.100.23', '192.168.1.55', 'user2', '/email', 'Phishing email detected and quarantined', 
 '{"sender": "security@microsooft.com", "subject": "Urgent Security Alert", "attachments": 1}', 
 0.89, '{"phishing_indicators": ["typosquatting", "urgency_language", "suspicious_attachment"]}', 'resolved', CURRENT_DATE + INTERVAL '15 hours'),

('malware_detection', 'critical', '192.168.1.88', NULL, 'user3', '/downloads/document.pdf.exe', 'Trojan horse detected in downloaded file', 
 '{"file_hash": "b7c3d1e5f9a2b8c4d7e1f5a9b3c7d1e5", "detection_engine": "windows_defender"}', 
 0.94, '{"malware_family": "trojan", "payload_type": "banking_stealer"}', 'open', CURRENT_DATE + INTERVAL '16 hours'),

('unauthorized_access', 'high', '10.0.0.50', '192.168.1.200', 'unknown', '/admin/panel', 'Unauthorized access attempt to admin panel', 
 '{"authentication_failures": 25, "source_country": "Unknown", "user_agent": "automated_tool"}', 
 0.86, '{"attack_type": "brute_force", "credential_stuffing": true}', 'blocked', CURRENT_DATE + INTERVAL '17 hours');

-- Insert dashboard metrics
INSERT INTO analytics.metrics (metric_name, metric_value, metric_type, tags, timestamp) VALUES
-- Security metrics for dashboard (matching actual inserted events)
('total_events_today', 15, 'count', '{"period": "24h", "severity": "all"}', NOW()),
('critical_events_today', 4, 'count', '{"period": "24h", "severity": "critical"}', NOW()),
('high_events_today', 4, 'count', '{"period": "24h", "severity": "high"}', NOW()),
('medium_events_today', 5, 'count', '{"period": "24h", "severity": "medium"}', NOW()),
('low_events_today', 2, 'count', '{"period": "24h", "severity": "low"}', NOW()),

('threat_intel_indicators', 18, 'count', '{"type": "active", "confidence": "high"}', NOW()),
('blocked_attacks_today', 156, 'count', '{"period": "24h", "action": "blocked"}', NOW()),
('mean_time_to_detection', 8.5, 'minutes', '{"period": "7d", "metric_type": "mttd"}', NOW()),
('mean_time_to_response', 23.2, 'minutes', '{"period": "7d", "metric_type": "mttr"}', NOW()),

-- Trend data for charts (last 7 days)
('daily_events', 52, 'count', '{"date": "2024-01-22", "severity": "all"}', NOW() - INTERVAL '1 day'),
('daily_events', 38, 'count', '{"date": "2024-01-21", "severity": "all"}', NOW() - INTERVAL '2 days'),
('daily_events', 61, 'count', '{"date": "2024-01-20", "severity": "all"}', NOW() - INTERVAL '3 days'),
('daily_events', 45, 'count', '{"date": "2024-01-19", "severity": "all"}', NOW() - INTERVAL '4 days'),
('daily_events', 73, 'count', '{"date": "2024-01-18", "severity": "all"}', NOW() - INTERVAL '5 days'),
('daily_events', 29, 'count', '{"date": "2024-01-17", "severity": "all"}', NOW() - INTERVAL '6 days'),
('daily_events', 41, 'count', '{"date": "2024-01-16", "severity": "all"}', NOW() - INTERVAL '7 days');

-- Update existing sample data timestamps to be more recent
UPDATE security.events SET created_at = NOW() - INTERVAL '3 hours' WHERE description = 'Multiple failed login attempts detected';
UPDATE security.events SET created_at = NOW() - INTERVAL '1 hour' WHERE description = 'Unusual outbound traffic pattern detected';
UPDATE security.events SET created_at = NOW() - INTERVAL '30 minutes' WHERE description = 'Malware detected on endpoint';

COMMIT;
