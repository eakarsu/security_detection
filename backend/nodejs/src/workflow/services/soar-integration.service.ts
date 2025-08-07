import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface SOARPlatform {
  id: string;
  name: string;
  type: 'phantom' | 'demisto' | 'siemplify' | 'swimlane' | 'splunk' | 'custom';
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  capabilities: string[];
  config: Record<string, any>;
}

export interface SOARAction {
  id: string;
  name: string;
  platform: string;
  category: 'investigation' | 'containment' | 'eradication' | 'notification' | 'analysis';
  description: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    required: boolean;
    description: string;
    options?: string[];
  }>;
}

export interface SOARPlaybook {
  id: string;
  name: string;
  platform: string;
  description: string;
  category: string;
  actions: SOARAction[];
  triggers: string[];
}

export interface ExecutionResult {
  success: boolean;
  actionId: string;
  platform: string;
  result: any;
  executionTime: number;
  error?: string;
}

@Injectable()
export class SOARIntegrationService {
  private platforms = new Map<string, SOARPlatform>();
  private actions = new Map<string, SOARAction>();

  constructor() {
    this.initializeDefaultPlatforms();
    this.initializeDefaultActions();
  }

  // Platform Management
  registerPlatform(platform: SOARPlatform): void {
    this.platforms.set(platform.id, platform);
  }

  getPlatform(platformId: string): SOARPlatform | undefined {
    return this.platforms.get(platformId);
  }

  getAllPlatforms(): SOARPlatform[] {
    return Array.from(this.platforms.values());
  }

  getEnabledPlatforms(): SOARPlatform[] {
    return Array.from(this.platforms.values()).filter(p => p.isEnabled);
  }

  async testPlatformConnection(platformId: string): Promise<{ connected: boolean; error?: string }> {
    const platform = this.getPlatform(platformId);
    if (!platform) {
      return { connected: false, error: 'Platform not found' };
    }

    try {
      const response = await this.makePlatformRequest(platform, 'GET', '/health', {});
      return { connected: response.status === 200 };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  // Action Management
  registerAction(action: SOARAction): void {
    this.actions.set(action.id, action);
  }

  getAction(actionId: string): SOARAction | undefined {
    return this.actions.get(actionId);
  }

  getActionsByPlatform(platformId: string): SOARAction[] {
    return Array.from(this.actions.values()).filter(a => a.platform === platformId);
  }

  getActionsByCategory(category: string): SOARAction[] {
    return Array.from(this.actions.values()).filter(a => a.category === category);
  }

  getAllActions(): SOARAction[] {
    return Array.from(this.actions.values());
  }

  // Action Execution
  async executeAction(
    actionId: string,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const action = this.getAction(actionId);
    
    if (!action) {
      return {
        success: false,
        actionId,
        platform: 'unknown',
        result: null,
        executionTime: Date.now() - startTime,
        error: 'Action not found'
      };
    }

    const platform = this.getPlatform(action.platform);
    if (!platform || !platform.isEnabled) {
      return {
        success: false,
        actionId,
        platform: action.platform,
        result: null,
        executionTime: Date.now() - startTime,
        error: 'Platform not available or disabled'
      };
    }

    try {
      // Validate parameters
      const validation = this.validateActionParameters(action, parameters);
      if (!validation.valid) {
        throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute action based on platform type
      const result = await this.executeActionOnPlatform(platform, action, parameters, context);
      
      return {
        success: true,
        actionId,
        platform: action.platform,
        result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        actionId,
        platform: action.platform,
        result: null,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  private async executeActionOnPlatform(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    switch (platform.type) {
      case 'phantom':
        return this.executePhantomAction(platform, action, parameters, context);
      case 'demisto':
        return this.executeDemistoAction(platform, action, parameters, context);
      case 'siemplify':
        return this.executeSiemplifyAction(platform, action, parameters, context);
      case 'swimlane':
        return this.executeSwimLaneAction(platform, action, parameters, context);
      case 'splunk':
        return this.executeSplunkAction(platform, action, parameters, context);
      default:
        return this.executeCustomAction(platform, action, parameters, context);
    }
  }

  // Platform-specific implementations
  private async executePhantomAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    const endpoint = `/rest/action_run`;
    const payload = {
      action: action.name,
      parameters,
      assets: [platform.config.assetName || 'default'],
      callback: platform.config.callback,
      context
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async executeDemistoAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    const endpoint = `/incident/execute-command`;
    const payload = {
      command: action.name,
      args: parameters,
      incidentId: context?.incidentId || 'new',
      investigationId: context?.investigationId
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async executeSiemplifyAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    const endpoint = `/external/v1/actions/execute`;
    const payload = {
      action_name: action.name,
      parameters,
      environment: platform.config.environment || 'default',
      case_id: context?.caseId
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async executeSwimLaneAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    const endpoint = `/api/action/${action.name}/execute`;
    const payload = {
      inputs: parameters,
      workspaceId: platform.config.workspaceId,
      context
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async executeSplunkAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    const endpoint = `/servicesNS/nobody/phantom/data/ui/action_run`;
    const payload = {
      action: action.name,
      parameters,
      container_id: context?.containerId,
      app_run_id: context?.appRunId
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async executeCustomAction(
    platform: SOARPlatform,
    action: SOARAction,
    parameters: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    // For custom platforms, use the configured endpoint pattern
    const endpoint = platform.config.actionEndpoint || `/api/actions/${action.name}`;
    const payload = {
      action: action.name,
      parameters,
      context
    };

    const response = await this.makePlatformRequest(platform, 'POST', endpoint, payload);
    return response.data;
  }

  private async makePlatformRequest(
    platform: SOARPlatform,
    method: string,
    endpoint: string,
    data: any
  ): Promise<any> {
    const config = {
      method: method.toLowerCase(),
      url: `${platform.baseUrl}${endpoint}`,
      headers: {
        'Authorization': this.getAuthHeader(platform),
        'Content-Type': 'application/json',
        'User-Agent': 'NodeGuard-SOAR-Integration'
      },
      timeout: 30000,
      ...(method.toLowerCase() !== 'get' && { data })
    };

    return await axios(config);
  }

  private getAuthHeader(platform: SOARPlatform): string {
    switch (platform.type) {
      case 'phantom':
        return `ph-auth-token ${platform.apiKey}`;
      case 'demisto':
        return `Bearer ${platform.apiKey}`;
      case 'siemplify':
        return `APIToken ${platform.apiKey}`;
      case 'swimlane':
        return `Bearer ${platform.apiKey}`;
      case 'splunk':
        return `Splunk ${platform.apiKey}`;
      default:
        return `Bearer ${platform.apiKey}`;
    }
  }

  public validateActionParameters(
    action: SOARAction,
    parameters: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of action.parameters) {
      const value = parameters[param.name];

      if (param.required && (value === undefined || value === '')) {
        errors.push(`Required parameter '${param.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== '') {
        if (param.type === 'number' && isNaN(Number(value))) {
          errors.push(`Parameter '${param.name}' must be a number`);
        }

        if (param.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter '${param.name}' must be a boolean`);
        }

        if (param.type === 'select' && param.options && !param.options.includes(value)) {
          errors.push(`Parameter '${param.name}' must be one of: ${param.options.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Initialization methods
  private initializeDefaultPlatforms(): void {
    const defaultPlatforms: SOARPlatform[] = [
      {
        id: 'phantom',
        name: 'Splunk Phantom',
        type: 'phantom',
        baseUrl: process.env.PHANTOM_URL || 'https://phantom.example.com',
        apiKey: process.env.PHANTOM_API_KEY || '',
        isEnabled: !!process.env.PHANTOM_API_KEY,
        capabilities: ['investigation', 'containment', 'notification'],
        config: {
          assetName: 'default',
          callback: true
        }
      },
      {
        id: 'demisto',
        name: 'Palo Alto Cortex XSOAR',
        type: 'demisto',
        baseUrl: process.env.DEMISTO_URL || 'https://xsoar.example.com',
        apiKey: process.env.DEMISTO_API_KEY || '',
        isEnabled: !!process.env.DEMISTO_API_KEY,
        capabilities: ['investigation', 'containment', 'eradication', 'analysis'],
        config: {
          version: 'v1'
        }
      },
      {
        id: 'siemplify',
        name: 'Google Chronicle SOAR',
        type: 'siemplify',
        baseUrl: process.env.SIEMPLIFY_URL || 'https://siemplify.example.com',
        apiKey: process.env.SIEMPLIFY_API_KEY || '',
        isEnabled: !!process.env.SIEMPLIFY_API_KEY,
        capabilities: ['investigation', 'containment', 'notification'],
        config: {
          environment: 'default'
        }
      }
    ];

    defaultPlatforms.forEach(platform => this.registerPlatform(platform));
  }

  private initializeDefaultActions(): void {
    const defaultActions: SOARAction[] = [
      // Investigation Actions
      {
        id: 'ip-reputation-lookup',
        name: 'IP Reputation Lookup',
        platform: 'phantom',
        category: 'investigation',
        description: 'Look up IP address reputation',
        parameters: [
          {
            name: 'ip_address',
            type: 'string',
            required: true,
            description: 'IP address to lookup'
          }
        ]
      },
      {
        id: 'domain-reputation-lookup',
        name: 'Domain Reputation Lookup',
        platform: 'phantom',
        category: 'investigation',
        description: 'Look up domain reputation',
        parameters: [
          {
            name: 'domain',
            type: 'string',
            required: true,
            description: 'Domain to lookup'
          }
        ]
      },
      {
        id: 'file-hash-lookup',
        name: 'File Hash Lookup',
        platform: 'demisto',
        category: 'investigation',
        description: 'Look up file hash reputation',
        parameters: [
          {
            name: 'hash',
            type: 'string',
            required: true,
            description: 'File hash to lookup'
          },
          {
            name: 'hash_type',
            type: 'select',
            required: false,
            description: 'Type of hash',
            options: ['md5', 'sha1', 'sha256']
          }
        ]
      },

      // Containment Actions
      {
        id: 'block-ip',
        name: 'Block IP Address',
        platform: 'phantom',
        category: 'containment',
        description: 'Block IP address on firewall',
        parameters: [
          {
            name: 'ip_address',
            type: 'string',
            required: true,
            description: 'IP address to block'
          },
          {
            name: 'duration',
            type: 'number',
            required: false,
            description: 'Block duration in hours (0 = permanent)'
          }
        ]
      },
      {
        id: 'block-domain',
        name: 'Block Domain',
        platform: 'demisto',
        category: 'containment',
        description: 'Block domain on DNS/proxy',
        parameters: [
          {
            name: 'domain',
            type: 'string',
            required: true,
            description: 'Domain to block'
          },
          {
            name: 'block_type',
            type: 'select',
            required: false,
            description: 'Type of blocking',
            options: ['dns', 'proxy', 'both']
          }
        ]
      },
      {
        id: 'isolate-endpoint',
        name: 'Isolate Endpoint',
        platform: 'siemplify',
        category: 'containment',
        description: 'Isolate endpoint from network',
        parameters: [
          {
            name: 'hostname',
            type: 'string',
            required: true,
            description: 'Hostname or IP of endpoint'
          },
          {
            name: 'isolation_type',
            type: 'select',
            required: false,
            description: 'Type of isolation',
            options: ['network', 'full', 'partial']
          }
        ]
      },

      // Notification Actions
      {
        id: 'send-email-alert',
        name: 'Send Email Alert',
        platform: 'phantom',
        category: 'notification',
        description: 'Send email notification',
        parameters: [
          {
            name: 'recipients',
            type: 'string',
            required: true,
            description: 'Email recipients (comma-separated)'
          },
          {
            name: 'subject',
            type: 'string',
            required: true,
            description: 'Email subject'
          },
          {
            name: 'body',
            type: 'string',
            required: true,
            description: 'Email body'
          },
          {
            name: 'priority',
            type: 'select',
            required: false,
            description: 'Email priority',
            options: ['low', 'normal', 'high', 'urgent']
          }
        ]
      },
      {
        id: 'create-ticket',
        name: 'Create Support Ticket',
        platform: 'demisto',
        category: 'notification',
        description: 'Create support ticket',
        parameters: [
          {
            name: 'title',
            type: 'string',
            required: true,
            description: 'Ticket title'
          },
          {
            name: 'description',
            type: 'string',
            required: true,
            description: 'Ticket description'
          },
          {
            name: 'severity',
            type: 'select',
            required: false,
            description: 'Ticket severity',
            options: ['low', 'medium', 'high', 'critical']
          },
          {
            name: 'assignee',
            type: 'string',
            required: false,
            description: 'Ticket assignee'
          }
        ]
      },

      // Analysis Actions
      {
        id: 'detonate-file',
        name: 'Detonate File in Sandbox',
        platform: 'demisto',
        category: 'analysis',
        description: 'Analyze file in sandbox environment',
        parameters: [
          {
            name: 'file_hash',
            type: 'string',
            required: true,
            description: 'File hash to analyze'
          },
          {
            name: 'sandbox',
            type: 'select',
            required: false,
            description: 'Sandbox to use',
            options: ['wildfire', 'cuckoo', 'vmray', 'joe']
          },
          {
            name: 'timeout',
            type: 'number',
            required: false,
            description: 'Analysis timeout in minutes'
          }
        ]
      },
      {
        id: 'analyze-url',
        name: 'Analyze URL',
        platform: 'phantom',
        category: 'analysis',
        description: 'Analyze URL for malicious content',
        parameters: [
          {
            name: 'url',
            type: 'string',
            required: true,
            description: 'URL to analyze'
          },
          {
            name: 'screenshot',
            type: 'boolean',
            required: false,
            description: 'Take screenshot of page'
          }
        ]
      }
    ];

    defaultActions.forEach(action => this.registerAction(action));
  }

  // Utility methods
  async getActionHistory(
    platformId?: string,
    actionId?: string,
    limit: number = 50
  ): Promise<any[]> {
    // This would typically query a database for execution history
    // For now, return empty array
    return [];
  }

  async getActionMetrics(
    platformId?: string,
    timeRange?: string
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    platformBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  }> {
    // This would typically calculate metrics from execution history
    return {
      totalExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      platformBreakdown: {},
      categoryBreakdown: {}
    };
  }
}