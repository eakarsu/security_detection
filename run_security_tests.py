#!/usr/bin/env python3
"""
NodeGuard Security Test Runner
Run comprehensive security test cases and monitor system response
"""

import sys
import os
import subprocess
import time
import requests
import json
from pathlib import Path

# Add the scripts directory to Python path
sys.path.append(str(Path(__file__).parent / "scripts" / "test"))

try:
    from security_test_cases import SecurityTestCaseGenerator
except ImportError:
    print("❌ Error: Could not import security test cases")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

class TestRunner:
    def __init__(self):
        self.api_base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.nodejs_api_url = "http://localhost:3001"
        
    def check_services(self):
        """Check if all services are running"""
        print("🔍 Checking service availability...")
        
        services = {
            "Python ML API": f"{self.api_base_url}/health",
            "Node.js API": f"{self.nodejs_api_url}/health",
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
        
        try:
            # Initialize test generator
            generator = SecurityTestCaseGenerator()
            
            # Run comprehensive test suite
            events = generator.run_comprehensive_test_suite(delay_seconds=2)
            
            print(f"\n✅ Successfully sent {len(events)} test events to Kafka")
            
            # Wait a bit for processing
            print("\n⏳ Waiting for events to be processed...")
            time.sleep(10)
            
            # Check API for processed events
            self.check_processed_events()
            
            # Run attack simulation
            print("\n🎯 Running multi-stage attack simulation...")
            generator.run_attack_simulation()
            
            generator.close()
            
            return True
            
        except Exception as e:
            print(f"❌ Error running test suite: {e}")
            return False
    
    def check_processed_events(self):
        """Check if events were processed by the API"""
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
