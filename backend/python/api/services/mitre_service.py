"""
NodeGuard AI Security Platform - MITRE ATT&CK Service
MITRE ATT&CK matrix data and mapping service
"""

import json
from typing import Dict, Any, List
import structlog

logger = structlog.get_logger(__name__)

# MITRE ATT&CK Matrix - 14 Tactics with key techniques
MITRE_MATRIX = [
    {
        "id": "TA0043", "name": "Reconnaissance",
        "techniques": [
            {"id": "T1595", "name": "Active Scanning", "description": "Adversaries scan victim IP blocks to gather information"},
            {"id": "T1592", "name": "Gather Victim Host Information", "description": "Gather information about victim hosts"},
            {"id": "T1589", "name": "Gather Victim Identity Information", "description": "Gather credentials, email addresses, names"},
            {"id": "T1590", "name": "Gather Victim Network Information", "description": "Gather network configuration and topology"},
            {"id": "T1591", "name": "Gather Victim Org Information", "description": "Gather business relationships and structure"},
            {"id": "T1598", "name": "Phishing for Information", "description": "Send phishing messages to elicit information"},
            {"id": "T1597", "name": "Search Closed Sources", "description": "Search private data sources for victim info"},
            {"id": "T1596", "name": "Search Open Technical Databases", "description": "Search WHOIS, DNS, certificate databases"},
            {"id": "T1593", "name": "Search Open Websites/Domains", "description": "Search social media, code repos for info"},
            {"id": "T1594", "name": "Search Victim-Owned Websites", "description": "Search websites owned by the victim"},
        ]
    },
    {
        "id": "TA0042", "name": "Resource Development",
        "techniques": [
            {"id": "T1583", "name": "Acquire Infrastructure", "description": "Purchase or rent infrastructure for operations"},
            {"id": "T1586", "name": "Compromise Accounts", "description": "Compromise existing accounts for operations"},
            {"id": "T1584", "name": "Compromise Infrastructure", "description": "Compromise third-party infrastructure"},
            {"id": "T1587", "name": "Develop Capabilities", "description": "Build malware, exploits, certificates"},
            {"id": "T1585", "name": "Establish Accounts", "description": "Create accounts on services for operations"},
            {"id": "T1588", "name": "Obtain Capabilities", "description": "Purchase or steal malware, tools, exploits"},
            {"id": "T1608", "name": "Stage Capabilities", "description": "Stage capabilities on infrastructure"},
        ]
    },
    {
        "id": "TA0001", "name": "Initial Access",
        "techniques": [
            {"id": "T1189", "name": "Drive-by Compromise", "description": "Gain access through user visiting a compromised website"},
            {"id": "T1190", "name": "Exploit Public-Facing Application", "description": "Exploit vulnerability in internet-facing application"},
            {"id": "T1133", "name": "External Remote Services", "description": "Leverage VPNs, Citrix, and other remote access services"},
            {"id": "T1200", "name": "Hardware Additions", "description": "Introduce hardware devices to gain access"},
            {"id": "T1566", "name": "Phishing", "description": "Send phishing messages to gain access to victim systems"},
            {"id": "T1091", "name": "Replication Through Removable Media", "description": "Spread via USB drives and removable media"},
            {"id": "T1195", "name": "Supply Chain Compromise", "description": "Manipulate products or delivery mechanisms before receipt"},
            {"id": "T1199", "name": "Trusted Relationship", "description": "Breach organizations via trusted third party relationships"},
            {"id": "T1078", "name": "Valid Accounts", "description": "Use legitimate credentials to gain access"},
        ]
    },
    {
        "id": "TA0002", "name": "Execution",
        "techniques": [
            {"id": "T1059", "name": "Command and Scripting Interpreter", "description": "Abuse command-line interpreters to execute commands"},
            {"id": "T1203", "name": "Exploitation for Client Execution", "description": "Exploit vulnerabilities in client applications"},
            {"id": "T1559", "name": "Inter-Process Communication", "description": "Abuse IPC mechanisms for execution"},
            {"id": "T1106", "name": "Native API", "description": "Interact with the native OS API for execution"},
            {"id": "T1053", "name": "Scheduled Task/Job", "description": "Abuse task scheduling for execution"},
            {"id": "T1129", "name": "Shared Modules", "description": "Execute payloads via loading shared modules"},
            {"id": "T1072", "name": "Software Deployment Tools", "description": "Use enterprise software deployment tools"},
            {"id": "T1569", "name": "System Services", "description": "Abuse system services for execution"},
            {"id": "T1204", "name": "User Execution", "description": "Rely on user interaction for execution"},
            {"id": "T1047", "name": "Windows Management Instrumentation", "description": "Abuse WMI for execution"},
        ]
    },
    {
        "id": "TA0003", "name": "Persistence",
        "techniques": [
            {"id": "T1098", "name": "Account Manipulation", "description": "Manipulate accounts to maintain access"},
            {"id": "T1197", "name": "BITS Jobs", "description": "Abuse BITS for persistence and execution"},
            {"id": "T1547", "name": "Boot or Logon Autostart Execution", "description": "Configure system to auto-execute at boot/logon"},
            {"id": "T1037", "name": "Boot or Logon Initialization Scripts", "description": "Use scripts to establish persistence at boot/logon"},
            {"id": "T1136", "name": "Create Account", "description": "Create accounts for persistence"},
            {"id": "T1543", "name": "Create or Modify System Process", "description": "Create/modify system-level processes for persistence"},
            {"id": "T1546", "name": "Event Triggered Execution", "description": "Establish persistence using system event triggers"},
            {"id": "T1574", "name": "Hijack Execution Flow", "description": "Hijack the way the OS runs programs"},
            {"id": "T1556", "name": "Modify Authentication Process", "description": "Modify authentication mechanisms for persistence"},
            {"id": "T1137", "name": "Office Application Startup", "description": "Leverage Office application features for persistence"},
        ]
    },
    {
        "id": "TA0004", "name": "Privilege Escalation",
        "techniques": [
            {"id": "T1548", "name": "Abuse Elevation Control Mechanism", "description": "Circumvent mechanisms designed to control elevation"},
            {"id": "T1134", "name": "Access Token Manipulation", "description": "Modify access tokens to operate under different contexts"},
            {"id": "T1068", "name": "Exploitation for Privilege Escalation", "description": "Exploit vulnerabilities to escalate privileges"},
            {"id": "T1484", "name": "Domain Policy Modification", "description": "Modify domain trust settings or group policy"},
            {"id": "T1611", "name": "Escape to Host", "description": "Escape from a container to the underlying host"},
            {"id": "T1055", "name": "Process Injection", "description": "Inject code into processes for privilege escalation"},
            {"id": "T1078", "name": "Valid Accounts", "description": "Use legitimate accounts with higher privileges"},
        ]
    },
    {
        "id": "TA0005", "name": "Defense Evasion",
        "techniques": [
            {"id": "T1140", "name": "Deobfuscate/Decode Files", "description": "Deobfuscate or decode data to reveal payload"},
            {"id": "T1006", "name": "Direct Volume Access", "description": "Directly access a volume to bypass file access controls"},
            {"id": "T1562", "name": "Impair Defenses", "description": "Disable or modify security tools and features"},
            {"id": "T1070", "name": "Indicator Removal", "description": "Delete or modify artifacts to remove evidence"},
            {"id": "T1036", "name": "Masquerading", "description": "Manipulate features to make malware appear legitimate"},
            {"id": "T1027", "name": "Obfuscated Files or Information", "description": "Encrypt or encode payloads to evade detection"},
            {"id": "T1553", "name": "Subvert Trust Controls", "description": "Undermine security controls that rely on trust"},
            {"id": "T1218", "name": "System Binary Proxy Execution", "description": "Use trusted binaries to proxy execution of malware"},
            {"id": "T1112", "name": "Modify Registry", "description": "Modify the Windows Registry to hide configuration info"},
            {"id": "T1497", "name": "Virtualization/Sandbox Evasion", "description": "Employ techniques to detect and avoid virtualization"},
        ]
    },
    {
        "id": "TA0006", "name": "Credential Access",
        "techniques": [
            {"id": "T1110", "name": "Brute Force", "description": "Use brute force techniques to attempt access"},
            {"id": "T1555", "name": "Credentials from Password Stores", "description": "Search password stores for credentials"},
            {"id": "T1212", "name": "Exploitation for Credential Access", "description": "Exploit software vulnerabilities to collect credentials"},
            {"id": "T1187", "name": "Forced Authentication", "description": "Force authentication to capture credentials"},
            {"id": "T1056", "name": "Input Capture", "description": "Use methods to capture user input for credentials"},
            {"id": "T1557", "name": "Adversary-in-the-Middle", "description": "Position between two entities to intercept data"},
            {"id": "T1003", "name": "OS Credential Dumping", "description": "Dump credentials from the operating system"},
            {"id": "T1528", "name": "Steal Application Access Token", "description": "Steal application access tokens for lateral movement"},
            {"id": "T1558", "name": "Steal or Forge Kerberos Tickets", "description": "Steal or forge Kerberos tickets for access"},
            {"id": "T1539", "name": "Steal Web Session Cookie", "description": "Steal web session cookies for impersonation"},
        ]
    },
    {
        "id": "TA0007", "name": "Discovery",
        "techniques": [
            {"id": "T1087", "name": "Account Discovery", "description": "Get a listing of accounts on a system or domain"},
            {"id": "T1010", "name": "Application Window Discovery", "description": "Get a listing of opened application windows"},
            {"id": "T1217", "name": "Browser Information Discovery", "description": "Enumerate browser bookmarks to learn about targets"},
            {"id": "T1580", "name": "Cloud Infrastructure Discovery", "description": "Discover cloud infrastructure resources"},
            {"id": "T1046", "name": "Network Service Discovery", "description": "Get a listing of services running on remote hosts"},
            {"id": "T1135", "name": "Network Share Discovery", "description": "Look for shared folders and drives on remote systems"},
            {"id": "T1057", "name": "Process Discovery", "description": "Get information about running processes"},
            {"id": "T1018", "name": "Remote System Discovery", "description": "Get a listing of other systems on the network"},
            {"id": "T1082", "name": "System Information Discovery", "description": "Get detailed information about the operating system"},
            {"id": "T1016", "name": "System Network Configuration Discovery", "description": "Look for network configuration and settings"},
        ]
    },
    {
        "id": "TA0008", "name": "Lateral Movement",
        "techniques": [
            {"id": "T1210", "name": "Exploitation of Remote Services", "description": "Exploit remote services to gain access to systems"},
            {"id": "T1534", "name": "Internal Spearphishing", "description": "Spearphishing after gaining access to internal network"},
            {"id": "T1570", "name": "Lateral Tool Transfer", "description": "Transfer tools between systems in compromised network"},
            {"id": "T1021", "name": "Remote Services", "description": "Use remote services like SSH, RDP, SMB for movement"},
            {"id": "T1080", "name": "Taint Shared Content", "description": "Add content to shared storage to spread malware"},
            {"id": "T1550", "name": "Use Alternate Authentication Material", "description": "Use alternate auth material like hashes or tickets"},
        ]
    },
    {
        "id": "TA0009", "name": "Collection",
        "techniques": [
            {"id": "T1560", "name": "Archive Collected Data", "description": "Compress and/or encrypt collected data for exfil"},
            {"id": "T1123", "name": "Audio Capture", "description": "Leverage computer peripherals to capture audio"},
            {"id": "T1119", "name": "Automated Collection", "description": "Use automated techniques to collect internal data"},
            {"id": "T1185", "name": "Browser Session Hijacking", "description": "Take advantage of browser sessions for data collection"},
            {"id": "T1115", "name": "Clipboard Data", "description": "Collect data stored in the clipboard"},
            {"id": "T1530", "name": "Data from Cloud Storage", "description": "Access data from cloud storage solutions"},
            {"id": "T1213", "name": "Data from Information Repositories", "description": "Collect data from information repositories"},
            {"id": "T1005", "name": "Data from Local System", "description": "Collect data from the local system"},
            {"id": "T1039", "name": "Data from Network Shared Drive", "description": "Collect data from network shared drives"},
            {"id": "T1025", "name": "Data from Removable Media", "description": "Collect data from removable media"},
        ]
    },
    {
        "id": "TA0011", "name": "Command and Control",
        "techniques": [
            {"id": "T1071", "name": "Application Layer Protocol", "description": "Communicate using OSI application layer protocols"},
            {"id": "T1132", "name": "Data Encoding", "description": "Encode data to make C2 traffic less conspicuous"},
            {"id": "T1001", "name": "Data Obfuscation", "description": "Obfuscate C2 communications to make detection harder"},
            {"id": "T1568", "name": "Dynamic Resolution", "description": "Dynamically establish C2 connections using calculated addresses"},
            {"id": "T1573", "name": "Encrypted Channel", "description": "Employ encryption to conceal C2 traffic"},
            {"id": "T1008", "name": "Fallback Channels", "description": "Use fallback C2 channels if primary channel is compromised"},
            {"id": "T1105", "name": "Ingress Tool Transfer", "description": "Transfer tools from external systems into compromised network"},
            {"id": "T1104", "name": "Multi-Stage Channels", "description": "Create multiple stages for C2 channels"},
            {"id": "T1095", "name": "Non-Application Layer Protocol", "description": "Use non-application layer protocols for communication"},
            {"id": "T1572", "name": "Protocol Tunneling", "description": "Tunnel network communications through another protocol"},
        ]
    },
    {
        "id": "TA0010", "name": "Exfiltration",
        "techniques": [
            {"id": "T1020", "name": "Automated Exfiltration", "description": "Automatically exfiltrate data without user interaction"},
            {"id": "T1030", "name": "Data Transfer Size Limits", "description": "Exfiltrate in fixed-size chunks to avoid detection"},
            {"id": "T1048", "name": "Exfiltration Over Alternative Protocol", "description": "Steal data over different protocol than C2"},
            {"id": "T1041", "name": "Exfiltration Over C2 Channel", "description": "Steal data over the existing C2 channel"},
            {"id": "T1011", "name": "Exfiltration Over Other Network Medium", "description": "Exfiltrate via different network medium"},
            {"id": "T1052", "name": "Exfiltration Over Physical Medium", "description": "Steal data via physical medium like USB"},
            {"id": "T1567", "name": "Exfiltration Over Web Service", "description": "Use web services like cloud storage for exfil"},
            {"id": "T1029", "name": "Scheduled Transfer", "description": "Schedule data exfiltration at certain times"},
            {"id": "T1537", "name": "Transfer Data to Cloud Account", "description": "Exfiltrate data to a cloud account the adversary controls"},
        ]
    },
    {
        "id": "TA0040", "name": "Impact",
        "techniques": [
            {"id": "T1531", "name": "Account Access Removal", "description": "Interrupt availability by inhibiting access to accounts"},
            {"id": "T1485", "name": "Data Destruction", "description": "Destroy data and files on specific systems or network"},
            {"id": "T1486", "name": "Data Encrypted for Impact", "description": "Encrypt data on target systems to disrupt availability (ransomware)"},
            {"id": "T1565", "name": "Data Manipulation", "description": "Modify data to influence business processes"},
            {"id": "T1491", "name": "Defacement", "description": "Modify visual content to intimidate or claim credit"},
            {"id": "T1561", "name": "Disk Wipe", "description": "Wipe the contents of disks"},
            {"id": "T1499", "name": "Endpoint Denial of Service", "description": "Perform DoS attacks targeting endpoint resources"},
            {"id": "T1495", "name": "Firmware Corruption", "description": "Overwrite or corrupt firmware of system BIOS/UEFI"},
            {"id": "T1490", "name": "Inhibit System Recovery", "description": "Delete or disable recovery features"},
            {"id": "T1498", "name": "Network Denial of Service", "description": "Perform DoS attacks targeting network bandwidth"},
            {"id": "T1496", "name": "Resource Hijacking", "description": "Leverage resources for tasks like cryptomining"},
            {"id": "T1489", "name": "Service Stop", "description": "Stop or disable services on a system"},
        ]
    },
]


def get_matrix() -> List[Dict[str, Any]]:
    """Return the full MITRE ATT&CK matrix"""
    return MITRE_MATRIX


async def get_technique_coverage(conn) -> Dict[str, Any]:
    """Get detection coverage across the MITRE matrix"""
    mappings = await conn.fetch("""
        SELECT DISTINCT tactic_id, technique_id, COUNT(*) as detection_count
        FROM security.mitre_mappings
        GROUP BY tactic_id, technique_id
    """)

    covered = {}
    for row in mappings:
        key = f"{row['tactic_id']}:{row['technique_id']}"
        covered[key] = row['detection_count']

    total_techniques = sum(len(t['techniques']) for t in MITRE_MATRIX)
    covered_count = len(covered)

    return {
        'total_techniques': total_techniques,
        'covered_count': covered_count,
        'coverage_percentage': round(covered_count / total_techniques * 100, 1) if total_techniques > 0 else 0,
        'covered_techniques': covered,
    }


def map_event_to_technique(event_type: str) -> List[Dict[str, str]]:
    """Auto-suggest MITRE mappings based on event type keywords"""
    event_lower = event_type.lower()

    keyword_mappings = {
        'brute_force': [('TA0006', 'T1110', 'Credential Access', 'Brute Force')],
        'failed_login': [('TA0006', 'T1110', 'Credential Access', 'Brute Force')],
        'port_scan': [('TA0007', 'T1046', 'Discovery', 'Network Service Discovery')],
        'scan': [('TA0043', 'T1595', 'Reconnaissance', 'Active Scanning')],
        'phishing': [('TA0001', 'T1566', 'Initial Access', 'Phishing')],
        'sql_injection': [('TA0001', 'T1190', 'Initial Access', 'Exploit Public-Facing Application')],
        'xss': [('TA0001', 'T1190', 'Initial Access', 'Exploit Public-Facing Application')],
        'lateral_movement': [('TA0008', 'T1021', 'Lateral Movement', 'Remote Services')],
        'privilege_escalation': [('TA0004', 'T1068', 'Privilege Escalation', 'Exploitation for Privilege Escalation')],
        'exfiltration': [('TA0010', 'T1048', 'Exfiltration', 'Exfiltration Over Alternative Protocol')],
        'data_exfil': [('TA0010', 'T1041', 'Exfiltration', 'Exfiltration Over C2 Channel')],
        'ransomware': [('TA0040', 'T1486', 'Impact', 'Data Encrypted for Impact')],
        'c2': [('TA0011', 'T1071', 'Command and Control', 'Application Layer Protocol')],
        'command_and_control': [('TA0011', 'T1071', 'Command and Control', 'Application Layer Protocol')],
        'persistence': [('TA0003', 'T1547', 'Persistence', 'Boot or Logon Autostart Execution')],
        'credential_dump': [('TA0006', 'T1003', 'Credential Access', 'OS Credential Dumping')],
        'mimikatz': [('TA0006', 'T1003', 'Credential Access', 'OS Credential Dumping')],
        'powershell': [('TA0002', 'T1059', 'Execution', 'Command and Scripting Interpreter')],
        'wmi': [('TA0002', 'T1047', 'Execution', 'Windows Management Instrumentation')],
        'ddos': [('TA0040', 'T1498', 'Impact', 'Network Denial of Service')],
        'dos': [('TA0040', 'T1499', 'Impact', 'Endpoint Denial of Service')],
        'insider': [('TA0009', 'T1005', 'Collection', 'Data from Local System')],
    }

    suggestions = []
    for keyword, mappings in keyword_mappings.items():
        if keyword in event_lower:
            for tactic_id, technique_id, tactic_name, technique_name in mappings:
                suggestions.append({
                    'tactic_id': tactic_id,
                    'technique_id': technique_id,
                    'tactic_name': tactic_name,
                    'technique_name': technique_name,
                })

    return suggestions
