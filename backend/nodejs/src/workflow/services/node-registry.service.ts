import { Injectable, OnModuleInit } from '@nestjs/common';
import { SecurityNode, NodeSchema } from '../interfaces/security-node.interface';
import { ThreatIntelNode } from '../nodes/threat-intel-node';
import { MitreAttackNode } from '../nodes/mitre-attack-node';
import { SOARActionNode } from '../nodes/soar-action-node';
import { BehavioralAnalysisNode } from '../nodes/behavioral-analysis-node';
import { EmailAnalysisNode } from '../nodes/email-analysis-node';
import { FileHashAnalysisNode } from '../nodes/file-hash-analysis-node';
import { NetworkTrafficMonitorNode } from '../nodes/network-traffic-monitor-node';
import { SandboxAnalysisNode } from '../nodes/sandbox-analysis-node';
import { VulnerabilityScannerNode } from '../nodes/vulnerability-scanner-node';
import { LogAnalysisNode } from '../nodes/log-analysis-node';

export interface NodeMetadata {
  id: string;
  type: string;
  category: 'core' | 'soar' | 'cloud' | 'ai-ml' | 'integration' | 'mitre';
  name: string;
  description: string;
  version: string;
  schema: NodeSchema;
  tags: string[];
  icon?: string;
  enabled: boolean;
  enterprise?: boolean;
}

@Injectable()
export class NodeRegistryService implements OnModuleInit {
  private nodes = new Map<string, SecurityNode>();
  private nodeMetadata = new Map<string, NodeMetadata>();

  constructor(
    private threatIntelNode: ThreatIntelNode,
    private mitreAttackNode: MitreAttackNode,
    private soarActionNode: SOARActionNode,
    private behavioralAnalysisNode: BehavioralAnalysisNode,
    private emailAnalysisNode: EmailAnalysisNode,
    private fileHashAnalysisNode: FileHashAnalysisNode,
    private networkTrafficMonitorNode: NetworkTrafficMonitorNode,
    private sandboxAnalysisNode: SandboxAnalysisNode,
    private vulnerabilityScannerNode: VulnerabilityScannerNode,
    private logAnalysisNode: LogAnalysisNode
  ) {}

  async onModuleInit() {
    await this.registerDefaultNodes();
  }

  private async registerDefaultNodes() {
    // Register built-in nodes
    this.registerNode(this.threatIntelNode);
    this.registerNode(this.mitreAttackNode);
    this.registerNode(this.soarActionNode);
    this.registerNode(this.behavioralAnalysisNode as any);
    this.registerNode(this.emailAnalysisNode as any);
    this.registerNode(this.fileHashAnalysisNode as any);
    this.registerNode(this.networkTrafficMonitorNode as any);
    this.registerNode(this.sandboxAnalysisNode as any);
    this.registerNode(this.vulnerabilityScannerNode as any);
    this.registerNode(this.logAnalysisNode as any);
    
    console.log(`📦 Registered ${this.nodes.size} security nodes`);
  }

  registerNode(node: SecurityNode): void {
    const metadata: NodeMetadata = {
      id: node.id,
      type: node.type,
      category: node.category,
      name: node.name,
      description: node.description,
      version: node.version,
      schema: node.getSchema(),
      tags: this.generateTags(node),
      icon: this.getNodeIcon(node.category),
      enabled: true,
      enterprise: this.isEnterpriseNode(node.category)
    };

    this.nodes.set(node.id, node);
    this.nodeMetadata.set(node.id, metadata);
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
    this.nodeMetadata.delete(nodeId);
  }

  getNode(nodeId: string): SecurityNode | undefined {
    return this.nodes.get(nodeId);
  }

  getNodeMetadata(nodeId: string): NodeMetadata | undefined {
    return this.nodeMetadata.get(nodeId);
  }

  getAllNodes(): Map<string, SecurityNode> {
    return new Map(this.nodes);
  }

  getAllNodeMetadata(): NodeMetadata[] {
    return Array.from(this.nodeMetadata.values());
  }

  getNodesByCategory(category: NodeMetadata['category']): NodeMetadata[] {
    return Array.from(this.nodeMetadata.values())
      .filter(metadata => metadata.category === category);
  }

  getNodesByType(type: string): NodeMetadata[] {
    return Array.from(this.nodeMetadata.values())
      .filter(metadata => metadata.type === type);
  }

  searchNodes(query: string): NodeMetadata[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.nodeMetadata.values())
      .filter(metadata => 
        metadata.name.toLowerCase().includes(searchTerm) ||
        metadata.description.toLowerCase().includes(searchTerm) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
  }

  getEnabledNodes(): NodeMetadata[] {
    return Array.from(this.nodeMetadata.values())
      .filter(metadata => metadata.enabled);
  }

  getAvailableNodes(): NodeMetadata[] {
    return this.getEnabledNodes();
  }

  enableNode(nodeId: string): void {
    const metadata = this.nodeMetadata.get(nodeId);
    if (metadata) {
      metadata.enabled = true;
      this.nodeMetadata.set(nodeId, metadata);
    }
  }

  disableNode(nodeId: string): void {
    const metadata = this.nodeMetadata.get(nodeId);
    if (metadata) {
      metadata.enabled = false;
      this.nodeMetadata.set(nodeId, metadata);
    }
  }

  validateNodeConfiguration(nodeId: string, config: any): { valid: boolean; errors: string[] } {
    const node = this.getNode(nodeId);
    if (!node) {
      return { valid: false, errors: [`Node '${nodeId}' not found`] };
    }

    return node.configure(config);
  }

  getNodeCompatibility(sourceNodeId: string, targetNodeId: string): boolean {
    const sourceMetadata = this.getNodeMetadata(sourceNodeId);
    const targetMetadata = this.getNodeMetadata(targetNodeId);

    if (!sourceMetadata || !targetMetadata) {
      return false;
    }

    // Check if source outputs are compatible with target inputs
    const sourceOutputs = sourceMetadata.schema.outputs.map(o => o.name);
    const targetInputs = targetMetadata.schema.inputs
      .filter(i => i.required)
      .map(i => i.name);

    return targetInputs.every(input => sourceOutputs.includes(input));
  }

  getNodeStatistics(): {
    total: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    enabled: number;
    disabled: number;
  } {
    const metadata = Array.from(this.nodeMetadata.values());
    
    const byCategory = metadata.reduce((acc, node) => {
      acc[node.category] = (acc[node.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = metadata.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: metadata.length,
      byCategory,
      byType,
      enabled: metadata.filter(n => n.enabled).length,
      disabled: metadata.filter(n => !n.enabled).length
    };
  }

  private generateTags(node: SecurityNode): string[] {
    const tags = [node.category, node.type];
    
    // Add specific tags based on node type
    switch (node.category) {
      case 'integration':
        tags.push('external-api', 'enrichment');
        break;
      case 'mitre':
        tags.push('attack-framework', 'tactics', 'techniques');
        break;
      case 'core':
        tags.push('essential', 'basic');
        break;
      case 'ai-ml':
        tags.push('artificial-intelligence', 'machine-learning', 'advanced');
        break;
      case 'soar':
        tags.push('automation', 'orchestration', 'response');
        break;
      case 'cloud':
        tags.push('cloud-security', 'infrastructure');
        break;
    }

    return tags;
  }

  private getNodeIcon(category: NodeMetadata['category']): string {
    const iconMap = {
      'core': 'shield-check',
      'integration': 'link',
      'mitre': 'target',
      'ai-ml': 'brain',
      'soar': 'cogs',
      'cloud': 'cloud'
    };

    return iconMap[category] || 'puzzle-piece';
  }

  private isEnterpriseNode(category: NodeMetadata['category']): boolean {
    return ['ai-ml', 'soar'].includes(category);
  }
}