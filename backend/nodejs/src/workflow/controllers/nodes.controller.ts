import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NodeRegistryService, NodeMetadata } from '../services/node-registry.service';
import { NodeFactoryService, NodeExecutionContext } from '../services/node-factory.service';
import { SecurityEvent, SecurityNodeConfig } from '../interfaces/security-node.interface';

@ApiTags('Security Nodes')
@Controller('nodes')
export class NodesController {
  constructor(
    private nodeRegistry: NodeRegistryService,
    private nodeFactory: NodeFactoryService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all registered security nodes' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by node category' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by node type' })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean, description: 'Filter by enabled status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search nodes by name or description' })
  @ApiResponse({ status: 200, description: 'List of security nodes' })
  getAllNodes(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('enabled') enabled?: boolean,
    @Query('search') search?: string
  ): NodeMetadata[] {
    let nodes = this.nodeRegistry.getAllNodeMetadata();

    if (category) {
      nodes = this.nodeRegistry.getNodesByCategory(category as any);
    }

    if (type) {
      nodes = nodes.filter(node => node.type === type);
    }

    if (enabled !== undefined) {
      nodes = nodes.filter(node => node.enabled === enabled);
    }

    if (search) {
      nodes = this.nodeRegistry.searchNodes(search);
    }

    return nodes;
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all node categories with counts' })
  @ApiResponse({ status: 200, description: 'Node categories and statistics' })
  getCategories() {
    const stats = this.nodeRegistry.getNodeStatistics();
    return {
      categories: Object.entries(stats.byCategory).map(([category, count]) => ({
        name: category,
        count,
        description: this.getCategoryDescription(category)
      }))
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get node registry statistics' })
  @ApiResponse({ status: 200, description: 'Node registry statistics' })
  getStatistics() {
    return this.nodeRegistry.getNodeStatistics();
  }

  @Get(':nodeId')
  @ApiOperation({ summary: 'Get specific node details' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node details' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  getNode(@Param('nodeId') nodeId: string): NodeMetadata {
    const node = this.nodeRegistry.getNodeMetadata(nodeId);
    if (!node) {
      throw new HttpException(`Node '${nodeId}' not found`, HttpStatus.NOT_FOUND);
    }
    return node;
  }

  @Get(':nodeId/schema')
  @ApiOperation({ summary: 'Get node schema for configuration' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node schema' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  getNodeSchema(@Param('nodeId') nodeId: string) {
    const metadata = this.nodeRegistry.getNodeMetadata(nodeId);
    if (!metadata) {
      throw new HttpException(`Node '${nodeId}' not found`, HttpStatus.NOT_FOUND);
    }
    return metadata.schema;
  }

  @Post(':nodeId/validate')
  @ApiOperation({ summary: 'Validate node configuration' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  validateNodeConfig(
    @Param('nodeId') nodeId: string,
    @Body() config: SecurityNodeConfig
  ) {
    const validation = this.nodeRegistry.validateNodeConfiguration(nodeId, config);
    return {
      nodeId,
      valid: validation.valid,
      errors: validation.errors,
      config
    };
  }

  @Post(':nodeId/execute')
  @ApiOperation({ summary: 'Execute a single node for testing' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node execution result' })
  @ApiResponse({ status: 400, description: 'Invalid configuration or input' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async executeNode(
    @Param('nodeId') nodeId: string,
    @Body() body: {
      input: SecurityEvent;
      config: SecurityNodeConfig;
      workflowId?: string;
    }
  ) {
    const context: NodeExecutionContext = {
      nodeId,
      config: body.config,
      workflowId: body.workflowId || 'test-execution',
      executionId: `test-${Date.now()}`,
      timestamp: new Date(),
      metadata: { test_execution: true }
    };

    const result = await this.nodeFactory.executeNode(nodeId, body.input, context);
    
    if (!result.success && result.result.error?.includes('not found')) {
      throw new HttpException(result.result.error, HttpStatus.NOT_FOUND);
    }

    return result;
  }

  @Post('validate-workflow')
  @ApiOperation({ summary: 'Validate a complete workflow configuration' })
  @ApiResponse({ status: 200, description: 'Workflow validation result' })
  validateWorkflow(
    @Body() body: {
      nodes: Array<{ nodeId: string; config: SecurityNodeConfig }>;
    }
  ) {
    return this.nodeFactory.validateWorkflowNodes(body.nodes);
  }

  @Get(':nodeId/compatibility/:targetNodeId')
  @ApiOperation({ summary: 'Check compatibility between two nodes' })
  @ApiParam({ name: 'nodeId', description: 'Source node identifier' })
  @ApiParam({ name: 'targetNodeId', description: 'Target node identifier' })
  @ApiResponse({ status: 200, description: 'Compatibility result' })
  checkCompatibility(
    @Param('nodeId') sourceNodeId: string,
    @Param('targetNodeId') targetNodeId: string
  ) {
    const compatible = this.nodeRegistry.getNodeCompatibility(sourceNodeId, targetNodeId);
    const sourceNode = this.nodeRegistry.getNodeMetadata(sourceNodeId);
    const targetNode = this.nodeRegistry.getNodeMetadata(targetNodeId);

    return {
      sourceNode: sourceNode?.name || sourceNodeId,
      targetNode: targetNode?.name || targetNodeId,
      compatible,
      details: {
        sourceOutputs: sourceNode?.schema.outputs.map(o => o.name) || [],
        targetRequiredInputs: targetNode?.schema.inputs
          .filter(i => i.required)
          .map(i => i.name) || []
      }
    };
  }

  @Put(':nodeId/enable')
  @ApiOperation({ summary: 'Enable a node' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node enabled successfully' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  enableNode(@Param('nodeId') nodeId: string) {
    const node = this.nodeRegistry.getNodeMetadata(nodeId);
    if (!node) {
      throw new HttpException(`Node '${nodeId}' not found`, HttpStatus.NOT_FOUND);
    }

    this.nodeRegistry.enableNode(nodeId);
    return { nodeId, enabled: true, message: 'Node enabled successfully' };
  }

  @Put(':nodeId/disable')
  @ApiOperation({ summary: 'Disable a node' })
  @ApiParam({ name: 'nodeId', description: 'Node identifier' })
  @ApiResponse({ status: 200, description: 'Node disabled successfully' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  disableNode(@Param('nodeId') nodeId: string) {
    const node = this.nodeRegistry.getNodeMetadata(nodeId);
    if (!node) {
      throw new HttpException(`Node '${nodeId}' not found`, HttpStatus.NOT_FOUND);
    }

    this.nodeRegistry.disableNode(nodeId);
    return { nodeId, enabled: false, message: 'Node disabled successfully' };
  }

  private getCategoryDescription(category: string): string {
    const descriptions = {
      'core': 'Essential security nodes for basic workflow operations',
      'integration': 'External service integrations and threat intelligence',
      'mitre': 'MITRE ATT&CK framework mapping and analysis',
      'ai-ml': 'Artificial intelligence and machine learning capabilities',
      'soar': 'Security orchestration, automation and response',
      'cloud': 'Cloud security and infrastructure monitoring'
    };

    return descriptions[category] || 'Security node category';
  }
}