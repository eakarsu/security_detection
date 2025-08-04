import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';
import { NodeRegistryService } from './node-registry.service';
import { TenantDataService } from '../../auth/services/tenant-data.service';

export interface WorkflowGenerationRequest {
  description: string;
  requirements?: string[];
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  category?: 'incident-response' | 'threat-hunting' | 'vulnerability-management' | 'compliance' | 'forensics' | 'monitoring';
  constraints?: {
    maxNodes?: number;
    requiredNodes?: string[];
    excludedNodes?: string[];
    timeBudget?: string;
  };
}

export interface GeneratedWorkflow {
  name: string;
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  workflow_definition: {
    nodes: Array<{
      id: string;
      type: string;
      nodeId: string;
      position: { x: number; y: number };
      config: Record<string, any>;
      data: {
        label: string;
        description?: string;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
      animated?: boolean;
    }>;
    metadata: {
      version: string;
      author: string;
      tags: string[];
      complexity: 'beginner' | 'intermediate' | 'advanced';
      estimated_time?: string;
      generation_prompt: string;
    };
  };
  confidence_score: number;
  suggestions?: string[];
}

interface WorkflowPatternMatch {
  pattern: RegExp;
  nodes: string[];
  description: string;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

@Injectable()
export class AIWorkflowGeneratorService {
  private workflowPatterns: WorkflowPatternMatch[] = [
    {
      pattern: /incident.*(response|handling|management)/i,
      nodes: ['alert-trigger', 'threat-intel-lookup', 'mitre-attack-mapping', 'soar-containment', 'notification'],
      description: 'Automated incident response workflow',
      category: 'incident-response',
      complexity: 'intermediate'
    },
    {
      pattern: /(threat|ioc).*(hunt|search|investigation)/i,
      nodes: ['threat-intel-lookup', 'mitre-attack-mapping', 'log-analysis', 'timeline-analysis'],
      description: 'Threat hunting and investigation workflow',
      category: 'threat-hunting',
      complexity: 'advanced'
    },
    {
      pattern: /(vuln|vulnerability).*(scan|assess|manage)/i,
      nodes: ['vulnerability-scan', 'asset-discovery', 'risk-assessment', 'remediation-tracking'],
      description: 'Vulnerability management workflow',
      category: 'vulnerability-management',
      complexity: 'intermediate'
    },
    {
      pattern: /(malware|suspicious.*file).*(analysis|detection)/i,
      nodes: ['file-hash-lookup', 'threat-intel-lookup', 'sandbox-analysis', 'mitre-attack-mapping'],
      description: 'Malware analysis and detection workflow',
      category: 'forensics',
      complexity: 'advanced'
    },
    {
      pattern: /(phishing|email).*(detection|analysis)/i,
      nodes: ['email-analysis', 'url-reputation-check', 'threat-intel-lookup', 'user-notification'],
      description: 'Phishing email detection and response workflow',
      category: 'incident-response',
      complexity: 'beginner'
    },
    {
      pattern: /(network|traffic).*(monitor|analysis)/i,
      nodes: ['network-monitor', 'traffic-analysis', 'anomaly-detection', 'alert-generation'],
      description: 'Network traffic monitoring and analysis workflow',
      category: 'monitoring',
      complexity: 'intermediate'
    },
    {
      pattern: /(compliance|audit|regulation)/i,
      nodes: ['compliance-check', 'policy-validation', 'audit-log', 'report-generation'],
      description: 'Compliance monitoring and audit workflow',
      category: 'compliance',
      complexity: 'beginner'
    },
    {
      pattern: /(forensic|digital.*evidence|investigation)/i,
      nodes: ['evidence-collection', 'timeline-analysis', 'artifact-analysis', 'chain-of-custody'],
      description: 'Digital forensics investigation workflow',
      category: 'forensics',
      complexity: 'advanced'
    }
  ];

  constructor(
    @InjectRepository(WorkflowTemplate)
    private workflowTemplateRepository: Repository<WorkflowTemplate>,
    private nodeRegistryService: NodeRegistryService,
    private tenantDataService: TenantDataService
  ) {}

  /**
   * Generate workflow from natural language description
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<GeneratedWorkflow> {
    // Parse and analyze the natural language description
    const analysis = await this.analyzeWorkflowDescription(request.description, request.requirements);
    
    // Match against known patterns
    const patternMatch = this.findBestPatternMatch(request.description, request.category);
    
    // Generate workflow structure
    const workflowStructure = await this.generateWorkflowStructure(analysis, patternMatch, request);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(analysis, patternMatch, workflowStructure);
    
    // Generate suggestions for improvement
    const suggestions = this.generateSuggestions(analysis, workflowStructure, request);

    return {
      name: analysis.suggestedName,
      description: analysis.enhancedDescription,
      category: patternMatch?.category || request.category || 'incident-response',
      complexity: patternMatch?.complexity || request.complexity || 'intermediate',
      workflow_definition: workflowStructure,
      confidence_score: confidenceScore,
      suggestions
    };
  }

  /**
   * Analyze natural language description using NLP techniques
   */
  private async analyzeWorkflowDescription(
    description: string, 
    requirements?: string[]
  ): Promise<{
    intent: string;
    entities: string[];
    actions: string[];
    objectives: string[];
    suggestedName: string;
    enhancedDescription: string;
    keywords: string[];
  }> {
    const text = description.toLowerCase();
    
    // Extract security-related entities
    const securityEntities = this.extractSecurityEntities(text);
    
    // Extract action verbs
    const actions = this.extractActions(text);
    
    // Extract objectives
    const objectives = this.extractObjectives(text, requirements);
    
    // Determine primary intent
    const intent = this.determineIntent(text, actions);
    
    // Generate suggested name
    const suggestedName = this.generateWorkflowName(intent, securityEntities, actions);
    
    // Create enhanced description
    const enhancedDescription = this.enhanceDescription(description, objectives, securityEntities);
    
    // Extract keywords for tagging
    const keywords = [...securityEntities, ...actions, ...objectives].filter(Boolean);

    return {
      intent,
      entities: securityEntities,
      actions,
      objectives,
      suggestedName,
      enhancedDescription,
      keywords
    };
  }

  /**
   * Extract security-related entities from text
   */
  private extractSecurityEntities(text: string): string[] {
    const securityTerms = {
      threats: ['malware', 'virus', 'trojan', 'ransomware', 'phishing', 'apt', 'threat', 'attack'],
      indicators: ['ip', 'domain', 'hash', 'url', 'email', 'file', 'ioc', 'indicator'],
      systems: ['endpoint', 'server', 'network', 'firewall', 'ids', 'ips', 'siem', 'soc'],
      processes: ['incident', 'alert', 'case', 'investigation', 'analysis', 'response', 'remediation'],
      compliance: ['gdpr', 'hipaa', 'pci', 'sox', 'compliance', 'audit', 'regulation', 'policy']
    };

    const entities: string[] = [];
    
    Object.values(securityTerms).flat().forEach(term => {
      if (text.includes(term)) {
        entities.push(term);
      }
    });

    return [...new Set(entities)];
  }

  /**
   * Extract action verbs from text
   */
  private extractActions(text: string): string[] {
    const actionPatterns = [
      /\b(detect|scan|monitor|analyze|investigate|contain|block|quarantine|notify|alert|report)\b/g,
      /\b(collect|gather|extract|process|correlate|enrich|validate|verify|confirm)\b/g,
      /\b(remediate|mitigate|resolve|fix|patch|update|isolate|remove|delete)\b/g,
      /\b(log|audit|track|record|document|archive|backup|restore)\b/g
    ];

    const actions: string[] = [];
    
    actionPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        actions.push(...matches);
      }
    });

    return [...new Set(actions)];
  }

  /**
   * Extract objectives from text and requirements
   */
  private extractObjectives(text: string, requirements?: string[]): string[] {
    const objectivePatterns = [
      /(?:to |in order to |so that |goal.*is |objective.*is |aim.*to |purpose.*is )(.*?)(?:\.|,|$)/g,
      /(?:prevent|stop|avoid|reduce|minimize|eliminate|improve|enhance|optimize|automate)(.*?)(?:\.|,|$)/g
    ];

    const objectives: string[] = [];
    
    // Extract from main text
    objectivePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) {
          objectives.push(match[1].trim());
        }
      });
    });

    // Add requirements as objectives
    if (requirements) {
      objectives.push(...requirements);
    }

    return objectives.filter(obj => obj.length > 3);
  }

  /**
   * Determine primary intent of the workflow
   */
  private determineIntent(text: string, actions: string[]): string {
    const intentKeywords = {
      'detection': ['detect', 'identify', 'discover', 'find', 'scan', 'monitor'],
      'investigation': ['investigate', 'analyze', 'examine', 'research', 'dig', 'explore'],
      'response': ['respond', 'react', 'handle', 'manage', 'contain', 'mitigate'],
      'prevention': ['prevent', 'block', 'stop', 'avoid', 'protect', 'secure'],
      'remediation': ['remediate', 'fix', 'resolve', 'patch', 'clean', 'remove'],
      'monitoring': ['monitor', 'watch', 'track', 'observe', 'supervise', 'audit'],
      'compliance': ['comply', 'audit', 'validate', 'check', 'verify', 'assess']
    };

    let maxScore = 0;
    let primaryIntent = 'detection';

    Object.entries(intentKeywords).forEach(([intent, keywords]) => {
      const score = keywords.reduce((count, keyword) => {
        return count + (text.includes(keyword) ? 1 : 0) + (actions.includes(keyword) ? 2 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    });

    return primaryIntent;
  }

  /**
   * Generate a workflow name based on analysis
   */
  private generateWorkflowName(intent: string, entities: string[], actions: string[]): string {
    const primaryEntity = entities[0] || 'security';
    const primaryAction = actions[0] || intent;
    
    const nameTemplates = [
      `${primaryEntity.charAt(0).toUpperCase() + primaryEntity.slice(1)} ${primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1)} Workflow`,
      `Automated ${primaryEntity.charAt(0).toUpperCase() + primaryEntity.slice(1)} ${intent.charAt(0).toUpperCase() + intent.slice(1)}`,
      `${intent.charAt(0).toUpperCase() + intent.slice(1)} and ${primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1)} Playbook`
    ];

    return nameTemplates[0];
  }

  /**
   * Enhance the original description
   */
  private enhanceDescription(
    originalDescription: string, 
    objectives: string[], 
    entities: string[]
  ): string {
    let enhanced = originalDescription;
    
    if (objectives.length > 0) {
      enhanced += `\n\nObjectives:\n${objectives.map(obj => `- ${obj}`).join('\n')}`;
    }
    
    if (entities.length > 0) {
      enhanced += `\n\nKey Components: ${entities.join(', ')}`;
    }

    return enhanced;
  }

  /**
   * Find the best matching pattern for the workflow
   */
  private findBestPatternMatch(description: string, category?: string): WorkflowPatternMatch | null {
    let bestMatch: WorkflowPatternMatch | null = null;
    let bestScore = 0;

    this.workflowPatterns.forEach(pattern => {
      let score = 0;
      
      // Pattern regex match
      if (pattern.pattern.test(description)) {
        score += 10;
      }
      
      // Category match bonus
      if (category && pattern.category === category) {
        score += 5;
      }
      
      // Keyword overlap
      const patternKeywords = pattern.description.toLowerCase().split(' ');
      const descriptionWords = description.toLowerCase().split(' ');
      const overlap = patternKeywords.filter(word => descriptionWords.includes(word)).length;
      score += overlap;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
      }
    });

    return bestMatch;
  }

  /**
   * Generate the actual workflow structure
   */
  private async generateWorkflowStructure(
    analysis: any,
    patternMatch: WorkflowPatternMatch | null,
    request: WorkflowGenerationRequest
  ): Promise<any> {
    const availableNodes = await this.nodeRegistryService.getAvailableNodes();
    const selectedNodes = this.selectOptimalNodes(analysis, patternMatch, availableNodes, request.constraints);
    
    // Generate nodes with positions
    const nodes = selectedNodes.map((nodeId, index) => {
      const nodeInfo = availableNodes.find(n => n.id === nodeId);
      const position = this.calculateNodePosition(index, selectedNodes.length);
      
      return {
        id: `node-${index + 1}`,
        type: nodeInfo?.type || 'custom',
        nodeId,
        position,
        config: this.generateNodeConfig(nodeId, analysis),
        data: {
          label: nodeInfo?.name || nodeId,
          description: nodeInfo?.description || `Generated ${nodeId} node`
        }
      };
    });

    // Generate edges between nodes
    const edges = this.generateWorkflowEdges(nodes, analysis.intent);

    return {
      nodes,
      edges,
      metadata: {
        version: '1.0.0',
        author: 'AI Workflow Generator',
        tags: analysis.keywords,
        complexity: patternMatch?.complexity || request.complexity || 'intermediate',
        estimated_time: this.estimateExecutionTime(nodes.length, patternMatch?.complexity),
        generation_prompt: request.description
      }
    };
  }

  /**
   * Select optimal nodes for the workflow
   */
  private selectOptimalNodes(
    analysis: any,
    patternMatch: WorkflowPatternMatch | null,
    availableNodes: any[],
    constraints?: any
  ): string[] {
    let selectedNodes: string[] = [];

    // Start with pattern match nodes if available
    if (patternMatch) {
      selectedNodes = [...patternMatch.nodes];
    }

    // Add nodes based on analysis entities and actions
    const entityNodeMap: Record<string, string[]> = {
      'threat': ['threat-intel-lookup', 'mitre-attack-mapping'],
      'malware': ['file-hash-lookup', 'sandbox-analysis'],
      'network': ['network-monitor', 'traffic-analysis'],
      'email': ['email-analysis', 'url-reputation-check'],
      'incident': ['alert-trigger', 'case-management'],
      'vuln': ['vulnerability-scan', 'risk-assessment']
    };

    analysis.entities.forEach((entity: string) => {
      const mappedNodes = entityNodeMap[entity] || [];
      selectedNodes.push(...mappedNodes);
    });

    // Add action-based nodes
    const actionNodeMap: Record<string, string[]> = {
      'detect': ['anomaly-detection', 'signature-match'],
      'analyze': ['log-analysis', 'behavioral-analysis'],
      'contain': ['soar-containment', 'network-isolation'],
      'notify': ['notification', 'alert-generation'],
      'monitor': ['continuous-monitor', 'dashboard-update']
    };

    analysis.actions.forEach((action: string) => {
      const mappedNodes = actionNodeMap[action] || [];
      selectedNodes.push(...mappedNodes);
    });

    // Remove duplicates and apply constraints
    selectedNodes = [...new Set(selectedNodes)];

    // Apply required nodes constraint
    if (constraints?.requiredNodes) {
      constraints.requiredNodes.forEach((node: string) => {
        if (!selectedNodes.includes(node)) {
          selectedNodes.push(node);
        }
      });
    }

    // Apply excluded nodes constraint
    if (constraints?.excludedNodes) {
      selectedNodes = selectedNodes.filter(node => !constraints.excludedNodes.includes(node));
    }

    // Apply max nodes constraint
    if (constraints?.maxNodes && selectedNodes.length > constraints.maxNodes) {
      selectedNodes = selectedNodes.slice(0, constraints.maxNodes);
    }

    // Ensure minimum workflow length
    if (selectedNodes.length === 0) {
      selectedNodes = ['alert-trigger', 'threat-intel-lookup', 'notification'];
    }

    return selectedNodes;
  }

  /**
   * Calculate node position for layout
   */
  private calculateNodePosition(index: number, totalNodes: number): { x: number; y: number } {
    const nodesPerRow = Math.ceil(Math.sqrt(totalNodes));
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;
    
    return {
      x: col * 250 + 100,
      y: row * 150 + 100
    };
  }

  /**
   * Generate configuration for each node
   */
  private generateNodeConfig(nodeId: string, analysis: any): Record<string, any> {
    const defaultConfigs: Record<string, any> = {
      'threat-intel-lookup': {
        sources: ['virustotal', 'abuseipdb'],
        confidence_threshold: 0.7
      },
      'mitre-attack-mapping': {
        tactics: ['initial-access', 'execution', 'persistence'],
        auto_map: true
      },
      'alert-trigger': {
        severity: 'medium',
        auto_escalate: true
      },
      'notification': {
        channels: ['email', 'slack'],
        template: 'security_alert'
      }
    };

    return defaultConfigs[nodeId] || { auto_generated: true };
  }

  /**
   * Generate edges between workflow nodes
   */
  private generateWorkflowEdges(nodes: any[], intent: string): any[] {
    const edges: any[] = [];
    
    // Create sequential flow for most workflows
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i + 1}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'default',
        animated: intent === 'response' // Animate response workflows
      });
    }

    // Add conditional branches for complex workflows
    if (intent === 'investigation' && nodes.length > 3) {
      // Add parallel investigation paths
      const midpoint = Math.floor(nodes.length / 2);
      edges.push({
        id: `edge-branch-${midpoint}`,
        source: nodes[0].id,
        target: nodes[midpoint].id,
        type: 'step'
      });
    }

    return edges;
  }

  /**
   * Estimate workflow execution time
   */
  private estimateExecutionTime(nodeCount: number, complexity?: string): string {
    const baseTime = nodeCount * 30; // 30 seconds per node base
    const complexityMultiplier = {
      'beginner': 1,
      'intermediate': 1.5,
      'advanced': 2
    };
    
    const totalSeconds = baseTime * (complexityMultiplier[complexity || 'intermediate'] || 1.5);
    const minutes = Math.ceil(totalSeconds / 60);
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  /**
   * Calculate confidence score for the generated workflow
   */
  private calculateConfidenceScore(
    analysis: any,
    patternMatch: WorkflowPatternMatch | null,
    workflowStructure: any
  ): number {
    let score = 0.5; // Base score

    // Pattern match bonus
    if (patternMatch) {
      score += 0.3;
    }

    // Entity extraction quality
    const entityScore = Math.min(analysis.entities.length * 0.05, 0.15);
    score += entityScore;

    // Action extraction quality
    const actionScore = Math.min(analysis.actions.length * 0.03, 0.1);
    score += actionScore;

    // Workflow structure quality
    const nodeCount = workflowStructure.nodes.length;
    if (nodeCount >= 3 && nodeCount <= 10) {
      score += 0.1; // Optimal node count
    }

    // Intent clarity
    if (analysis.intent !== 'detection') { // More specific than default
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate suggestions for workflow improvement
   */
  private generateSuggestions(
    analysis: any,
    workflowStructure: any,
    request: WorkflowGenerationRequest
  ): string[] {
    const suggestions: string[] = [];

    // Node count suggestions
    if (workflowStructure.nodes.length < 3) {
      suggestions.push('Consider adding more nodes for a more comprehensive workflow');
    } else if (workflowStructure.nodes.length > 10) {
      suggestions.push('Consider simplifying the workflow by removing non-essential nodes');
    }

    // Missing common nodes
    const hasNotification = workflowStructure.nodes.some((n: any) => n.nodeId.includes('notification'));
    if (!hasNotification && analysis.intent === 'response') {
      suggestions.push('Consider adding a notification node to alert stakeholders');
    }

    const hasThreatIntel = workflowStructure.nodes.some((n: any) => n.nodeId.includes('threat-intel'));
    if (!hasThreatIntel && analysis.entities.includes('threat')) {
      suggestions.push('Consider adding threat intelligence lookup for better context');
    }

    // Complexity suggestions
    if (request.complexity === 'beginner' && workflowStructure.nodes.length > 5) {
      suggestions.push('For beginner workflows, consider reducing complexity');
    }

    // Category-specific suggestions
    if (request.category === 'incident-response' && !workflowStructure.nodes.some((n: any) => n.nodeId.includes('containment'))) {
      suggestions.push('Incident response workflows should include containment actions');
    }

    return suggestions;
  }

  /**
   * Get similar existing workflows for inspiration
   */
  async findSimilarWorkflows(description: string, limit: number = 3): Promise<WorkflowTemplate[]> {
    const keywords = description.toLowerCase().split(' ').filter(word => word.length > 3);
    
    const qb = this.tenantDataService.createTenantQueryBuilder(WorkflowTemplate, 'template');
    
    // Search in name, description, and tags
    keywords.forEach((keyword, index) => {
      const param = `keyword${index}`;
      if (index === 0) {
        qb.where(`(template.name LIKE :${param} OR template.description LIKE :${param} OR JSON_CONTAINS(template.tags, :${param}Tag))`, {
          [param]: `%${keyword}%`,
          [`${param}Tag`]: JSON.stringify(keyword)
        });
      } else {
        qb.orWhere(`(template.name LIKE :${param} OR template.description LIKE :${param} OR JSON_CONTAINS(template.tags, :${param}Tag))`, {
          [param]: `%${keyword}%`,
          [`${param}Tag`]: JSON.stringify(keyword)
        });
      }
    });

    return qb
      .andWhere('template.is_active = :isActive', { isActive: true })
      .limit(limit)
      .getMany();
  }

  /**
   * Validate generated workflow structure
   */
  validateWorkflow(workflow: GeneratedWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check basic structure
    if (!workflow.workflow_definition.nodes || workflow.workflow_definition.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check node connections
    const nodeIds = workflow.workflow_definition.nodes.map(n => n.id);
    workflow.workflow_definition.edges.forEach(edge => {
      if (!nodeIds.includes(edge.source)) {
        errors.push(`Edge source '${edge.source}' references non-existent node`);
      }
      if (!nodeIds.includes(edge.target)) {
        errors.push(`Edge target '${edge.target}' references non-existent node`);
      }
    });

    // Check for isolated nodes
    const connectedNodes = new Set();
    workflow.workflow_definition.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const isolatedNodes = nodeIds.filter(id => !connectedNodes.has(id));
    if (isolatedNodes.length > 0 && workflow.workflow_definition.nodes.length > 1) {
      errors.push(`Isolated nodes detected: ${isolatedNodes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}