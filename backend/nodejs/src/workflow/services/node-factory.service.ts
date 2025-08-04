import { Injectable, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { SecurityNode, SecurityEvent, SecurityResult, SecurityNodeConfig } from '../interfaces/security-node.interface';
import { NodeRegistryService } from './node-registry.service';

export interface NodeExecutionContext {
  nodeId: string;
  config: SecurityNodeConfig;
  workflowId: string;
  executionId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  result: SecurityResult;
  executionTime: number;
  context: NodeExecutionContext;
}

@Injectable()
export class NodeFactoryService {
  constructor(
    @Inject(NodeRegistryService)
    private nodeRegistry: NodeRegistryService,
    private moduleRef: ModuleRef
  ) {}

  async createNode(nodeId: string): Promise<SecurityNode | null> {
    const node = this.nodeRegistry.getNode(nodeId);
    if (!node) {
      console.warn(`Node '${nodeId}' not found in registry`);
      return null;
    }

    // For dependency injection support, try to get from module context
    try {
      const nodeInstance = await this.moduleRef.get(node.constructor, { strict: false });
      return nodeInstance || node;
    } catch (error) {
      // Fallback to registered instance
      return node;
    }
  }

  async executeNode(
    nodeId: string,
    input: SecurityEvent,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const node = await this.createNode(nodeId);
      if (!node) {
        return {
          nodeId,
          success: false,
          result: {
            success: false,
            data: null,
            error: `Node '${nodeId}' not found or could not be created`,
            metadata: { processing_time: Date.now() - startTime }
          },
          executionTime: Date.now() - startTime,
          context
        };
      }

      // Validate node configuration
      const validation = node.configure(context.config);
      if (!validation.valid) {
        return {
          nodeId,
          success: false,
          result: {
            success: false,
            data: null,
            error: `Configuration validation failed: ${validation.errors.join(', ')}`,
            metadata: { processing_time: Date.now() - startTime }
          },
          executionTime: Date.now() - startTime,
          context
        };
      }

      // Execute the node
      const result = await node.execute(input, context.config);
      const executionTime = Date.now() - startTime;

      // Add execution metadata
      if (result.metadata) {
        result.metadata.node_id = nodeId;
        result.metadata.execution_id = context.executionId;
        result.metadata.workflow_id = context.workflowId;
        result.metadata.execution_time = executionTime;
      }

      return {
        nodeId,
        success: result.success,
        result,
        executionTime,
        context
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        nodeId,
        success: false,
        result: {
          success: false,
          data: null,
          error: `Node execution failed: ${error.message}`,
          metadata: { 
            processing_time: executionTime,
            error_type: error.constructor.name,
            stack_trace: error.stack
          }
        },
        executionTime,
        context
      };
    }
  }

  async executeNodesInSequence(
    nodeConfigs: Array<{ nodeId: string; config: SecurityNodeConfig }>,
    initialInput: SecurityEvent,
    workflowId: string,
    executionId: string
  ): Promise<NodeExecutionResult[]> {
    const results: NodeExecutionResult[] = [];
    let currentInput = initialInput;

    for (let i = 0; i < nodeConfigs.length; i++) {
      const { nodeId, config } = nodeConfigs[i];
      
      const context: NodeExecutionContext = {
        nodeId,
        config,
        workflowId,
        executionId,
        timestamp: new Date(),
        metadata: {
          sequence_position: i,
          total_nodes: nodeConfigs.length
        }
      };

      const result = await this.executeNode(nodeId, currentInput, context);
      results.push(result);

      // If execution failed and we have error handling
      if (!result.success) {
        console.warn(`Node '${nodeId}' failed in sequence:`, result.result.error);
        
        // Decide whether to continue or stop based on node configuration
        if (config.stopOnError !== false) {
          break;
        }
      } else {
        // Update input for next node with previous node's output
        if (result.result.data) {
          currentInput = { ...currentInput, ...result.result.data };
        }
      }
    }

    return results;
  }

  async executeNodesInParallel(
    nodeConfigs: Array<{ nodeId: string; config: SecurityNodeConfig }>,
    input: SecurityEvent,
    workflowId: string,
    executionId: string
  ): Promise<NodeExecutionResult[]> {
    const promises = nodeConfigs.map(async ({ nodeId, config }, index) => {
      const context: NodeExecutionContext = {
        nodeId,
        config,
        workflowId,
        executionId,
        timestamp: new Date(),
        metadata: {
          parallel_position: index,
          total_nodes: nodeConfigs.length
        }
      };

      return this.executeNode(nodeId, input, context);
    });

    return Promise.all(promises);
  }

  validateWorkflowNodes(nodeConfigs: Array<{ nodeId: string; config: SecurityNodeConfig }>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < nodeConfigs.length; i++) {
      const { nodeId, config } = nodeConfigs[i];
      
      // Check if node exists
      const nodeMetadata = this.nodeRegistry.getNodeMetadata(nodeId);
      if (!nodeMetadata) {
        errors.push(`Node '${nodeId}' not found in registry`);
        continue;
      }

      // Check if node is enabled
      if (!nodeMetadata.enabled) {
        warnings.push(`Node '${nodeId}' is disabled`);
      }

      // Validate configuration
      const validation = this.nodeRegistry.validateNodeConfiguration(nodeId, config);
      if (!validation.valid) {
        errors.push(`Node '${nodeId}' configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Check compatibility with next node
      if (i < nodeConfigs.length - 1) {
        const nextNodeId = nodeConfigs[i + 1].nodeId;
        if (!this.nodeRegistry.getNodeCompatibility(nodeId, nextNodeId)) {
          warnings.push(`Potential compatibility issue between '${nodeId}' and '${nextNodeId}'`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getExecutionMetrics(results: NodeExecutionResult[]): {
    totalTime: number;
    successRate: number;
    failedNodes: string[];
    averageExecutionTime: number;
    slowestNode: { nodeId: string; time: number } | null;
    fastestNode: { nodeId: string; time: number } | null;
  } {
    const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const successCount = results.filter(r => r.success).length;
    const failedNodes = results.filter(r => !r.success).map(r => r.nodeId);
    
    const executionTimes = results.map(r => r.executionTime);
    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    const slowestResult = results.reduce((slowest, current) => 
      current.executionTime > (slowest?.executionTime || 0) ? current : slowest, 
      null as NodeExecutionResult | null
    );

    const fastestResult = results.reduce((fastest, current) => 
      current.executionTime < (fastest?.executionTime || Infinity) ? current : fastest,
      null as NodeExecutionResult | null
    );

    return {
      totalTime,
      successRate: results.length > 0 ? successCount / results.length : 0,
      failedNodes,
      averageExecutionTime,
      slowestNode: slowestResult ? { nodeId: slowestResult.nodeId, time: slowestResult.executionTime } : null,
      fastestNode: fastestResult ? { nodeId: fastestResult.nodeId, time: fastestResult.executionTime } : null
    };
  }
}