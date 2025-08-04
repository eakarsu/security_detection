import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MitreAttackTechnique } from '../entities/threat-intel.entity';

export interface MitreTechniqueDetails {
  technique_id: string;
  name: string;
  description: string;
  tactics: string[];
  kill_chain_phase: string;
  mitigations: string[];
  data_sources: string[];
  sub_techniques?: MitreTechniqueDetails[];
  threat_actors?: string[];
  software?: string[];
  detection_rules?: string[];
}

export interface MitreMapping {
  threat_type: string;
  confidence: number;
  primary_technique: string;
  techniques: string[];
  tactics: string[];
  kill_chain_phases: string[];
  threat_actors: string[];
  detection_recommendations: string[];
  mitigation_recommendations: string[];
}

@Injectable()
export class MitreIntegrationService {
  constructor(
    @InjectRepository(MitreAttackTechnique)
    private mitreRepo: Repository<MitreAttackTechnique>
  ) {}

  async getTechniqueById(techniqueId: string): Promise<MitreTechniqueDetails | null> {
    const technique = await this.mitreRepo.findOne({
      where: { technique_id: techniqueId, is_active: true }
    });

    if (!technique) {
      return null;
    }

    return {
      technique_id: technique.technique_id,
      name: technique.name,
      description: technique.description,
      tactics: technique.tactics,
      kill_chain_phase: technique.kill_chain_phase,
      mitigations: technique.mitigations || [],
      data_sources: technique.data_sources || [],
      threat_actors: this.getThreatActorsForTechnique(technique.technique_id),
      detection_rules: this.getDetectionRulesForTechnique(technique.technique_id)
    };
  }

  async getTechniquesByTactic(tactic: string): Promise<MitreTechniqueDetails[]> {
    const techniques = await this.mitreRepo.createQueryBuilder('technique')
      .where('technique.is_active = :active', { active: true })
      .andWhere('technique.tactics @> :tactic', { tactic: [tactic] })
      .orderBy('technique.technique_id', 'ASC')
      .getMany();

    return techniques.map(t => ({
      technique_id: t.technique_id,
      name: t.name,
      description: t.description,
      tactics: t.tactics,
      kill_chain_phase: t.kill_chain_phase,
      mitigations: t.mitigations || [],
      data_sources: t.data_sources || []
    }));
  }

  async getAllTactics(): Promise<Array<{ name: string; techniques_count: number; description: string }>> {
    const techniques = await this.mitreRepo.find({ where: { is_active: true } });
    
    const tacticsMap = new Map<string, number>();
    techniques.forEach(technique => {
      technique.tactics.forEach(tactic => {
        tacticsMap.set(tactic, (tacticsMap.get(tactic) || 0) + 1);
      });
    });

    const tacticsInfo = [
      { name: 'Initial Access', description: 'The adversary is trying to get into your network' },
      { name: 'Execution', description: 'The adversary is trying to run malicious code' },
      { name: 'Persistence', description: 'The adversary is trying to maintain their foothold' },
      { name: 'Privilege Escalation', description: 'The adversary is trying to gain higher-level permissions' },
      { name: 'Defense Evasion', description: 'The adversary is trying to avoid being detected' },
      { name: 'Credential Access', description: 'The adversary is trying to steal account names and passwords' },
      { name: 'Discovery', description: 'The adversary is trying to figure out your environment' },
      { name: 'Lateral Movement', description: 'The adversary is trying to move through your environment' },
      { name: 'Collection', description: 'The adversary is trying to gather data of interest' },
      { name: 'Command and Control', description: 'The adversary is trying to communicate with compromised systems' },
      { name: 'Exfiltration', description: 'The adversary is trying to steal data' },
      { name: 'Impact', description: 'The adversary is trying to manipulate, interrupt, or destroy systems and data' }
    ];

    return tacticsInfo.map(info => ({
      name: info.name,
      techniques_count: tacticsMap.get(info.name) || 0,
      description: info.description
    }));
  }

  async mapThreatToMitre(threatData: {
    threat_type: string;
    indicators: string[];
    behavior_patterns: string[];
    source_info?: any;
  }): Promise<MitreMapping> {
    const mappings = await this.getStaticMappings();
    const threatType = threatData.threat_type.toLowerCase();
    
    // Find best matching techniques
    let primaryTechnique = '';
    let techniques: string[] = [];
    let tactics: string[] = [];
    let confidence = 0.5;

    // Check static mappings first
    for (const [pattern, mapping] of Object.entries(mappings)) {
      if (threatType.includes(pattern)) {
        techniques = mapping.techniques;
        tactics = mapping.tactics;
        primaryTechnique = mapping.primary_technique;
        confidence = 0.8;
        break;
      }
    }

    // Enhanced mapping based on behavior patterns
    if (threatData.behavior_patterns.length > 0) {
      const behaviorMappings = await this.mapBehaviorPatterns(threatData.behavior_patterns);
      if (behaviorMappings.length > 0) {
        const additionalTechniques = behaviorMappings.flatMap(m => m.techniques);
        techniques = [...new Set([...techniques, ...additionalTechniques])];
        confidence = Math.min(confidence + 0.1, 0.95);
      }
    }

    // Get kill chain phases
    const killChainPhases = await this.getKillChainPhases(techniques);

    // Get threat actors
    const threatActors = this.getThreatActorsForThreatType(threatData.threat_type);

    // Generate recommendations
    const detectionRecommendations = await this.generateDetectionRecommendations(techniques);
    const mitigationRecommendations = await this.generateMitigationRecommendations(techniques);

    return {
      threat_type: threatData.threat_type,
      confidence,
      primary_technique: primaryTechnique,
      techniques,
      tactics,
      kill_chain_phases: killChainPhases,
      threat_actors,
      detection_recommendations,
      mitigation_recommendations
    };
  }

  async getDetectionRulesForTechniques(techniqueIds: string[]): Promise<Array<{
    technique_id: string;
    rule_name: string;
    rule_type: string;
    logic: string;
    data_sources: string[];
  }>> {
    const rules = [];

    for (const techniqueId of techniqueIds) {
      const technique = await this.mitreRepo.findOne({
        where: { technique_id: techniqueId, is_active: true }
      });

      if (technique) {
        const detectionRules = this.generateDetectionRulesForTechnique(technique);
        rules.push(...detectionRules);
      }
    }

    return rules;
  }

  async getMitigationStrategies(techniqueIds: string[]): Promise<Array<{
    technique_id: string;
    mitigation_id: string;
    name: string;
    description: string;
    implementation_guidance: string;
  }>> {
    const strategies = [];

    for (const techniqueId of techniqueIds) {
      const technique = await this.mitreRepo.findOne({
        where: { technique_id: techniqueId, is_active: true }
      });

      if (technique && technique.mitigations) {
        const mitigationStrategies = this.getMitigationDetails(technique.mitigations);
        strategies.push(...mitigationStrategies.map(m => ({ ...m, technique_id: techniqueId })));
      }
    }

    return strategies;
  }

  private async getStaticMappings(): Promise<Record<string, any>> {
    return {
      'sql injection': {
        primary_technique: 'T1190',
        techniques: ['T1190', 'T1059'],
        tactics: ['Initial Access', 'Execution']
      },
      'ransomware': {
        primary_technique: 'T1486',
        techniques: ['T1486', 'T1059', 'T1027', 'T1547'],
        tactics: ['Impact', 'Execution', 'Defense Evasion', 'Persistence']
      },
      'phishing': {
        primary_technique: 'T1566',
        techniques: ['T1566', 'T1204', 'T1059'],
        tactics: ['Initial Access', 'Execution']
      },
      'brute force': {
        primary_technique: 'T1110',
        techniques: ['T1110', 'T1078'],
        tactics: ['Credential Access', 'Initial Access']
      },
      'malware': {
        primary_technique: 'T1059',
        techniques: ['T1059', 'T1547', 'T1027', 'T1055'],
        tactics: ['Execution', 'Persistence', 'Defense Evasion']
      },
      'privilege escalation': {
        primary_technique: 'T1548',
        techniques: ['T1548', 'T1055', 'T1078'],
        tactics: ['Privilege Escalation', 'Defense Evasion']
      },
      'data exfiltration': {
        primary_technique: 'T1041',
        techniques: ['T1041', 'T1005', 'T1020'],
        tactics: ['Exfiltration', 'Collection']
      }
    };
  }

  private async mapBehaviorPatterns(patterns: string[]): Promise<Array<{ pattern: string; techniques: string[] }>> {
    const behaviorMappings = [];

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      
      if (lowerPattern.includes('command execution') || lowerPattern.includes('shell')) {
        behaviorMappings.push({ pattern, techniques: ['T1059'] });
      }
      if (lowerPattern.includes('file encryption') || lowerPattern.includes('crypto')) {
        behaviorMappings.push({ pattern, techniques: ['T1486'] });
      }
      if (lowerPattern.includes('network connection') || lowerPattern.includes('c2')) {
        behaviorMappings.push({ pattern, techniques: ['T1071', 'T1095'] });
      }
      if (lowerPattern.includes('registry modification')) {
        behaviorMappings.push({ pattern, techniques: ['T1112', 'T1547'] });
      }
      if (lowerPattern.includes('process injection')) {
        behaviorMappings.push({ pattern, techniques: ['T1055'] });
      }
    }

    return behaviorMappings;
  }

  private async getKillChainPhases(techniqueIds: string[]): Promise<string[]> {
    const phases = new Set<string>();
    
    for (const techniqueId of techniqueIds) {
      const technique = await this.mitreRepo.findOne({
        where: { technique_id: techniqueId, is_active: true }
      });
      
      if (technique) {
        phases.add(technique.kill_chain_phase);
      }
    }

    return Array.from(phases);
  }

  private getThreatActorsForThreatType(threatType: string): string[] {
    const actorMappings = {
      'ransomware': ['Conti', 'REvil', 'LockBit', 'BlackCat'],
      'apt': ['APT1', 'APT28', 'APT29', 'Lazarus Group'],
      'phishing': ['APT28', 'FIN7', 'Lazarus Group', 'APT1'],
      'malware': ['FIN7', 'Carbanak', 'APT41'],
      'sql injection': ['Script Kiddies', 'Cybercriminals'],
      'brute force': ['Cybercriminals', 'Script Kiddies']
    };

    const lowerThreatType = threatType.toLowerCase();
    for (const [key, actors] of Object.entries(actorMappings)) {
      if (lowerThreatType.includes(key)) {
        return actors;
      }
    }

    return [];
  }

  private getThreatActorsForTechnique(techniqueId: string): string[] {
    const actorTechniques = {
      'T1190': ['APT1', 'APT28', 'FIN7'],
      'T1566': ['APT28', 'FIN7', 'Lazarus Group'],
      'T1486': ['Conti', 'REvil', 'LockBit'],
      'T1059': ['APT1', 'APT28', 'FIN7', 'Lazarus Group'],
      'T1110': ['APT28', 'Carbanak', 'FIN7']
    };

    return actorTechniques[techniqueId] || [];
  }

  private getDetectionRulesForTechnique(techniqueId: string): string[] {
    const rules = {
      'T1190': ['Monitor application logs for unusual error patterns', 'Implement WAF with SQL injection detection'],
      'T1566': ['Monitor email attachments and URLs', 'Implement DMARC/SPF validation'],
      'T1486': ['Monitor for unusual file encryption activity', 'Detect ransom note creation'],
      'T1059': ['Monitor command-line executions', 'Detect PowerShell and script activity'],
      'T1110': ['Monitor failed authentication attempts', 'Implement account lockout policies']
    };

    return rules[techniqueId] || [`Monitor for ${techniqueId} technique indicators`];
  }

  private async generateDetectionRecommendations(techniqueIds: string[]): Promise<string[]> {
    const recommendations = new Set<string>();

    for (const techniqueId of techniqueIds) {
      const rules = this.getDetectionRulesForTechnique(techniqueId);
      rules.forEach(rule => recommendations.add(rule));
    }

    // Add general recommendations
    recommendations.add('Implement comprehensive logging and monitoring');
    recommendations.add('Deploy SIEM with correlation rules');
    recommendations.add('Use behavioral analysis tools');

    return Array.from(recommendations);
  }

  private async generateMitigationRecommendations(techniqueIds: string[]): Promise<string[]> {
    const recommendations = new Set<string>();

    for (const techniqueId of techniqueIds) {
      const technique = await this.mitreRepo.findOne({
        where: { technique_id: techniqueId, is_active: true }
      });

      if (technique && technique.mitigations) {
        technique.mitigations.forEach(mitigation => {
          const details = this.getMitigationDescription(mitigation);
          recommendations.add(details);
        });
      }
    }

    return Array.from(recommendations);
  }

  private generateDetectionRulesForTechnique(technique: MitreAttackTechnique): Array<{
    technique_id: string;
    rule_name: string;
    rule_type: string;
    logic: string;
    data_sources: string[];
  }> {
    const rules = [];
    const techniqueId = technique.technique_id;

    // Generate basic detection rule
    rules.push({
      technique_id: techniqueId,
      rule_name: `${technique.name} Detection`,
      rule_type: 'behavioral',
      logic: `Detect patterns associated with ${technique.name}`,
      data_sources: technique.data_sources || ['System logs', 'Network traffic']
    });

    return rules;
  }

  private getMitigationDetails(mitigationIds: string[]): Array<{
    mitigation_id: string;
    name: string;
    description: string;
    implementation_guidance: string;
  }> {
    const mitigations = {
      'M1048': {
        name: 'Application Isolation and Sandboxing',
        description: 'Restrict execution of code to a virtual environment',
        implementation_guidance: 'Use application sandboxing technologies'
      },
      'M1050': {
        name: 'Exploit Protection',
        description: 'Use exploit protection tools and techniques',
        implementation_guidance: 'Deploy EMET, DEP, ASLR'
      },
      'M1027': {
        name: 'Password Policies',
        description: 'Set and enforce secure password policies',
        implementation_guidance: 'Implement strong password requirements'
      }
    };

    return mitigationIds.map(id => ({
      mitigation_id: id,
      ...mitigations[id] || {
        name: `Mitigation ${id}`,
        description: `Implementation of mitigation ${id}`,
        implementation_guidance: `Follow guidance for ${id}`
      }
    }));
  }

  private getMitigationDescription(mitigationId: string): string {
    const descriptions = {
      'M1048': 'Implement application isolation and sandboxing',
      'M1050': 'Deploy exploit protection mechanisms',
      'M1027': 'Enforce strong password policies',
      'M1042': 'Disable or remove unnecessary services',
      'M1040': 'Use behavior prevention on endpoint systems'
    };

    return descriptions[mitigationId] || `Implement mitigation ${mitigationId}`;
  }
}