-- SIEM, Threat Hunting, and Advanced Detection Seed Data
-- Realistic cybersecurity data for demonstration

-- ============================================================
-- LOG SOURCES
-- ============================================================

INSERT INTO security.log_sources (name, source_type, format, description, host, port, enabled) VALUES
('Palo Alto PA-5260', 'firewall', 'syslog', 'Primary perimeter firewall', '10.0.1.1', 514, true),
('CrowdStrike Falcon', 'endpoint', 'json', 'Endpoint detection and response', '10.0.2.50', 443, true),
('AWS CloudTrail', 'cloud', 'json', 'AWS API activity monitoring', NULL, NULL, true),
('Okta SSO', 'iam', 'json', 'Identity and access management', NULL, NULL, true),
('Internal DNS', 'dns', 'syslog', 'Corporate DNS resolver', '10.0.1.10', 53, true);

-- ============================================================
-- NORMALIZED LOGS (50+ entries)
-- ============================================================

INSERT INTO security.normalized_logs (timestamp, source_type, source_name, action, severity, src_ip, dst_ip, src_port, dst_port, protocol, username, hostname, message, extra_fields) VALUES
-- Firewall logs
(NOW() - INTERVAL '6 hours', 'firewall', 'PA-5260', 'denied', 'high', '203.0.113.45', '10.0.5.20', 54321, 3389, 'TCP', NULL, 'fw-primary', 'RDP brute force attempt blocked from external IP', '{"rule": "block-rdp-external", "packets": 150}'),
(NOW() - INTERVAL '5 hours 55 minutes', 'firewall', 'PA-5260', 'denied', 'high', '203.0.113.45', '10.0.5.20', 54322, 3389, 'TCP', NULL, 'fw-primary', 'Repeated RDP connection attempt blocked', '{"rule": "block-rdp-external", "packets": 89}'),
(NOW() - INTERVAL '5 hours 50 minutes', 'firewall', 'PA-5260', 'denied', 'high', '203.0.113.45', '10.0.5.21', 54323, 3389, 'TCP', NULL, 'fw-primary', 'RDP scan targeting multiple hosts', '{"rule": "block-rdp-external", "packets": 45}'),
(NOW() - INTERVAL '5 hours', 'firewall', 'PA-5260', 'allowed', 'low', '10.0.3.15', '8.8.8.8', 49152, 53, 'UDP', 'jsmith', 'ws-jsmith', 'DNS query to Google DNS', '{"query": "google.com"}'),
(NOW() - INTERVAL '4 hours 30 minutes', 'firewall', 'PA-5260', 'denied', 'critical', '198.51.100.77', '10.0.5.100', 80, 443, 'TCP', NULL, 'fw-primary', 'SQL injection attempt detected in HTTP payload', '{"signature": "sql-injection-attempt", "uri": "/api/users?id=1 OR 1=1"}'),
(NOW() - INTERVAL '4 hours', 'firewall', 'PA-5260', 'allowed', 'info', '10.0.3.20', '172.16.0.5', 55000, 22, 'TCP', 'admin', 'ws-admin', 'SSH connection to production server', '{"auth_method": "publickey"}'),
(NOW() - INTERVAL '3 hours 45 minutes', 'firewall', 'PA-5260', 'denied', 'medium', '10.0.3.50', '185.220.101.1', 49200, 6667, 'TCP', NULL, 'ws-unknown', 'IRC connection blocked - potential C2 channel', '{"category": "c2-communication"}'),
(NOW() - INTERVAL '3 hours', 'firewall', 'PA-5260', 'denied', 'high', '10.0.3.50', '45.33.32.156', 49300, 4444, 'TCP', NULL, 'ws-unknown', 'Reverse shell connection attempt blocked', '{"signature": "reverse-shell-detection"}'),
(NOW() - INTERVAL '2 hours 30 minutes', 'firewall', 'PA-5260', 'allowed', 'info', '10.0.4.10', '13.107.42.14', 443, 443, 'TCP', 'mwilson', 'ws-mwilson', 'HTTPS connection to Microsoft 365', '{}'),
(NOW() - INTERVAL '2 hours', 'firewall', 'PA-5260', 'denied', 'medium', '203.0.113.100', '10.0.5.0', 0, 0, 'ICMP', NULL, 'fw-primary', 'ICMP sweep detected across subnet', '{"count": 254, "type": "ping-sweep"}'),

-- Endpoint (CrowdStrike) logs
(NOW() - INTERVAL '5 hours 30 minutes', 'endpoint', 'CrowdStrike', 'detected', 'critical', '10.0.3.50', NULL, NULL, NULL, NULL, 'jdoe', 'ws-jdoe', 'Suspicious PowerShell execution: encoded command with bypass', '{"process": "powershell.exe", "cmdline": "powershell -ep bypass -enc SQBFAFgAKA==", "parent": "cmd.exe"}'),
(NOW() - INTERVAL '5 hours 15 minutes', 'endpoint', 'CrowdStrike', 'detected', 'critical', '10.0.3.50', NULL, NULL, NULL, NULL, 'jdoe', 'ws-jdoe', 'Mimikatz credential dumping tool detected', '{"process": "mimikatz.exe", "technique": "T1003", "hash": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"}'),
(NOW() - INTERVAL '5 hours', 'endpoint', 'CrowdStrike', 'detected', 'high', '10.0.3.50', '10.0.5.100', NULL, NULL, NULL, 'jdoe', 'ws-jdoe', 'Lateral movement via PsExec to production server', '{"process": "psexec.exe", "target": "10.0.5.100", "technique": "T1021.002"}'),
(NOW() - INTERVAL '4 hours 45 minutes', 'endpoint', 'CrowdStrike', 'detected', 'medium', '10.0.3.30', NULL, NULL, NULL, NULL, 'asmith', 'ws-asmith', 'Unusual registry modification in Run key', '{"key": "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "value": "updater.exe"}'),
(NOW() - INTERVAL '4 hours 15 minutes', 'endpoint', 'CrowdStrike', 'detected', 'high', '10.0.5.100', NULL, NULL, NULL, NULL, 'SYSTEM', 'srv-prod-01', 'Unauthorized service installation detected', '{"service": "WindowsUpdate2", "binary": "C:\\temp\\svc.exe"}'),
(NOW() - INTERVAL '3 hours 30 minutes', 'endpoint', 'CrowdStrike', 'detected', 'medium', '10.0.3.25', NULL, NULL, NULL, NULL, 'bwilliams', 'ws-bwilliams', 'Process injection detected - hollowing technique', '{"source_process": "explorer.exe", "target_process": "svchost.exe", "technique": "T1055"}'),
(NOW() - INTERVAL '2 hours 45 minutes', 'endpoint', 'CrowdStrike', 'allowed', 'info', '10.0.3.15', NULL, NULL, NULL, NULL, 'jsmith', 'ws-jsmith', 'Standard application installation by user', '{"process": "installer.msi", "publisher": "Microsoft Corporation"}'),
(NOW() - INTERVAL '1 hour 30 minutes', 'endpoint', 'CrowdStrike', 'detected', 'high', '10.0.5.100', '185.100.87.202', NULL, 443, 'TCP', 'SYSTEM', 'srv-prod-01', 'Data exfiltration attempt - large outbound transfer to unknown destination', '{"bytes_out": 524288000, "destination": "185.100.87.202", "technique": "T1048"}'),

-- Cloud (AWS CloudTrail) logs
(NOW() - INTERVAL '6 hours 30 minutes', 'cloud', 'AWS CloudTrail', 'CreateUser', 'medium', '203.0.113.50', NULL, NULL, NULL, NULL, 'admin@corp.com', NULL, 'New IAM user created: service-account-temp', '{"eventName": "CreateUser", "userName": "service-account-temp", "region": "us-east-1"}'),
(NOW() - INTERVAL '6 hours 15 minutes', 'cloud', 'AWS CloudTrail', 'AuthorizeSecurityGroupIngress', 'high', '203.0.113.50', NULL, NULL, NULL, NULL, 'admin@corp.com', NULL, 'Security group opened to 0.0.0.0/0 on port 22', '{"eventName": "AuthorizeSecurityGroupIngress", "sgId": "sg-0123456789", "port": 22, "cidr": "0.0.0.0/0"}'),
(NOW() - INTERVAL '5 hours 45 minutes', 'cloud', 'AWS CloudTrail', 'PutBucketPolicy', 'critical', '203.0.113.50', NULL, NULL, NULL, NULL, 'admin@corp.com', NULL, 'S3 bucket policy changed to allow public access', '{"eventName": "PutBucketPolicy", "bucket": "corp-sensitive-data", "effect": "Allow", "principal": "*"}'),
(NOW() - INTERVAL '4 hours', 'cloud', 'AWS CloudTrail', 'ConsoleLogin', 'medium', '198.51.100.200', NULL, NULL, NULL, NULL, 'devops@corp.com', NULL, 'Console login from unusual location', '{"eventName": "ConsoleLogin", "mfaUsed": false, "sourceCountry": "RU"}'),
(NOW() - INTERVAL '3 hours', 'cloud', 'AWS CloudTrail', 'StopLogging', 'critical', '198.51.100.200', NULL, NULL, NULL, NULL, 'devops@corp.com', NULL, 'CloudTrail logging disabled - potential cover-up', '{"eventName": "StopLogging", "trailName": "management-trail"}'),
(NOW() - INTERVAL '2 hours', 'cloud', 'AWS CloudTrail', 'DeleteBucket', 'high', '198.51.100.200', NULL, NULL, NULL, NULL, 'devops@corp.com', NULL, 'S3 bucket deleted containing backup data', '{"eventName": "DeleteBucket", "bucket": "corp-backups-2024"}'),

-- IAM (Okta) logs
(NOW() - INTERVAL '7 hours', 'iam', 'Okta', 'failed_login', 'medium', '192.168.1.100', NULL, NULL, NULL, NULL, 'cjohnson', NULL, 'Failed login attempt - incorrect password', '{"reason": "INVALID_CREDENTIALS", "app": "corporate-vpn"}'),
(NOW() - INTERVAL '6 hours 58 minutes', 'iam', 'Okta', 'failed_login', 'medium', '192.168.1.100', NULL, NULL, NULL, NULL, 'cjohnson', NULL, 'Failed login attempt - incorrect password (2nd)', '{"reason": "INVALID_CREDENTIALS", "app": "corporate-vpn"}'),
(NOW() - INTERVAL '6 hours 56 minutes', 'iam', 'Okta', 'failed_login', 'medium', '192.168.1.100', NULL, NULL, NULL, NULL, 'cjohnson', NULL, 'Failed login attempt - incorrect password (3rd)', '{"reason": "INVALID_CREDENTIALS", "app": "corporate-vpn"}'),
(NOW() - INTERVAL '6 hours 54 minutes', 'iam', 'Okta', 'failed_login', 'high', '192.168.1.100', NULL, NULL, NULL, NULL, 'cjohnson', NULL, 'Failed login attempt - account lockout threshold approaching', '{"reason": "INVALID_CREDENTIALS", "app": "corporate-vpn", "attempt": 4}'),
(NOW() - INTERVAL '6 hours 52 minutes', 'iam', 'Okta', 'failed_login', 'high', '192.168.1.100', NULL, NULL, NULL, NULL, 'cjohnson', NULL, 'Failed login attempt - account locked', '{"reason": "ACCOUNT_LOCKED", "app": "corporate-vpn", "attempt": 5}'),
(NOW() - INTERVAL '6 hours 45 minutes', 'iam', 'Okta', 'login', 'info', '10.0.3.15', NULL, NULL, NULL, NULL, 'jsmith', NULL, 'Successful login with MFA', '{"mfa": true, "factor": "okta_push", "app": "corporate-portal"}'),
(NOW() - INTERVAL '5 hours', 'iam', 'Okta', 'password_change', 'medium', '10.0.3.50', NULL, NULL, NULL, NULL, 'jdoe', NULL, 'Password changed outside of normal schedule', '{"initiated_by": "user", "outside_policy": true}'),
(NOW() - INTERVAL '3 hours', 'iam', 'Okta', 'privilege_change', 'critical', '10.0.3.50', NULL, NULL, NULL, NULL, 'jdoe', NULL, 'User added to Domain Admins group', '{"group": "Domain Admins", "added_by": "jdoe"}'),
(NOW() - INTERVAL '1 hour', 'iam', 'Okta', 'login', 'high', '91.234.33.44', NULL, NULL, NULL, NULL, 'jdoe', NULL, 'Login from TOR exit node detected', '{"mfa": false, "source_type": "tor_exit_node", "country": "Unknown"}'),

-- DNS logs
(NOW() - INTERVAL '4 hours', 'dns', 'Internal DNS', 'dns_query', 'high', '10.0.3.50', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-jdoe', 'DNS query for known C2 domain: evil-c2.badactor.xyz', '{"query": "evil-c2.badactor.xyz", "type": "A", "response": "185.220.101.1"}'),
(NOW() - INTERVAL '3 hours 50 minutes', 'dns', 'Internal DNS', 'dns_query', 'high', '10.0.3.50', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-jdoe', 'DNS query for DGA-like domain: xk4m9p2q.suspicious.net', '{"query": "xk4m9p2q.suspicious.net", "type": "A", "response": "NXDOMAIN"}'),
(NOW() - INTERVAL '3 hours 45 minutes', 'dns', 'Internal DNS', 'dns_query', 'medium', '10.0.3.50', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-jdoe', 'DNS query for DGA domain: r7h2n5w8.suspicious.net', '{"query": "r7h2n5w8.suspicious.net", "type": "A", "response": "NXDOMAIN"}'),
(NOW() - INTERVAL '3 hours 40 minutes', 'dns', 'Internal DNS', 'dns_query', 'medium', '10.0.3.50', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-jdoe', 'DNS tunneling detected - unusually long subdomain', '{"query": "YWRtaW46cGFzc3dvcmQ=.exfil.attacker.com", "type": "TXT"}'),
(NOW() - INTERVAL '2 hours', 'dns', 'Internal DNS', 'dns_query', 'low', '10.0.3.15', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-jsmith', 'Normal DNS query for internal service', '{"query": "api.internal.corp.com", "type": "A", "response": "10.0.5.50"}'),
(NOW() - INTERVAL '1 hour 30 minutes', 'dns', 'Internal DNS', 'dns_query', 'info', '10.0.4.10', '10.0.1.10', NULL, 53, 'UDP', NULL, 'ws-mwilson', 'DNS query for Office 365', '{"query": "outlook.office365.com", "type": "CNAME"}'),

-- Additional attack chain logs
(NOW() - INTERVAL '6 hours', 'endpoint', 'CrowdStrike', 'scan', 'medium', '203.0.113.45', '10.0.5.0', NULL, NULL, NULL, NULL, NULL, 'Port scan detected from external IP across /24 subnet', '{"ports_scanned": [22, 80, 443, 3389, 8080], "hosts_scanned": 50}'),
(NOW() - INTERVAL '5 hours 40 minutes', 'endpoint', 'CrowdStrike', 'phishing', 'high', NULL, '10.0.3.50', NULL, NULL, NULL, 'jdoe', 'ws-jdoe', 'Phishing email opened - malicious attachment executed', '{"subject": "Invoice #4521", "attachment": "invoice.pdf.exe", "sender": "billing@fake-corp.com"}'),
(NOW() - INTERVAL '5 hours 35 minutes', 'endpoint', 'CrowdStrike', 'exploit', 'critical', '10.0.3.50', NULL, NULL, NULL, NULL, 'jdoe', 'ws-jdoe', 'Zero-day exploit triggered - CVE-2024-XXXX in document parser', '{"cve": "CVE-2024-XXXX", "process": "acrord32.exe", "payload_dropped": true}'),
(NOW() - INTERVAL '4 hours 50 minutes', 'endpoint', 'CrowdStrike', 'persistence', 'high', '10.0.3.50', NULL, NULL, NULL, NULL, 'SYSTEM', 'ws-jdoe', 'Backdoor installed as scheduled task', '{"task_name": "SystemHealthCheck", "binary": "C:\\Windows\\Temp\\health.exe", "trigger": "AtLogon"}'),
(NOW() - INTERVAL '1 hour', 'endpoint', 'CrowdStrike', 'exfiltration', 'critical', '10.0.5.100', '185.100.87.202', NULL, 443, 'TCP', 'SYSTEM', 'srv-prod-01', 'Large data transfer to external host - potential exfiltration', '{"bytes": 1073741824, "files_accessed": 347, "destination_country": "Unknown"}');

-- ============================================================
-- ALERTING RULES
-- ============================================================

INSERT INTO security.alerting_rules (name, description, conditions, threshold, window_seconds, severity, actions, enabled) VALUES
('Brute Force Detection', 'Detect multiple failed login attempts from same source', '[{"field": "action", "operator": "equals", "value": "failed_login", "type": "count"}]', 5, 600, 'high', '["create_alert", "notify_soc"]', true),
('Port Scan Detection', 'Detect scanning activity targeting multiple ports', '[{"field": "action", "operator": "equals", "value": "scan", "type": "count"}]', 3, 300, 'medium', '["create_alert"]', true),
('Data Exfiltration Alert', 'Detect large outbound data transfers', '[{"field": "action", "operator": "equals", "value": "exfiltration", "type": "count"}]', 1, 3600, 'critical', '["create_alert", "notify_soc", "block_ip"]', true),
('Privilege Escalation', 'Detect unauthorized privilege changes', '[{"field": "action", "operator": "equals", "value": "privilege_change", "type": "count"}]', 1, 600, 'critical', '["create_alert", "notify_soc"]', true),
('Suspicious DNS Activity', 'Detect queries to known malicious or DGA domains', '[{"field": "action", "operator": "equals", "value": "dns_query", "type": "count"}, {"field": "severity", "operator": "equals", "value": "high"}]', 3, 600, 'high', '["create_alert"]', true);

-- ============================================================
-- LOG RETENTION POLICIES
-- ============================================================

INSERT INTO security.log_retention_policies (source_type, retention_days, archive_enabled, archive_location) VALUES
('firewall', 90, true, 's3://corp-security-archive/firewall/'),
('endpoint', 180, true, 's3://corp-security-archive/endpoint/'),
('cloud', 365, true, 's3://corp-security-archive/cloud/');

-- ============================================================
-- HUNT HYPOTHESES
-- ============================================================

INSERT INTO security.hunt_hypotheses (title, hypothesis, status, mitre_tactic, mitre_technique, priority, created_by, findings_count, notes) VALUES
('APT29 Lateral Movement via WMI', 'APT29 group is using WMI for lateral movement across our network after initial compromise via spearphishing', 'active', 'TA0008 - Lateral Movement', 'T1047', 'critical', 'analyst1', 3, 'Multiple indicators of WMI-based lateral movement observed from workstation ws-jdoe'),
('Credential Harvesting via Phishing', 'Threat actors are conducting a targeted phishing campaign to harvest corporate credentials', 'validated', 'TA0006 - Credential Access', 'T1566', 'high', 'analyst2', 2, 'Confirmed: phishing emails from fake-corp.com domain targeting finance team'),
('Data Staging Before Exfiltration', 'Attacker is staging data on compromised server before exfiltrating to external C2', 'active', 'TA0010 - Exfiltration', 'T1074', 'critical', 'analyst1', 1, 'Large file aggregation detected on srv-prod-01'),
('Insider Threat - Data Access', 'An insider is accessing sensitive data outside normal business patterns', 'draft', 'TA0009 - Collection', 'T1005', 'medium', 'analyst3', 0, 'Unusual data access patterns for user bwilliams flagged by UEBA'),
('Supply Chain Compromise', 'Third-party software update mechanism may have been compromised', 'closed', 'TA0001 - Initial Access', 'T1195', 'high', 'analyst2', 2, 'Investigation complete - false positive confirmed. Vendor update was legitimate.');

-- ============================================================
-- HUNT FINDINGS
-- ============================================================

INSERT INTO security.hunt_findings (hunt_id, title, description, evidence, severity) VALUES
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'APT29%' LIMIT 1), 'WMI Process Creation on Remote Host', 'WMI was used to execute processes on srv-prod-01 from ws-jdoe', '{"source_host": "ws-jdoe", "target_host": "srv-prod-01", "command": "wmic /node:10.0.5.100 process call create cmd.exe"}', 'critical'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'APT29%' LIMIT 1), 'PsExec Lateral Movement Confirmed', 'PsExec binary executed from compromised workstation to production server', '{"binary": "psexec.exe", "source": "10.0.3.50", "target": "10.0.5.100", "timestamp": "2026-03-13T10:00:00Z"}', 'critical'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'APT29%' LIMIT 1), 'Credential Dumping via Mimikatz', 'Mimikatz was executed on compromised workstation to dump credentials', '{"tool": "mimikatz.exe", "host": "ws-jdoe", "hashes_extracted": 12}', 'critical'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'Credential Harvesting%' LIMIT 1), 'Phishing Email Campaign Identified', 'Identified phishing emails from fake-corp.com targeting 15 employees', '{"sender_domain": "fake-corp.com", "targets": 15, "clicked": 3, "credentials_entered": 1}', 'high'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'Credential Harvesting%' LIMIT 1), 'Compromised Credentials Used', 'Credentials from phishing used for VPN login from suspicious IP', '{"username": "jdoe", "source_ip": "91.234.33.44", "is_tor": true}', 'critical'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'Data Staging%' LIMIT 1), 'Large File Aggregation on Server', '500MB of files copied to staging directory on production server', '{"directory": "C:\\temp\\staging", "total_size_mb": 500, "file_count": 347}', 'high'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'Supply Chain%' LIMIT 1), 'Unusual Update Binary Hash', 'Software update binary had different hash than vendor published', '{"binary": "update.exe", "expected_hash": "abc123", "actual_hash": "def456"}', 'medium'),
((SELECT id FROM security.hunt_hypotheses WHERE title LIKE 'Supply Chain%' LIMIT 1), 'Vendor Confirmation', 'Vendor confirmed the hash change was due to hotfix applied to update package', '{"vendor_response": "confirmed_legitimate", "ticket": "SUP-2024-1234"}', 'low');

-- ============================================================
-- IOC SWEEPS
-- ============================================================

INSERT INTO security.ioc_sweeps (name, description, status, ioc_list, results_count, started_at, completed_at) VALUES
('APT29 IOC Sweep - March 2026', 'Sweep for known APT29 indicators', 'completed',
 '[{"value": "203.0.113.45", "type": "ip"}, {"value": "185.220.101.1", "type": "ip"}, {"value": "evil-c2.badactor.xyz", "type": "domain"}, {"value": "185.100.87.202", "type": "ip"}, {"value": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6", "type": "md5"}, {"value": "fake-corp.com", "type": "domain"}]',
 8, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 50 minutes'),
('Ransomware IOC Check', 'Sweep for recent ransomware indicators', 'pending',
 '[{"value": "198.51.100.77", "type": "ip"}, {"value": "ransomware-c2.onion.ws", "type": "domain"}]',
 0, NULL, NULL);

-- ============================================================
-- UEBA BASELINES
-- ============================================================

INSERT INTO security.ueba_baselines (entity_id, entity_type, baseline_data, sample_count) VALUES
('jsmith', 'user', '{"mean_daily_events": 45.2, "stddev_daily_events": 12.5, "unique_destinations": 8, "active_hours": 10, "hourly_distribution": {"8": 5, "9": 8, "10": 7, "11": 6, "12": 3, "13": 5, "14": 7, "15": 6, "16": 4, "17": 2}, "top_actions": {"login": 2, "allowed": 30, "dns_query": 10}, "severity_distribution": {"info": 35, "low": 8, "medium": 2}}', 30),
('jdoe', 'user', '{"mean_daily_events": 32.8, "stddev_daily_events": 8.3, "unique_destinations": 5, "active_hours": 9, "hourly_distribution": {"9": 6, "10": 5, "11": 4, "12": 3, "13": 4, "14": 5, "15": 3, "16": 2}, "top_actions": {"login": 2, "allowed": 25, "dns_query": 5}, "severity_distribution": {"info": 25, "low": 5, "medium": 2, "high": 1}}', 28),
('bwilliams', 'user', '{"mean_daily_events": 22.1, "stddev_daily_events": 6.7, "unique_destinations": 4, "active_hours": 8, "hourly_distribution": {"9": 4, "10": 3, "11": 3, "12": 2, "13": 3, "14": 3, "15": 2, "16": 2}, "top_actions": {"login": 1, "allowed": 18, "dns_query": 3}, "severity_distribution": {"info": 18, "low": 3, "medium": 1}}', 25),
('srv-prod-01', 'host', '{"mean_daily_events": 150.5, "stddev_daily_events": 35.2, "unique_destinations": 20, "active_hours": 24, "top_actions": {"allowed": 120, "dns_query": 20, "login": 5}, "severity_distribution": {"info": 130, "low": 15, "medium": 5}}', 30),
('ws-jdoe', 'host', '{"mean_daily_events": 38.0, "stddev_daily_events": 10.1, "unique_destinations": 6, "active_hours": 10, "top_actions": {"allowed": 28, "dns_query": 8, "login": 2}, "severity_distribution": {"info": 30, "low": 5, "medium": 3}}', 28);

-- ============================================================
-- UEBA ANOMALIES
-- ============================================================

INSERT INTO security.ueba_anomalies (entity_id, entity_type, anomaly_type, score, deviation, details, baseline_id) VALUES
('jdoe', 'user', 'unusual_event_volume', 0.85, 4.2, '{"recent_count": 95, "baseline_mean": 32.8, "baseline_stddev": 8.3, "z_score": 7.49}', (SELECT id FROM security.ueba_baselines WHERE entity_id = 'jdoe' LIMIT 1)),
('jdoe', 'user', 'unusual_activity_hour', 0.70, 8, '{"hour": 2, "event_count": 8, "baseline_count": 0}', (SELECT id FROM security.ueba_baselines WHERE entity_id = 'jdoe' LIMIT 1)),
('jdoe', 'user', 'unusual_destination_count', 0.60, 15, '{"recent_destinations": 20, "baseline_destinations": 5}', (SELECT id FROM security.ueba_baselines WHERE entity_id = 'jdoe' LIMIT 1)),
('bwilliams', 'user', 'unusual_event_volume', 0.55, 2.8, '{"recent_count": 41, "baseline_mean": 22.1, "baseline_stddev": 6.7, "z_score": 2.82}', (SELECT id FROM security.ueba_baselines WHERE entity_id = 'bwilliams' LIMIT 1)),
('srv-prod-01', 'host', 'unusual_event_volume', 0.92, 5.1, '{"recent_count": 330, "baseline_mean": 150.5, "baseline_stddev": 35.2, "z_score": 5.1}', (SELECT id FROM security.ueba_baselines WHERE entity_id = 'srv-prod-01' LIMIT 1));

-- ============================================================
-- MITRE MAPPINGS
-- ============================================================

INSERT INTO security.mitre_mappings (detection_type, tactic_id, tactic_name, technique_id, technique_name, confidence, notes) VALUES
('brute_force_detection', 'TA0006', 'Credential Access', 'T1110', 'Brute Force', 'high', 'Multiple failed login attempts from same IP'),
('port_scan_detection', 'TA0007', 'Discovery', 'T1046', 'Network Service Discovery', 'high', 'Network scanning activity detected'),
('phishing_detection', 'TA0001', 'Initial Access', 'T1566', 'Phishing', 'high', 'Malicious email with weaponized attachment'),
('sql_injection', 'TA0001', 'Initial Access', 'T1190', 'Exploit Public-Facing Application', 'high', 'SQL injection attempt in web application'),
('lateral_movement_psexec', 'TA0008', 'Lateral Movement', 'T1021', 'Remote Services', 'high', 'PsExec-based lateral movement detected'),
('credential_dumping', 'TA0006', 'Credential Access', 'T1003', 'OS Credential Dumping', 'high', 'Mimikatz credential dumping tool usage'),
('privilege_escalation', 'TA0004', 'Privilege Escalation', 'T1068', 'Exploitation for Privilege Escalation', 'medium', 'Unauthorized privilege change'),
('data_exfiltration', 'TA0010', 'Exfiltration', 'T1048', 'Exfiltration Over Alternative Protocol', 'high', 'Large data transfer to external destination'),
('c2_communication', 'TA0011', 'Command and Control', 'T1071', 'Application Layer Protocol', 'medium', 'Communication with known C2 infrastructure'),
('dns_tunneling', 'TA0011', 'Command and Control', 'T1572', 'Protocol Tunneling', 'high', 'DNS tunneling for data exfiltration'),
('persistence_scheduled_task', 'TA0003', 'Persistence', 'T1053', 'Scheduled Task/Job', 'high', 'Malicious scheduled task installation'),
('powershell_execution', 'TA0002', 'Execution', 'T1059', 'Command and Scripting Interpreter', 'high', 'Suspicious PowerShell with encoded commands'),
('process_injection', 'TA0005', 'Defense Evasion', 'T1055', 'Process Injection', 'medium', 'Process hollowing technique detected'),
('ransomware_detection', 'TA0040', 'Impact', 'T1486', 'Data Encrypted for Impact', 'critical', 'Ransomware file encryption activity'),
('insider_threat', 'TA0009', 'Collection', 'T1005', 'Data from Local System', 'medium', 'Unusual data access by insider');

-- ============================================================
-- KILL CHAINS
-- ============================================================

INSERT INTO security.kill_chains (name, description, src_ip, status) VALUES
('APT Attack Chain - 203.0.113.45', 'Full kill chain detected from external attacker through lateral movement to exfiltration', '203.0.113.45', 'confirmed'),
('Insider Threat Chain - 10.0.3.50', 'Potential insider threat or compromised account on ws-jdoe', '10.0.3.50', 'investigating');

-- ============================================================
-- KILL CHAIN EVENTS
-- ============================================================

INSERT INTO security.kill_chain_events (chain_id, phase, event_type, description, timestamp, sequence_order) VALUES
-- Chain 1: External attacker
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'reconnaissance', 'port_scan', 'Port scan across /24 subnet from external IP', NOW() - INTERVAL '6 hours', 1),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'reconnaissance', 'rdp_probe', 'RDP probing on multiple hosts', NOW() - INTERVAL '5 hours 55 minutes', 2),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'delivery', 'phishing', 'Phishing email sent to target user', NOW() - INTERVAL '5 hours 40 minutes', 3),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'exploitation', 'exploit', 'Zero-day exploit triggered via malicious document', NOW() - INTERVAL '5 hours 35 minutes', 4),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'installation', 'backdoor', 'Backdoor installed as scheduled task', NOW() - INTERVAL '4 hours 50 minutes', 5),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'command_and_control', 'c2_beacon', 'C2 beacon established to evil-c2.badactor.xyz', NOW() - INTERVAL '4 hours', 6),
((SELECT id FROM security.kill_chains WHERE src_ip = '203.0.113.45' LIMIT 1), 'actions_on_objectives', 'exfiltration', 'Data exfiltration to external server', NOW() - INTERVAL '1 hour', 7),
-- Chain 2: Insider/compromised
((SELECT id FROM security.kill_chains WHERE src_ip = '10.0.3.50' LIMIT 1), 'exploitation', 'credential_dump', 'Mimikatz credential dumping', NOW() - INTERVAL '5 hours 15 minutes', 1),
((SELECT id FROM security.kill_chains WHERE src_ip = '10.0.3.50' LIMIT 1), 'installation', 'persistence', 'Registry Run key modified for persistence', NOW() - INTERVAL '4 hours 45 minutes', 2),
((SELECT id FROM security.kill_chains WHERE src_ip = '10.0.3.50' LIMIT 1), 'command_and_control', 'dns_tunnel', 'DNS tunneling to exfil domain', NOW() - INTERVAL '3 hours 40 minutes', 3),
((SELECT id FROM security.kill_chains WHERE src_ip = '10.0.3.50' LIMIT 1), 'actions_on_objectives', 'lateral_movement', 'PsExec to production server', NOW() - INTERVAL '5 hours', 4),
((SELECT id FROM security.kill_chains WHERE src_ip = '10.0.3.50' LIMIT 1), 'actions_on_objectives', 'data_staging', 'Data staged for exfiltration on srv-prod-01', NOW() - INTERVAL '1 hour 30 minutes', 5);

-- ============================================================
-- SIGMA RULES
-- ============================================================

INSERT INTO security.sigma_rules (title, description, yaml_content, parsed_logic, status, severity, logsource_category, logsource_product, tags, author) VALUES
('Failed Login Detection', 'Detect multiple failed login attempts indicating brute force', E'title: Failed Login Detection\nstatus: production\nlevel: high\nlogsource:\n  category: authentication\n  product: any\ndetection:\n  selection:\n    action: failed_login\n  condition: selection | count() > 5\ntags:\n  - attack.credential_access\n  - attack.t1110', '{"selection": {"action": "failed_login"}, "condition": "selection | count() > 5"}', 'active', 'high', 'authentication', 'any', ARRAY['attack.credential_access', 'attack.t1110'], 'NodeGuard Security'),
('Suspicious PowerShell Execution', 'Detect PowerShell with encoded commands or bypass flags', E'title: Suspicious PowerShell Execution\nstatus: production\nlevel: critical\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|contains: powershell\n    CommandLine|contains:\n      - -enc\n      - -bypass\n      - -nop\n      - downloadstring\n  condition: selection\ntags:\n  - attack.execution\n  - attack.t1059.001', '{"selection": {"Image|contains": "powershell", "CommandLine|contains": ["-enc", "-bypass", "-nop", "downloadstring"]}, "condition": "selection"}', 'active', 'critical', 'process_creation', 'windows', ARRAY['attack.execution', 'attack.t1059.001'], 'NodeGuard Security'),
('Mimikatz Usage Detection', 'Detect Mimikatz tool usage for credential dumping', E'title: Mimikatz Usage Detection\nstatus: production\nlevel: critical\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|contains:\n      - mimikatz\n      - mimi.exe\n    CommandLine|contains:\n      - sekurlsa\n      - lsadump\n      - kerberos\n  condition: selection\ntags:\n  - attack.credential_access\n  - attack.t1003', '{"selection": {"Image|contains": ["mimikatz", "mimi.exe"], "CommandLine|contains": ["sekurlsa", "lsadump", "kerberos"]}, "condition": "selection"}', 'active', 'critical', 'process_creation', 'windows', ARRAY['attack.credential_access', 'attack.t1003'], 'NodeGuard Security'),
('Lateral Movement via PsExec', 'Detect PsExec usage for lateral movement', E'title: Lateral Movement via PsExec\nstatus: testing\nlevel: high\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|contains: psexec\n  filter:\n    User: SYSTEM\n  condition: selection and not filter\ntags:\n  - attack.lateral_movement\n  - attack.t1021.002', '{"selection": {"Image|contains": "psexec"}, "filter": {"User": "SYSTEM"}, "condition": "selection and not filter"}', 'testing', 'high', 'process_creation', 'windows', ARRAY['attack.lateral_movement', 'attack.t1021.002'], 'NodeGuard Security'),
('Data Exfiltration to Cloud Storage', 'Detect large data transfers to cloud storage providers', E'title: Data Exfiltration to Cloud Storage\nstatus: testing\nlevel: high\nlogsource:\n  category: network_connection\n  product: any\ndetection:\n  selection:\n    DestinationHostname|contains:\n      - dropbox.com\n      - drive.google.com\n      - onedrive.live.com\n      - mega.nz\n  condition: selection\ntags:\n  - attack.exfiltration\n  - attack.t1567', '{"selection": {"DestinationHostname|contains": ["dropbox.com", "drive.google.com", "onedrive.live.com", "mega.nz"]}, "condition": "selection"}', 'testing', 'high', 'network_connection', 'any', ARRAY['attack.exfiltration', 'attack.t1567'], 'NodeGuard Security');

-- ============================================================
-- CUSTOM DETECTION RULES
-- ============================================================

INSERT INTO security.custom_detection_rules (name, description, conditions, logic_operator, severity, enabled, created_by) VALUES
('After-Hours Admin Activity', 'Detect administrative actions performed outside business hours', '[{"field": "action", "operator": "equals", "value": "privilege_change"}, {"field": "severity", "operator": "equals", "value": "critical"}]', 'AND', 'high', true, 'analyst1'),
('External RDP Access', 'Detect RDP connections from external IP addresses', '[{"field": "dst_port", "operator": "equals", "value": "3389"}, {"field": "action", "operator": "equals", "value": "allowed"}]', 'AND', 'critical', true, 'analyst2'),
('Suspicious DNS Pattern', 'Detect DNS queries to suspicious or DGA-like domains', '[{"field": "action", "operator": "equals", "value": "dns_query"}, {"field": "message", "operator": "contains", "value": "suspicious"}]', 'AND', 'medium', true, 'analyst1');

-- ============================================================
-- YARA RULES
-- ============================================================

INSERT INTO security.yara_rules (name, description, rule_content, tags, enabled) VALUES
('Mimikatz Detection', 'Detects Mimikatz credential dumping tool', E'rule mimikatz_detection {\n    meta:\n        description = "Detects Mimikatz credential dumping tool"\n        author = "NodeGuard Security Team"\n        severity = "critical"\n    strings:\n        $s1 = "mimikatz" ascii nocase\n        $s2 = "sekurlsa" ascii\n        $s3 = "lsadump" ascii\n        $s4 = "kerberos::list" ascii\n        $s5 = "privilege::debug" ascii\n    condition:\n        2 of them\n}', ARRAY['malware', 'credential_theft', 'apt'], true),
('Cobalt Strike Beacon', 'Detects Cobalt Strike beacon indicators', E'rule cobalt_strike_beacon {\n    meta:\n        description = "Detects Cobalt Strike beacon patterns"\n        author = "NodeGuard Security Team"\n        severity = "critical"\n    strings:\n        $s1 = "beacon" ascii nocase\n        $s2 = "cobaltstrike" ascii nocase\n        $s3 = "%COMSPEC%" ascii\n        $s4 = "c2_beacon" ascii\n        $s5 = "reverse_shell" ascii\n    condition:\n        2 of them\n}', ARRAY['malware', 'c2', 'apt'], true);

-- ============================================================
-- CORRELATION RULES
-- ============================================================

INSERT INTO security.correlation_rules (name, description, event_sequence, window_seconds, threshold, severity, enabled) VALUES
('Recon to Exploitation Chain', 'Detect scan followed by exploit attempt from same source', '[{"field": "action", "operator": "equals", "value": "scan"}, {"field": "action", "operator": "equals", "value": "exploit"}]', 3600, 1, 'critical', true),
('Credential Theft to Lateral Movement', 'Detect credential dumping followed by lateral movement', '[{"field": "message", "operator": "contains", "value": "mimikatz"}, {"field": "message", "operator": "contains", "value": "psexec"}]', 7200, 1, 'critical', true);
