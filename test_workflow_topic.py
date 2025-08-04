#!/usr/bin/env python3
"""
NodeGuard Workflow Topic Testing Script
Sends events to workflow.test topic to test workflows separately from system processing
"""

import json
import time
import uuid
from datetime import datetime
from scripts.test.security_test_cases import SecurityTestCaseGenerator

class WorkflowTopicTester(SecurityTestCaseGenerator):
    def __init__(self, kafka_bootstrap_servers='localhost:9092'):
        super().__init__(kafka_bootstrap_servers)
        self.workflow_topic = 'workflow.test'  # Different topic for workflow testing
        
    def send_workflow_event(self, event_data, event_type="workflow_test"):
        """Send event to workflow.test topic"""
        key = f"{event_type}_{uuid.uuid4().hex[:8]}"
        self.producer.send(self.workflow_topic, key=key, value=event_data)
        print(f"🔄 Sent to WORKFLOW topic: {event_data.get('threat_type', 'Unknown')} - Risk: {event_data.get('risk_score', 'N/A')}")
        return key
    
    def test_workflow_only(self):
        """Test workflow processing only (not system processing)"""
        print("🎯 Testing WORKFLOW ONLY (via workflow.test topic)")
        print("=" * 60)
        print("📌 This will trigger workflows but NOT system Kafka processing")
        print("📌 System continues processing security.events topic separately")
        print("")
        
        test_cases = [
            # High-risk events that should trigger workflows
            ("SQL Injection Attack", self.test_sql_injection_attack),
            ("Ransomware Activity", self.test_ransomware_activity),
            ("Privilege Escalation", self.test_privilege_escalation),
            ("Data Exfiltration", self.test_data_exfiltration),
        ]
        
        sent_events = []
        
        for test_name, test_func in test_cases:
            print(f"🔄 Sending to workflow.test: {test_name}")
            event_data = test_func()
            key = self.send_workflow_event(event_data, "workflow_test")
            sent_events.append((key, test_name, event_data))
            time.sleep(3)  # Wait between events
        
        print(f"\n✅ Sent {len(sent_events)} events to workflow.test topic")
        print("🔍 Check workflow logs and incident count!")
        print("\n📊 Events sent:")
        for _, name, data in sent_events:
            print(f"   - {name}: Risk {data.get('risk_score')}")
        
        return sent_events

def main():
    print("NodeGuard Workflow Topic Testing")
    print("================================")
    print("🎯 This tests WORKFLOWS ONLY via separate Kafka topic")
    print("📌 System processing (security.events) continues independently")
    print("📌 Workflows listen to (workflow.test) topic")
    print("")
    
    tester = WorkflowTopicTester()
    
    try:
        # Test workflow-specific processing
        events = tester.test_workflow_only()
        
        print("\n" + "=" * 60)
        print("📋 NEXT STEPS")
        print("=" * 60)
        print("1. 🔍 Monitor workflow logs: tail -f logs/nodejs-api.log")
        print("2. 📊 Check incident count: curl http://localhost:8010/api/incidents/count")
        print("3. 🎯 Workflows process these events independently")
        print("4. 🔄 System continues processing run_security_tests.py events")
        print("")
        print("✅ Workflow topic testing completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        tester.close()

if __name__ == "__main__":
    main()