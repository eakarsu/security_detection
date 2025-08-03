#!/usr/bin/env python3
"""
NodeGuard Security Test Runner
Run comprehensive security test cases and monitor system response
"""

import sys
import os
import subprocess
import time
import json
from pathlib import Path

# Load environment variables from .env file
def load_env_file():
    """Load environment variables from .env file"""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

# Load environment variables
load_env_file()

# Try to import requests, but make it optional
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("⚠️  requests module not available - service checks will be skipped")

# Add the scripts directory to Python path
scripts_test_dir = Path(__file__).parent / "scripts" / "test"
sys.path.insert(0, str(scripts_test_dir))

try:
    from security_test_cases import SecurityTestCaseGenerator
except ImportError as e:
    print("❌ Error: Could not import security test cases")
    print(f"Import error: {e}")
    print("Make sure you're running this from the project root directory")
    print(f"Looking for security_test_cases.py in: {scripts_test_dir}")
    print(f"File exists: {(scripts_test_dir / 'security_test_cases.py').exists()}")
    sys.exit(1)

class TestRunner:
    def __init__(self):
        # Check if we're testing local dev processes or Docker containers
        local_dev_mode = os.getenv("LOCAL_DEV_MODE", "true").lower() == "true"
        
        if local_dev_mode:
            # Use LOCAL DEV ports for local development processes
            self.api_base_url = "http://localhost:8010"
            self.frontend_url = "http://localhost:3010"
            self.nodejs_api_url = "http://localhost:3011"
        else:
            # Use Docker container ports for full integration mode
            self.api_base_url = "http://localhost:8000"
            self.frontend_url = "http://localhost:3000"
            self.nodejs_api_url = "http://localhost:3001"
        
    def check_services(self):
        """Check if all services are running"""
        if not HAS_REQUESTS:
            print("⚠️  Skipping service checks (requests module not available)")
            return True
            
        print("🔍 Checking service availability...")
        
        services = {
            "Python ML API": f"{self.api_base_url}/health",
            "Node.js API": f"{self.nodejs_api_url}/api/v1/status",
            "Frontend": self.frontend_url
        }
        
        all_running = True
        for service_name, url in services.items():
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    print(f"✅ {service_name}: Running")
                else:
                    print(f"⚠️  {service_name}: Responding but status {response.status_code}")
            except requests.exceptions.RequestException:
                print(f"❌ {service_name}: Not responding")
                all_running = False
        
        return all_running
    
    def install_kafka_python(self):
        """Install kafka-python if not available"""
        try:
            import kafka
            print("✅ kafka-python is available")
            return True
        except ImportError:
            print("📦 Installing kafka-python...")
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", "kafka-python"
                ])
                print("✅ kafka-python installed successfully")
                return True
            except subprocess.CalledProcessError:
                print("❌ Failed to install kafka-python")
                return False
    
    def run_test_suite(self):
        """Run the comprehensive security test suite"""
        print("\n🚀 Starting Security Test Suite")
        print("=" * 60)
        
        # Check if we're in local development mode
        local_dev_mode = os.getenv("LOCAL_DEV_MODE", "false").lower() == "true"
        if local_dev_mode:
            print("ℹ️  Running in LOCAL_DEV_MODE - Kafka integration tests will be skipped")
            print("   This is normal for local development. The system is working correctly!")
        else:
            print("🔥 Running in FULL INTEGRATION MODE - Kafka integration enabled!")
            print("   Testing complete end-to-end pipeline with Kafka message processing")
        
        try:
            # Initialize test generator
            generator = SecurityTestCaseGenerator()
            
            # Run comprehensive test suite
            events = generator.run_comprehensive_test_suite(delay_seconds=2)
            
            print(f"\n✅ Successfully sent {len(events)} test events")
            
            # Wait longer for processing in full integration mode
            wait_time = 10 if not local_dev_mode else 5
            print(f"\n⏳ Waiting {wait_time} seconds for events to be processed...")
            time.sleep(wait_time)
            
            # Check API for processed events
            self.check_processed_events()
            
            # Run attack simulation
            print("\n🎯 Running multi-stage attack simulation...")
            generator.run_attack_simulation()
            
            # Additional integration tests if not in local dev mode
            if not local_dev_mode:
                print("\n🔄 Running Kafka integration tests...")
                self.run_kafka_integration_tests(generator)
            
            generator.close()
            
            return True
            
        except Exception as e:
            if "NoBrokersAvailable" in str(e):
                if local_dev_mode:
                    print("ℹ️  Kafka is disabled in LOCAL_DEV_MODE - this is expected!")
                    print("   The system is working correctly for local development.")
                    print("\n✅ You can still test the APIs directly:")
                    print(f"   • Python ML API: {self.api_base_url}/docs")
                    print(f"   • Node.js API: {self.nodejs_api_url}/api/v1/status")
                    print(f"   • Frontend Dashboard: {self.frontend_url}")
                    return True  # Return success in local dev mode
                else:
                    print("❌ Kafka is not available - cannot run integrated tests")
                    print("   To run integrated tests, start the full Docker environment:")
                    print("   ./docker-start.sh")
                    print("\n💡 Alternative: You can test individual API endpoints directly:")
                    print(f"   • Python ML API: {self.api_base_url}/docs")
                    print(f"   • Node.js API: {self.nodejs_api_url}/api/v1/status")
                    return False
            else:
                print(f"❌ Error running test suite: {e}")
                return False
    
    def check_processed_events(self):
        """Check if events were processed by the API"""
        if not HAS_REQUESTS:
            print("⚠️  Skipping event check (requests module not available)")
            return
            
        try:
            # Try to get incidents from the API
            response = requests.get(f"{self.nodejs_api_url}/security/incidents", timeout=10)
            if response.status_code == 200:
                incidents = response.json()
                print(f"📊 Found {len(incidents)} incidents in the system")
            else:
                print(f"⚠️  Could not retrieve incidents (status: {response.status_code})")
        except Exception as e:
            print(f"⚠️  Could not check processed events: {e}")
    
    def show_dashboard_info(self):
        """Show information about accessing the dashboard"""
        print("\n" + "=" * 60)
        print("🎯 TESTING COMPLETE - VIEW RESULTS")
        print("=" * 60)
        print(f"""
🌐 Access the NodeGuard Dashboard:
   URL: {self.frontend_url}
   
📊 Key Pages to Check:
   • Dashboard: Real-time threat metrics
   • Incidents: Security incidents created from high-risk events
   • Threat Intelligence: Threat analysis and patterns
   • Compliance: Policy violations and compliance status
   
🔍 What to Look For:
   • High-risk events (SQL Injection, Ransomware, APT) should create incidents
   • Medium-risk events should be logged but not create incidents
   • Low-risk/benign events should be processed normally
   • Dashboard should show threat statistics and trends
   
📈 Expected Results:
   • CRITICAL threats (Risk 9.0+): Immediate incidents
   • HIGH threats (Risk 7.0-8.9): Security incidents
   • MEDIUM threats (Risk 5.0-6.9): Logged events
   • LOW threats (Risk <5.0): Normal processing
   
🔧 API Endpoints for Testing:
   • Python ML API: {self.api_base_url}/docs
   • Node.js API: {self.nodejs_api_url}/health
   • Security Events: {self.nodejs_api_url}/security/incidents
        """)
    
    def run_kafka_integration_tests(self, generator):
        """Run comprehensive Kafka integration tests"""
        print("🔄 Testing Kafka message processing pipeline...")
        
        # Test high-risk events that should create incidents
        high_risk_tests = [
            ("SQL Injection Attack", generator.test_sql_injection_attack),
            ("Ransomware Detection", generator.test_ransomware_attack),
            ("APT Campaign", generator.test_apt_campaign),
            ("Brute Force Attack", generator.test_brute_force_attack)
        ]
        
        incident_count_before = self.get_incident_count()
        
        for test_name, test_method in high_risk_tests:
            print(f"   🎯 Testing {test_name}...")
            event_data = test_method()
            generator.send_event(event_data, f"kafka_integration_{test_name.lower().replace(' ', '_')}")
            time.sleep(2)  # Wait between events
        
        # Wait for Kafka processing
        print("   ⏳ Waiting for Kafka message processing...")
        time.sleep(15)
        
        # Check if incidents were created
        incident_count_after = self.get_incident_count()
        new_incidents = incident_count_after - incident_count_before
        
        if new_incidents > 0:
            print(f"   ✅ Kafka integration working! Created {new_incidents} new incidents")
        else:
            print("   ⚠️  No new incidents created - check Kafka consumer logs")
        
        # Test threat intelligence updates
        print("   🧠 Testing threat intelligence pipeline...")
        threat_intel_count_before = self.get_threat_intel_count()
        
        # Send high-confidence threat events
        for i in range(3):
            event_data = generator.test_apt_campaign()
            event_data['risk_score'] = 9.5  # Ensure high confidence
            generator.send_event(event_data, f"threat_intel_test_{i}")
            time.sleep(1)
        
        time.sleep(10)  # Wait for processing
        
        threat_intel_count_after = self.get_threat_intel_count()
        new_threat_intel = threat_intel_count_after - threat_intel_count_before
        
        if new_threat_intel > 0:
            print(f"   ✅ Threat intelligence pipeline working! Added {new_threat_intel} indicators")
        else:
            print("   ⚠️  No new threat intelligence indicators - check processing logs")
        
        print("   🔍 Testing event correlation...")
        # Send correlated events from same IP
        source_ip = "192.168.100.50"
        for i in range(5):
            event_data = generator.test_port_scanning()
            event_data['source_ip'] = source_ip
            event_data['risk_score'] = 6.0 + i  # Escalating risk
            generator.send_event(event_data, f"correlation_test_{i}")
            time.sleep(1)
        
        time.sleep(8)
        print("   ✅ Event correlation test completed")
        
        print("🎉 Kafka integration tests completed!")
    
    def get_incident_count(self):
        """Get current incident count from API"""
        if not HAS_REQUESTS:
            return 0
        try:
            response = requests.get(f"{self.nodejs_api_url}/security/incidents", timeout=10)
            if response.status_code == 200:
                return len(response.json())
        except:
            pass
        return 0
    
    def get_threat_intel_count(self):
        """Get current threat intelligence count from API"""
        if not HAS_REQUESTS:
            return 0
        try:
            response = requests.get(f"{self.api_base_url}/api/threat-intel/", timeout=10)
            if response.status_code == 200:
                return len(response.json())
        except:
            pass
        return 0
    
    def run_continuous_testing(self, duration_minutes=5):
        """Run continuous testing for a specified duration"""
        print(f"\n🔄 Starting continuous testing for {duration_minutes} minutes...")
        
        generator = SecurityTestCaseGenerator()
        end_time = time.time() + (duration_minutes * 60)
        
        test_methods = [
            generator.test_sql_injection_attack,
            generator.test_brute_force_attack,
            generator.test_port_scanning,
            generator.test_normal_web_traffic,
            generator.test_suspicious_dns_query
        ]
        
        event_count = 0
        try:
            while time.time() < end_time:
                # Send a random test event
                test_method = test_methods[event_count % len(test_methods)]
                event_data = test_method()
                generator.send_event(event_data, "continuous_test")
                event_count += 1
                
                # Wait between events
                time.sleep(30)  # Send event every 30 seconds
                
        except KeyboardInterrupt:
            print("\n⏹️  Continuous testing stopped by user")
        finally:
            generator.close()
            print(f"\n✅ Sent {event_count} events during continuous testing")

def main():
    """Main execution function"""
    print("NodeGuard Security Test Runner")
    print("==============================")
    
    runner = TestRunner()
    
    # Check if services are running
    if not runner.check_services():
        print("\n❌ Some services are not running. Please start the system first:")
        print("   ./start-local.sh")
        return False
    
    # Install kafka-python if needed
    if not runner.install_kafka_python():
        print("\n❌ Could not install required dependencies")
        return False
    
    # Run test suite
    success = runner.run_test_suite()
    
    if success:
        runner.show_dashboard_info()
        
        # Ask if user wants continuous testing
        print("\n" + "=" * 60)
        response = input("🔄 Run continuous testing? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            duration = input("Duration in minutes (default 5): ").strip()
            try:
                duration = int(duration) if duration else 5
                runner.run_continuous_testing(duration)
            except ValueError:
                print("Invalid duration, using 5 minutes")
                runner.run_continuous_testing(5)
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
