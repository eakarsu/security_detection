import { SecurityNode, SecurityEvent, SecurityResult, SecurityNodeConfig, NodeSchema, ValidationResult } from '../interfaces/security-node.interface';
import { ThreatIntelligenceService } from '../services/threat-intelligence.service';
import { Inject } from '@nestjs/common';

interface MitreAttackResult {
  tactics: string[];
  techniques: string[];
  threat_actors: string[];
  kill_chain_phase: string;
  confidence: number;
  attack_pattern: string;
}

export class MitreAttackNode extends SecurityNode {
  id = 'mitre-attack-mapper';
  type = 'mitre-attack';
  category = 'mitre' as const;
  name = 'MITRE ATT&CK Mapper';
  description = 'Maps security events to MITRE ATT&CK tactics and techniques from database';
  version = '1.0.0';

  constructor(
    @Inject(ThreatIntelligenceService)
    private threatIntelService: ThreatIntelligenceService
  ) {
    super();
  }

  // MITRE ATT&CK mapping database (simplified)
  private readonly attackMappings = {
    'SQL Injection': {
      tactics: ['Initial Access', 'Execution'],
      techniques: ['T1190', 'T1059'],
      kill_chain_phase: 'Delivery',
      attack_pattern: 'Exploitation of Remote Services'
    },
    'Ransomware': {
      tactics: ['Impact', 'Execution', 'Defense Evasion'],
      techniques: ['T1486', 'T1059', 'T1027'],
      kill_chain_phase: 'Actions on Objectives',
      attack_pattern: 'Data Encrypted for Impact'
    },
    'Privilege Escalation': {
      tactics: ['Privilege Escalation', 'Defense Evasion'],
      techniques: ['T1548', 'T1055'],
      kill_chain_phase: 'Exploitation',
      attack_pattern: 'Abuse Elevation Control Mechanism'
    },
    'Data Exfiltration': {
      tactics: ['Exfiltration', 'Collection'],
      techniques: ['T1041', 'T1005'],
      kill_chain_phase: 'Actions on Objectives',
      attack_pattern: 'Exfiltration Over C2 Channel'
    },
    'Brute Force': {
      tactics: ['Credential Access', 'Initial Access'],
      techniques: ['T1110', 'T1078'],
      kill_chain_phase: 'Exploitation',
      attack_pattern: 'Brute Force'
    },
    'Malware': {
      tactics: ['Execution', 'Persistence', 'Defense Evasion'],
      techniques: ['T1059', 'T1547', 'T1027'],
      kill_chain_phase: 'Installation',
      attack_pattern: 'User Execution'
    },
    'Phishing': {
      tactics: ['Initial Access', 'Execution'],
      techniques: ['T1566', 'T1204'],
      kill_chain_phase: 'Delivery',
      attack_pattern: 'Phishing'
    }
  };

  private readonly threatActors = {
    'Advanced Persistent Threat': ['APT1', 'APT28', 'APT29'],
    'Ransomware': ['Conti', 'REvil', 'LockBit'],
    'SQL Injection': ['Script Kiddies', 'Cybercriminals'],
    'Phishing': ['APT28', 'FIN7', 'Lazarus Group']
  };

  async execute(input: SecurityEvent, config: SecurityNodeConfig): Promise<SecurityResult> {
    try {
      const threatType = input.threat_type || 'Unknown';
      
      // First try to get MITRE techniques from database
      let mitreData = await this.threatIntelService.getMitreAttackTechniques(threatType);
      
      // If no database data, fall back to static mappings
      let result: MitreAttackResult;
      
      if (mitreData && mitreData.length > 0) {
        // Use database-backed MITRE data
        const techniques = mitreData.map(t => t.technique_id);
        const tactics = [...new Set(mitreData.flatMap(t => t.tactics))];
        const confidence = this.calculateConfidenceFromDB(input, mitreData);
        
        result = {
          tactics,
          techniques,
          threat_actors: this.identifyThreatActors(threatType, input),
          kill_chain_phase: mitreData[0]?.kill_chain_phase || 'Unknown',
          confidence,
          attack_pattern: mitreData[0]?.name || 'Unknown'
        };
      } else {
        // Fall back to static mapping
        const mapping = this.attackMappings[threatType];
        
        if (!mapping) {
          return this.createResult(true, {
            tactics: ['Unknown'],
            techniques: ['Unknown'],
            threat_actors: [],
            kill_chain_phase: 'Unknown',
            confidence: 0.1,
            attack_pattern: 'Unknown',
            message: `No MITRE ATT&CK mapping found for threat type: ${threatType}`
          });
        }

        const confidence = this.calculateConfidence(input, mapping);
        const potentialActors = this.identifyThreatActors(threatType, input);

        result = {
          tactics: mapping.tactics,
          techniques: mapping.techniques,
          threat_actors: potentialActors,
          kill_chain_phase: mapping.kill_chain_phase,
          confidence,
          attack_pattern: mapping.attack_pattern
        };
      }

      return this.createResult(true, result, {
        confidence: result.confidence,
        recommendations: this.generateRecommendations(result, result.confidence)
      });

    } catch (error) {
      return this.createResult(false, null, {
        error: `MITRE ATT&CK mapping failed: ${error.message}`
      });
    }
  }

  configure(params: SecurityNodeConfig): ValidationResult {
    const schema = this.getSchema();
    return this.validateConfig(params, schema);
  }

  getSchema(): NodeSchema {
    return {
      inputs: [
        {
          name: 'threat_type',
          type: 'string',
          required: true,
          description: 'Type of security threat detected'
        },
        {
          name: 'risk_score',
          type: 'number',
          required: false,
          description: 'Risk score of the event (0-10)'
        },
        {
          name: 'source_ip',
          type: 'string',
          required: false,
          description: 'Source IP address of the threat'
        }
      ],
      outputs: [
        {
          name: 'tactics',
          type: 'array',
          description: 'MITRE ATT&CK tactics identified'
        },
        {
          name: 'techniques',
          type: 'array',
          description: 'MITRE ATT&CK techniques identified'
        },
        {
          name: 'threat_actors',
          type: 'array',
          description: 'Potential threat actors'
        },
        {
          name: 'kill_chain_phase',
          type: 'string',
          description: 'Cyber Kill Chain phase'
        },
        {
          name: 'confidence',
          type: 'number',
          description: 'Confidence score (0-1)'
        }
      ],
      config: [
        {
          name: 'confidence_threshold',
          type: 'number',
          required: false,
          default: 0.7,
          description: 'Minimum confidence threshold for alerts'
        },
        {
          name: 'include_threat_actors',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include threat actor identification'
        }
      ]
    };
  }

  private calculateConfidence(input: SecurityEvent, mapping: any): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on risk score
    if (input.risk_score) {
      confidence += (input.risk_score / 10) * 0.2;
    }
    
    // Adjust based on available data
    if (input.source_ip) confidence += 0.05;
    if (input.severity === 'critical') confidence += 0.1;
    if (input.severity === 'high') confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private identifyThreatActors(threatType: string, input: SecurityEvent): string[] {
    const actors = this.threatActors[threatType] || [];
    
    // Filter based on sophistication level
    if (input.risk_score && input.risk_score >= 8.0) {
      return actors.filter(actor => actor.includes('APT') || actor.includes('Lazarus'));
    }
    
    return actors;
  }

  private calculateConfidenceFromDB(input: SecurityEvent, mitreData: any[]): number {
    let confidence = 0.85; // Higher base confidence for database data
    
    // Adjust based on risk score
    if (input.risk_score) {
      confidence += (input.risk_score / 10) * 0.15;
    }
    
    // Adjust based on number of matching techniques
    if (mitreData.length > 3) {
      confidence += 0.05;
    }
    
    // Adjust based on available data
    if (input.source_ip) confidence += 0.02;
    if (input.severity === 'critical') confidence += 0.05;
    if (input.severity === 'high') confidence += 0.03;
    
    return Math.min(confidence, 1.0);
  }

  private generateRecommendations(result: MitreAttackResult, confidence: number): string[] {
    const recommendations = [
      `Monitor for additional ${result.tactics.join(' and ')} activities`,
      `Implement detection rules for techniques: ${result.techniques.join(', ')}`,
      `Review security controls for ${result.kill_chain_phase} phase`
    ];

    if (confidence > 0.8) {
      recommendations.push('High confidence detection - consider immediate response');
    }

    if (result.threat_actors && result.threat_actors.length > 0) {
      recommendations.push(`Investigate potential ${result.threat_actors.join(', ')} activity patterns`);
    }

    return recommendations;
  }
}