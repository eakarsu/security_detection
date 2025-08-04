import { SecurityNode, SecurityEvent, SecurityResult, SecurityNodeConfig, NodeSchema, ValidationResult } from '../interfaces/security-node.interface';
import { SOARIntegrationService, ExecutionResult } from '../services/soar-integration.service';
import { Inject } from '@nestjs/common';

interface SOARActionResult {
  action_id: string;
  platform: string;
  success: boolean;
  execution_time: number;
  result: any;
  error?: string;
  timestamp: string;
}

export class SOARActionNode extends SecurityNode {
  id = 'soar-action-executor';
  type = 'soar-action';
  category = 'soar' as const;
  name = 'SOAR Action Executor';
  description = 'Executes actions on connected SOAR platforms';
  version = '1.0.0';

  constructor(
    @Inject(SOARIntegrationService)
    private soarService: SOARIntegrationService
  ) {
    super();
  }

  async execute(input: SecurityEvent, config: SOARNodeConfig): Promise<SecurityResult> {
    try {
      const { action_id, parameters, execution_mode = 'single', context } = config;

      if (execution_mode === 'single') {
        return await this.executeSingleAction(action_id, parameters, context, input);
      } else {
        return await this.executeMultipleActions(config.actions || [], input);
      }

    } catch (error) {
      return this.createResult(false, null, {
        error: `SOAR action execution failed: ${error.message}`
      });
    }
  }

  private async executeSingleAction(
    actionId: string,
    parameters: Record<string, any>,
    context: Record<string, any> = {},
    input: SecurityEvent
  ): Promise<SecurityResult> {
    
    // Merge input data with parameters
    const enrichedParameters = this.enrichParameters(parameters, input);
    const enrichedContext = { ...context, event_id: input.event_id, severity: input.severity };

    const result = await this.soarService.executeAction(actionId, enrichedParameters, enrichedContext);
    
    const actionResult: SOARActionResult = {
      action_id: result.actionId,
      platform: result.platform,
      success: result.success,
      execution_time: result.executionTime,
      result: result.result,
      error: result.error,
      timestamp: new Date().toISOString()
    };

    return this.createResult(result.success, actionResult, {
      confidence: result.success ? 0.9 : 0.1,
      recommendations: this.generateActionRecommendations(result, actionId)
    });
  }

  private async executeMultipleActions(
    actions: Array<{ action_id: string; parameters: Record<string, any>; context?: Record<string, any> }>,
    input: SecurityEvent
  ): Promise<SecurityResult> {
    
    const results: SOARActionResult[] = [];
    let allSuccessful = true;

    for (const actionConfig of actions) {
      const enrichedParameters = this.enrichParameters(actionConfig.parameters, input);
      const enrichedContext = { 
        ...actionConfig.context, 
        event_id: input.event_id, 
        severity: input.severity 
      };

      const result = await this.soarService.executeAction(
        actionConfig.action_id,
        enrichedParameters,
        enrichedContext
      );

      const actionResult: SOARActionResult = {
        action_id: result.actionId,
        platform: result.platform,
        success: result.success,
        execution_time: result.executionTime,
        result: result.result,
        error: result.error,
        timestamp: new Date().toISOString()
      };

      results.push(actionResult);

      if (!result.success) {
        allSuccessful = false;
      }
    }

    const totalExecutionTime = results.reduce((sum, r) => sum + r.execution_time, 0);
    const successCount = results.filter(r => r.success).length;

    return this.createResult(allSuccessful, {
      actions_executed: results.length,
      successful_actions: successCount,
      failed_actions: results.length - successCount,
      total_execution_time: totalExecutionTime,
      results
    }, {
      confidence: successCount / results.length,
      recommendations: this.generateMultiActionRecommendations(results)
    });
  }

  private enrichParameters(parameters: Record<string, any>, input: SecurityEvent): Record<string, any> {
    const enriched = { ...parameters };

    // Replace placeholders with input data
    for (const [key, value] of Object.entries(enriched)) {
      if (typeof value === 'string') {
        enriched[key] = value
          .replace('{{source_ip}}', input.source_ip || '')
          .replace('{{destination_ip}}', input.destination_ip || '')
          .replace('{{event_id}}', input.event_id || '')
          .replace('{{threat_type}}', input.threat_type || '')
          .replace('{{severity}}', input.severity || '')
          .replace('{{risk_score}}', input.risk_score?.toString() || '0')
          .replace('{{timestamp}}', input.timestamp || new Date().toISOString());
      }
    }

    // Add common enrichments
    if (!enriched.source_ip && input.source_ip) {
      enriched.source_ip = input.source_ip;
    }
    if (!enriched.threat_type && input.threat_type) {
      enriched.threat_type = input.threat_type;
    }

    return enriched;
  }

  configure(params: SOARNodeConfig): ValidationResult {
    const schema = this.getSchema();
    const validation = this.validateConfig(params, schema);

    // Additional SOAR-specific validations
    const errors = [...validation.errors];

    if (params.execution_mode === 'single') {
      if (!params.action_id) {
        errors.push('action_id is required for single execution mode');
      }
    } else if (params.execution_mode === 'multiple') {
      if (!params.actions || !Array.isArray(params.actions) || params.actions.length === 0) {
        errors.push('actions array is required for multiple execution mode');
      }
    }

    // Validate that specified actions exist
    if (params.action_id) {
      const action = this.soarService.getAction(params.action_id);
      if (!action) {
        errors.push(`Action '${params.action_id}' not found`);
      }
    }

    if (params.actions) {
      for (const actionConfig of params.actions) {
        if (!actionConfig.action_id) {
          errors.push('Each action must have an action_id');
          continue;
        }
        
        const action = this.soarService.getAction(actionConfig.action_id);
        if (!action) {
          errors.push(`Action '${actionConfig.action_id}' not found`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSchema(): NodeSchema {
    const availableActions = this.soarService.getAllActions();
    const actionOptions = availableActions.map(a => `${a.id} (${a.name})`);

    return {
      inputs: [
        {
          name: 'event_id',
          type: 'string',
          required: true,
          description: 'Security event identifier'
        },
        {
          name: 'threat_type',
          type: 'string',
          required: false,
          description: 'Type of security threat'
        },
        {
          name: 'severity',
          type: 'string',
          required: false,
          description: 'Event severity level'
        },
        {
          name: 'source_ip',
          type: 'string',
          required: false,
          description: 'Source IP address'
        },
        {
          name: 'destination_ip',
          type: 'string',
          required: false,
          description: 'Destination IP address'
        }
      ],
      outputs: [
        {
          name: 'action_id',
          type: 'string',
          description: 'Executed action identifier'
        },
        {
          name: 'platform',
          type: 'string',
          description: 'SOAR platform used'
        },
        {
          name: 'success',
          type: 'boolean',
          description: 'Whether the action executed successfully'
        },
        {
          name: 'execution_time',
          type: 'number',
          description: 'Action execution time in milliseconds'
        },
        {
          name: 'result',
          type: 'object',
          description: 'Action execution result'
        },
        {
          name: 'actions_executed',
          type: 'number',
          description: 'Number of actions executed (multiple mode)'
        },
        {
          name: 'successful_actions',
          type: 'number',
          description: 'Number of successful actions (multiple mode)'
        }
      ],
      config: [
        {
          name: 'execution_mode',
          type: 'select',
          required: true,
          default: 'single',
          options: ['single', 'multiple'],
          description: 'Execution mode: single action or multiple actions'
        },
        {
          name: 'action_id',
          type: 'select',
          required: false,
          options: actionOptions,
          description: 'SOAR action to execute (required for single mode)'
        },
        {
          name: 'parameters',
          type: 'object',
          required: false,
          default: {},
          description: 'Action parameters (supports {{placeholders}})'
        },
        {
          name: 'context',
          type: 'object',
          required: false,
          default: {},
          description: 'Additional context for action execution'
        },
        {
          name: 'actions',
          type: 'array',
          required: false,
          description: 'Array of actions for multiple execution mode'
        },
        {
          name: 'stop_on_failure',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Stop execution on first failure (multiple mode)'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          default: 30000,
          description: 'Action timeout in milliseconds'
        }
      ]
    };
  }

  private generateActionRecommendations(result: ExecutionResult, actionId: string): string[] {
    const recommendations = [];

    if (result.success) {
      recommendations.push(`Successfully executed ${actionId} action`);
      recommendations.push('Review action results for next steps');
      
      if (result.executionTime > 10000) {
        recommendations.push('Action took longer than expected - consider optimizing parameters');
      }
    } else {
      recommendations.push(`Action ${actionId} failed - review error details`);
      recommendations.push('Check platform connectivity and permissions');
      recommendations.push('Verify action parameters are correct');
      
      if (result.error?.includes('timeout')) {
        recommendations.push('Consider increasing timeout value');
      }
      
      if (result.error?.includes('permission') || result.error?.includes('unauthorized')) {
        recommendations.push('Check API credentials and permissions');
      }
    }

    return recommendations;
  }

  private generateMultiActionRecommendations(results: SOARActionResult[]): string[] {
    const recommendations = [];
    const failedActions = results.filter(r => !r.success);
    const successfulActions = results.filter(r => r.success);

    if (successfulActions.length === results.length) {
      recommendations.push('All actions executed successfully');
      recommendations.push('Review individual action results for follow-up');
    } else if (failedActions.length === results.length) {
      recommendations.push('All actions failed - check platform connectivity');
      recommendations.push('Review error messages for troubleshooting');
    } else {
      recommendations.push(`${successfulActions.length}/${results.length} actions succeeded`);
      recommendations.push('Review failed actions for retry or alternative approaches');
    }

    // Platform-specific recommendations
    const platforms = [...new Set(results.map(r => r.platform))];
    if (platforms.length > 1) {
      recommendations.push(`Actions executed across ${platforms.length} platforms: ${platforms.join(', ')}`);
    }

    // Performance recommendations
    const totalTime = results.reduce((sum, r) => sum + r.execution_time, 0);
    const avgTime = totalTime / results.length;
    
    if (avgTime > 15000) {
      recommendations.push('Consider parallel execution for better performance');
    }

    return recommendations;
  }
}

interface SOARNodeConfig extends SecurityNodeConfig {
  execution_mode: 'single' | 'multiple';
  action_id?: string;
  parameters?: Record<string, any>;
  context?: Record<string, any>;
  actions?: Array<{
    action_id: string;
    parameters: Record<string, any>;
    context?: Record<string, any>;
  }>;
  stop_on_failure?: boolean;
  timeout?: number;
}