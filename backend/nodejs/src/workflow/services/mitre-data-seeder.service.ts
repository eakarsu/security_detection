import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MitreAttackTechnique, ThreatIntelSource } from '../entities/threat-intel.entity';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { WorkflowTemplateService } from './workflow-template.service';

@Injectable()
export class MitreDataSeederService {
  constructor(
    @InjectRepository(MitreAttackTechnique)
    private mitreRepo: Repository<MitreAttackTechnique>,
    
    @InjectRepository(ThreatIntelSource)
    private sourceRepo: Repository<ThreatIntelSource>,

    private workflowTemplateService: WorkflowTemplateService
  ) {}

  async seedMitreData(): Promise<void> {
    const count = await this.mitreRepo.count();
    if (count > 0) {
      console.log('MITRE ATT&CK data already exists, skipping seed');
      return;
    }

    console.log('Seeding MITRE ATT&CK data...');

    const mitreData = [
      {
        technique_id: 'T1190',
        name: 'Exploit Public-Facing Application',
        description: 'Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program using software, data, or commands in order to cause unintended or unanticipated behavior.',
        tactics: ['Initial Access'],
        kill_chain_phase: 'Delivery',
        mitigations: ['M1048', 'M1050', 'M1030'],
        data_sources: ['Application logs', 'Web logs', 'Network traffic']
      },
      {
        technique_id: 'T1059',
        name: 'Command and Scripting Interpreter',
        description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
        tactics: ['Execution'],
        kill_chain_phase: 'Installation',
        mitigations: ['M1038', 'M1042', 'M1049'],
        data_sources: ['Process monitoring', 'Command line logs']
      },
      {
        technique_id: 'T1486',
        name: 'Data Encrypted for Impact',
        description: 'Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability to system and network resources.',
        tactics: ['Impact'],
        kill_chain_phase: 'Actions on Objectives',
        mitigations: ['M1040', 'M1053'],
        data_sources: ['File monitoring', 'Process monitoring']
      },
      {
        technique_id: 'T1548',
        name: 'Abuse Elevation Control Mechanism',
        description: 'Adversaries may circumvent mechanisms designed to control elevate privileges to gain higher-level permissions.',
        tactics: ['Privilege Escalation', 'Defense Evasion'],
        kill_chain_phase: 'Exploitation',
        mitigations: ['M1047', 'M1026', 'M1018'],
        data_sources: ['Process monitoring', 'Windows event logs']
      },
      {
        technique_id: 'T1055',
        name: 'Process Injection',
        description: 'Adversaries may inject code into processes in order to evade process-based defenses as well as possibly elevate privileges.',
        tactics: ['Defense Evasion', 'Privilege Escalation'],
        kill_chain_phase: 'Exploitation',
        mitigations: ['M1040', 'M1019'],
        data_sources: ['Process monitoring', 'API monitoring']
      },
      {
        technique_id: 'T1041',
        name: 'Exfiltration Over C2 Channel',
        description: 'Adversaries may steal data by exfiltrating it over an existing command and control channel.',
        tactics: ['Exfiltration'],
        kill_chain_phase: 'Actions on Objectives',
        mitigations: ['M1057', 'M1031'],
        data_sources: ['Network traffic', 'Process monitoring']
      },
      {
        technique_id: 'T1005',
        name: 'Data from Local System',
        description: 'Adversaries may search local system sources, such as file systems or local databases, to find files of interest and sensitive data prior to Exfiltration.',
        tactics: ['Collection'],
        kill_chain_phase: 'Collection',
        mitigations: ['M1057', 'M1022'],
        data_sources: ['File monitoring', 'Process monitoring']
      },
      {
        technique_id: 'T1110',
        name: 'Brute Force',
        description: 'Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained.',
        tactics: ['Credential Access'],
        kill_chain_phase: 'Exploitation',
        mitigations: ['M1027', 'M1036', 'M1032'],
        data_sources: ['Authentication logs', 'Office 365 logs']
      },
      {
        technique_id: 'T1078',
        name: 'Valid Accounts',
        description: 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, Privilege Escalation, or Defense Evasion.',
        tactics: ['Defense Evasion', 'Persistence', 'Privilege Escalation', 'Initial Access'],
        kill_chain_phase: 'Exploitation',
        mitigations: ['M1015', 'M1026', 'M1027'],
        data_sources: ['Authentication logs', 'Process monitoring']
      },
      {
        technique_id: 'T1547',
        name: 'Boot or Logon Autostart Execution',
        description: 'Adversaries may configure system settings to automatically execute a program during system boot or logon to maintain persistence or gain higher-level privileges on compromised systems.',
        tactics: ['Persistence', 'Privilege Escalation'],
        kill_chain_phase: 'Installation',
        mitigations: ['M1022', 'M1042'],
        data_sources: ['Windows Registry', 'File monitoring']
      },
      {
        technique_id: 'T1027',
        name: 'Obfuscated Files or Information',
        description: 'Adversaries may attempt to make an executable or file difficult to discover or analyze by encrypting, encoding, or otherwise obfuscating its contents on the system or in transit.',
        tactics: ['Defense Evasion'],
        kill_chain_phase: 'Installation',
        mitigations: ['M1049', 'M1040'],
        data_sources: ['File monitoring', 'Malware reverse engineering']
      },
      {
        technique_id: 'T1566',
        name: 'Phishing',
        description: 'Adversaries may send phishing messages to gain access to victim systems. All forms of phishing are electronically delivered social engineering.',
        tactics: ['Initial Access'],
        kill_chain_phase: 'Delivery',
        mitigations: ['M1017', 'M1049', 'M1031'],
        data_sources: ['Email gateway', 'Web proxy', 'Network traffic']
      },
      {
        technique_id: 'T1204',
        name: 'User Execution',
        description: 'An adversary may rely upon specific actions by a user in order to gain execution. Users may be subjected to social engineering to get them to execute malicious code.',
        tactics: ['Execution'],
        kill_chain_phase: 'Exploitation',
        mitigations: ['M1017', 'M1038', 'M1040'],
        data_sources: ['Process monitoring', 'Anti-virus']
      }
    ];

    for (const data of mitreData) {
      const technique = this.mitreRepo.create({
        technique_id: data.technique_id,
        name: data.name,
        description: data.description,
        tactics: data.tactics,
        kill_chain_phase: data.kill_chain_phase,
        mitigations: data.mitigations,
        data_sources: data.data_sources,
        is_active: true
      });

      await this.mitreRepo.save(technique);
    }

    console.log(`Seeded ${mitreData.length} MITRE ATT&CK techniques`);
  }

  async seedThreatIntelSources(): Promise<void> {
    const count = await this.sourceRepo.count();
    if (count > 0) {
      console.log('Threat Intel sources already exist, skipping seed');
      return;
    }

    console.log('Seeding Threat Intelligence sources...');

    const sources = [
      {
        name: 'VirusTotal',
        description: 'Multi-engine antivirus and URL/file analysis service',
        api_endpoint: 'https://www.virustotal.com/vtapi/v2',
        api_key_name: 'virustotal_api_key',
        supported_indicators: ['ip', 'domain', 'hash', 'url'],
        reliability_score: 0.9,
        timeout_ms: 10000,
        rate_limit_ms: 15000, // 4 requests per minute for free tier
        is_enabled: true
      },
      {
        name: 'AbuseIPDB',
        description: 'IP address reputation and abuse reporting service',
        api_endpoint: 'https://api.abuseipdb.com/api/v2',
        api_key_name: 'abuseipdb_api_key',
        supported_indicators: ['ip'],
        reliability_score: 0.85,
        timeout_ms: 8000,
        rate_limit_ms: 1000, // 1000 requests per day for free tier
        is_enabled: true
      },
      {
        name: 'AlienVault OTX',
        description: 'Open Threat Exchange - collaborative threat intelligence',
        api_endpoint: 'https://otx.alienvault.com/api/v1',
        api_key_name: 'alienvault_api_key',
        supported_indicators: ['ip', 'domain', 'hash', 'url'],
        reliability_score: 0.8,
        timeout_ms: 10000,
        rate_limit_ms: 1000, // Rate limit varies by subscription
        is_enabled: true
      },
      {
        name: 'Hybrid Analysis',
        description: 'Free malware analysis service powered by Falcon Sandbox',
        api_endpoint: 'https://www.hybrid-analysis.com/api/v2',
        api_key_name: 'hybrid_analysis_api_key',
        supported_indicators: ['hash', 'domain', 'ip'],
        reliability_score: 0.75,
        timeout_ms: 15000,
        rate_limit_ms: 2000,
        is_enabled: false // Disabled by default, requires API key
      },
      {
        name: 'URLVoid',
        description: 'Website reputation checker and online security scanner',
        api_endpoint: 'http://api.urlvoid.com/1.0',
        api_key_name: 'urlvoid_api_key',
        supported_indicators: ['domain', 'url'],
        reliability_score: 0.7,
        timeout_ms: 8000,
        rate_limit_ms: 1000,
        is_enabled: false // Disabled by default, requires API key
      },
      {
        name: 'Shodan',
        description: 'Search engine for Internet-connected devices',
        api_endpoint: 'https://api.shodan.io',
        api_key_name: 'shodan_api_key',
        supported_indicators: ['ip'],
        reliability_score: 0.8,
        timeout_ms: 10000,
        rate_limit_ms: 1000,
        is_enabled: false // Disabled by default, requires API key
      }
    ];

    for (const sourceData of sources) {
      const source = this.sourceRepo.create(sourceData);
      await this.sourceRepo.save(source);
    }

    console.log(`Seeded ${sources.length} threat intelligence sources`);
  }

  async seedWorkflowTemplates(): Promise<void> {
    await this.workflowTemplateService.seedDefaultTemplates();
  }
}