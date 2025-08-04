#!/usr/bin/env python3
"""
NodeGuard Workflow-Only Testing Script
Tests workflows directly via REST API, bypassing Kafka processing
"""

import requests
import json
import time
from datetime import datetime
import uuid

class WorkflowTester:
    def __init__(self, node_api_url='http://localhost:3011'):
        self.node_api_url = node_api_url
        self.api_base = f"{node_api_url}/api/v1"
        
    def get_workflows(self):
        """Get all available workflows"""
        try:
            response = requests.get(f"{self.api_base}/workflows")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"❌ Failed to get workflows: {e}")
            return []
    
    def execute_workflow(self, workflow_id, input_data):
        """Execute a workflow directly with test data"""
        try:
            print(f"🚀 Executing workflow {workflow_id}...")
            
            response = requests.post(
                f"{self.api_base}/workflows/{workflow_id}/execute",
                json=input_data,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ Workflow executed successfully!")
            print(f"   Execution ID: {result.get('executionId', 'N/A')}")
            print(f"   Status: {result.get('status', 'N/A')}")
            print(f"   Duration: {result.get('executionTime', 'N/A')}ms")
            
            return result
            
        except requests.exceptions.HTTPError as e:
            print(f"❌ HTTP Error: {e}")
            print(f"   Response: {e.response.text}")
        except Exception as e:
            print(f"❌ Failed to execute workflow: {e}")
        
        return None
    
    def create_test_security_event(self, threat_type="SQL Injection", risk_score=9.2):
        """Create test security event data for workflow"""
        return {
            "event": {
                "event_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat() + 'Z',
                "event_type": "security_incident",
                "threat_type": threat_type,
                "severity": "HIGH" if risk_score >= 7.0 else "MEDIUM",
                "risk_score": risk_score,
                "source_ip": "192.168.1.100",
                "target_ip": "192.168.1.200",
                "destination_ip": "192.168.1.200",
                "user_id": "test_user",
                "endpoint": "/api/login",
                "detection_method": "Direct Workflow Test",
                "confidence": 0.95,
                "metadata": {
                    "test_mode": True,
                    "bypassed_kafka": True,
                    "direct_workflow_execution": True
                }
            },
            "triggerType": "manual_test",
            "triggerTime": datetime.utcnow().isoformat() + 'Z'
        }
    
    def test_high_risk_scenarios(self):
        """Test various high-risk security scenarios"""
        workflows = self.get_workflows()
        if not workflows:
            print("❌ No workflows found!")
            return
        
        # Use the first workflow for testing
        workflow_id = workflows[0]['id']
        workflow_name = workflows[0]['name']
        
        print(f"🎯 Testing workflow: {workflow_name} (ID: {workflow_id})")
        print("=" * 60)
        
        test_scenarios = [
            ("SQL Injection Attack", 9.2),
            ("Ransomware Activity", 9.8),
            ("Lateral Movement", 8.7),
            ("Data Exfiltration", 9.1),
            ("Privilege Escalation", 8.9),
            ("Zero-Day Exploit", 9.9),
            ("APT Command & Control", 9.5)
        ]
        
        results = []
        
        for threat_type, risk_score in test_scenarios:
            print(f"\n🔬 Testing: {threat_type} (Risk: {risk_score})")
            
            # Create test data
            test_data = self.create_test_security_event(threat_type, risk_score)
            
            # Execute workflow
            result = self.execute_workflow(workflow_id, test_data)
            
            if result:
                results.append({
                    'threat_type': threat_type,
                    'risk_score': risk_score,
                    'execution_id': result.get('executionId'),
                    'status': result.get('status'),
                    'duration_ms': result.get('executionTime')
                })
            
            # Small delay between tests
            time.sleep(2)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 WORKFLOW TEST SUMMARY")
        print("=" * 60)
        
        successful = len([r for r in results if r['status'] == 'completed'])
        total = len(results)
        
        print(f"Total Tests: {total}")
        print(f"Successful: {successful}")
        print(f"Success Rate: {successful/total*100:.1f}%")
        
        if successful > 0:
            avg_duration = sum(r['duration_ms'] for r in results if r['duration_ms']) / successful
            print(f"Average Duration: {avg_duration:.1f}ms")
        
        print("\n📋 Individual Results:")
        for result in results:
            status_icon = "✅" if result['status'] == 'completed' else "❌"
            print(f"   {status_icon} {result['threat_type']} - {result['status']} ({result['duration_ms']}ms)")
        
        return results
    
    def test_single_workflow(self, threat_type="SQL Injection", risk_score=9.2):
        """Test a single workflow execution"""
        workflows = self.get_workflows()
        if not workflows:
            print("❌ No workflows found!")
            return None
        
        workflow_id = workflows[0]['id']
        print(f"🎯 Testing single workflow execution")
        print(f"   Workflow: {workflows[0]['name']} (ID: {workflow_id})")
        print(f"   Threat: {threat_type} (Risk: {risk_score})")
        
        # Create and execute test
        test_data = self.create_test_security_event(threat_type, risk_score)
        return self.execute_workflow(workflow_id, test_data)

def main():
    print("NodeGuard Workflow-Only Testing")
    print("================================")
    print("⚠️  This bypasses Kafka and tests workflows directly")
    print("")
    
    tester = WorkflowTester()
    
    # Check if Node.js API is available
    try:
        workflows = tester.get_workflows()
        print(f"✅ Found {len(workflows)} workflows available")
        for wf in workflows:
            print(f"   - {wf['name']} (ID: {wf['id']})")
        print("")
    except Exception as e:
        print(f"❌ Cannot connect to Node.js API: {e}")
        print("   Make sure the Node.js API is running on port 3011")
        return
    
    # Ask user what to test
    choice = input("Choose test type:\n1. Single workflow test\n2. Comprehensive scenario testing\nEnter choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\n🔬 Single Workflow Test")
        print("-" * 30)
        result = tester.test_single_workflow("Privilege Escalation", 8.9)
        if result:
            print("\n✅ Test completed successfully!")
    
    elif choice == "2":
        print("\n🔬 Comprehensive Scenario Testing")
        print("-" * 40)
        results = tester.test_high_risk_scenarios()
        print(f"\n🎉 All tests completed! Check the workflow logs and incident count.")
    
    else:
        print("Invalid choice. Running single test...")
        tester.test_single_workflow()

if __name__ == "__main__":
    main()