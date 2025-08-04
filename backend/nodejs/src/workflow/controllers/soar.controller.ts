import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SOARIntegrationService, SOARPlatform, SOARAction, ExecutionResult } from '../services/soar-integration.service';

@ApiTags('SOAR Integration')
@Controller('soar')
export class SOARController {
  constructor(
    private soarService: SOARIntegrationService
  ) {}

  // Platform Management
  @Get('platforms')
  @ApiOperation({ summary: 'Get all SOAR platforms' })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean, description: 'Filter by enabled status' })
  @ApiResponse({ status: 200, description: 'List of SOAR platforms' })
  getPlatforms(@Query('enabled') enabled?: boolean): SOARPlatform[] {
    if (enabled !== undefined) {
      return enabled ? this.soarService.getEnabledPlatforms() : this.soarService.getAllPlatforms().filter(p => !p.isEnabled);
    }
    return this.soarService.getAllPlatforms();
  }

  @Get('platforms/:platformId')
  @ApiOperation({ summary: 'Get specific SOAR platform' })
  @ApiParam({ name: 'platformId', description: 'Platform identifier' })
  @ApiResponse({ status: 200, description: 'Platform details' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  getPlatform(@Param('platformId') platformId: string): SOARPlatform {
    const platform = this.soarService.getPlatform(platformId);
    if (!platform) {
      throw new HttpException(`Platform '${platformId}' not found`, HttpStatus.NOT_FOUND);
    }
    return platform;
  }

  @Post('platforms/:platformId/test')
  @ApiOperation({ summary: 'Test SOAR platform connection' })
  @ApiParam({ name: 'platformId', description: 'Platform identifier' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  async testPlatformConnection(@Param('platformId') platformId: string) {
    const platform = this.soarService.getPlatform(platformId);
    if (!platform) {
      throw new HttpException(`Platform '${platformId}' not found`, HttpStatus.NOT_FOUND);
    }

    const result = await this.soarService.testPlatformConnection(platformId);
    
    return {
      platformId,
      platformName: platform.name,
      ...result,
      testedAt: new Date().toISOString()
    };
  }

  @Post('platforms')
  @ApiOperation({ summary: 'Register new SOAR platform' })
  @ApiResponse({ status: 201, description: 'Platform registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid platform configuration' })
  registerPlatform(@Body() platform: SOARPlatform) {
    try {
      this.soarService.registerPlatform(platform);
      return {
        message: 'Platform registered successfully',
        platformId: platform.id
      };
    } catch (error) {
      throw new HttpException('Failed to register platform: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Action Management
  @Get('actions')
  @ApiOperation({ summary: 'Get all SOAR actions' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of SOAR actions' })
  getActions(
    @Query('platform') platform?: string,
    @Query('category') category?: string
  ): SOARAction[] {
    let actions = this.soarService.getAllActions();

    if (platform) {
      actions = this.soarService.getActionsByPlatform(platform);
    }

    if (category) {
      actions = actions.filter(action => action.category === category);
    }

    return actions;
  }

  @Get('actions/categories')
  @ApiOperation({ summary: 'Get all action categories' })
  @ApiResponse({ status: 200, description: 'List of action categories' })
  getActionCategories() {
    const categories = [
      {
        id: 'investigation',
        name: 'Investigation',
        description: 'Actions for gathering information and investigating threats',
        icon: 'search'
      },
      {
        id: 'containment',
        name: 'Containment',
        description: 'Actions for containing and blocking threats',
        icon: 'shield'
      },
      {
        id: 'eradication',
        name: 'Eradication',
        description: 'Actions for removing threats from the environment',
        icon: 'trash'
      },
      {
        id: 'notification',
        name: 'Notification',
        description: 'Actions for alerting and communicating about threats',
        icon: 'bell'
      },
      {
        id: 'analysis',
        name: 'Analysis',
        description: 'Actions for deep analysis of threats and artifacts',
        icon: 'microscope'
      }
    ];

    return { categories };
  }

  @Get('actions/:actionId')
  @ApiOperation({ summary: 'Get specific SOAR action' })
  @ApiParam({ name: 'actionId', description: 'Action identifier' })
  @ApiResponse({ status: 200, description: 'Action details' })
  @ApiResponse({ status: 404, description: 'Action not found' })
  getAction(@Param('actionId') actionId: string): SOARAction {
    const action = this.soarService.getAction(actionId);
    if (!action) {
      throw new HttpException(`Action '${actionId}' not found`, HttpStatus.NOT_FOUND);
    }
    return action;
  }

  @Post('actions')
  @ApiOperation({ summary: 'Register new SOAR action' })
  @ApiResponse({ status: 201, description: 'Action registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action configuration' })
  registerAction(@Body() action: SOARAction) {
    try {
      this.soarService.registerAction(action);
      return {
        message: 'Action registered successfully',
        actionId: action.id
      };
    } catch (error) {
      throw new HttpException('Failed to register action: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Action Execution
  @Post('actions/:actionId/execute')
  @ApiOperation({ summary: 'Execute SOAR action' })
  @ApiParam({ name: 'actionId', description: 'Action identifier' })
  @ApiResponse({ status: 200, description: 'Action execution result' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Action not found' })
  async executeAction(
    @Param('actionId') actionId: string,
    @Body() body: {
      parameters: Record<string, any>;
      context?: Record<string, any>;
    }
  ): Promise<ExecutionResult> {
    const action = this.soarService.getAction(actionId);
    if (!action) {
      throw new HttpException(`Action '${actionId}' not found`, HttpStatus.NOT_FOUND);
    }

    const result = await this.soarService.executeAction(
      actionId,
      body.parameters,
      body.context
    );

    if (!result.success && result.error?.includes('not found')) {
      throw new HttpException(result.error, HttpStatus.NOT_FOUND);
    }

    if (!result.success && result.error?.includes('Parameter validation failed')) {
      throw new HttpException(result.error, HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  @Post('actions/bulk-execute')
  @ApiOperation({ summary: 'Execute multiple SOAR actions' })
  @ApiResponse({ status: 200, description: 'Bulk execution results' })
  async executeBulkActions(@Body() body: {
    actions: Array<{
      actionId: string;
      parameters: Record<string, any>;
      context?: Record<string, any>;
    }>;
    mode: 'sequential' | 'parallel';
  }) {
    const { actions, mode = 'parallel' } = body;
    const results: ExecutionResult[] = [];

    if (mode === 'sequential') {
      for (const actionRequest of actions) {
        const result = await this.soarService.executeAction(
          actionRequest.actionId,
          actionRequest.parameters,
          actionRequest.context
        );
        results.push(result);

        // Stop on first failure if configured
        if (!result.success && body.mode === 'sequential') {
          break;
        }
      }
    } else {
      // Parallel execution
      const promises = actions.map(actionRequest =>
        this.soarService.executeAction(
          actionRequest.actionId,
          actionRequest.parameters,
          actionRequest.context
        )
      );

      const settledResults = await Promise.allSettled(promises);
      results.push(...settledResults.map(r => 
        r.status === 'fulfilled' ? r.value : {
          success: false,
          actionId: 'unknown',
          platform: 'unknown',
          result: null,
          executionTime: 0,
          error: r.reason?.message || 'Unknown error'
        }
      ));
    }

    return {
      mode,
      totalActions: actions.length,
      successfulActions: results.filter(r => r.success).length,
      failedActions: results.filter(r => !r.success).length,
      results
    };
  }

  @Post('actions/:actionId/validate')
  @ApiOperation({ summary: 'Validate action parameters' })
  @ApiParam({ name: 'actionId', description: 'Action identifier' })
  @ApiResponse({ status: 200, description: 'Parameter validation result' })
  @ApiResponse({ status: 404, description: 'Action not found' })
  validateActionParameters(
    @Param('actionId') actionId: string,
    @Body() parameters: Record<string, any>
  ) {
    const action = this.soarService.getAction(actionId);
    if (!action) {
      throw new HttpException(`Action '${actionId}' not found`, HttpStatus.NOT_FOUND);
    }

    const validation = this.soarService.validateActionParameters(action, parameters);
    
    return {
      actionId,
      valid: validation.valid,
      errors: validation.errors,
      parameters
    };
  }

  // Playbook Management
  @Get('playbooks')
  @ApiOperation({ summary: 'Get available SOAR playbooks' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of SOAR playbooks' })
  getPlaybooks(
    @Query('platform') platform?: string,
    @Query('category') category?: string
  ) {
    // This would typically fetch from database or platform APIs
    const samplePlaybooks = [
      {
        id: 'incident-response-malware',
        name: 'Malware Incident Response',
        platform: 'phantom',
        description: 'Automated response to malware incidents',
        category: 'incident-response',
        actions: ['ip-reputation-lookup', 'block-ip', 'isolate-endpoint', 'send-email-alert'],
        triggers: ['malware_detected', 'suspicious_file']
      },
      {
        id: 'phishing-investigation',
        name: 'Phishing Email Investigation',
        platform: 'demisto',
        description: 'Investigate and respond to phishing emails',
        category: 'investigation',
        actions: ['domain-reputation-lookup', 'analyze-url', 'block-domain', 'create-ticket'],
        triggers: ['phishing_email', 'suspicious_url']
      }
    ];

    let filtered = samplePlaybooks;

    if (platform) {
      filtered = filtered.filter(p => p.platform === platform);
    }

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    return { playbooks: filtered };
  }

  // Metrics and History
  @Get('metrics')
  @ApiOperation({ summary: 'Get SOAR integration metrics' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range for metrics' })
  @ApiResponse({ status: 200, description: 'SOAR metrics' })
  async getMetrics(
    @Query('platform') platform?: string,
    @Query('timeRange') timeRange?: string
  ) {
    const metrics = await this.soarService.getActionMetrics(platform, timeRange);
    
    return {
      platform,
      timeRange,
      metrics,
      generatedAt: new Date().toISOString()
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get action execution history' })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return' })
  @ApiResponse({ status: 200, description: 'Action execution history' })
  async getActionHistory(
    @Query('platform') platform?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: number
  ) {
    const history = await this.soarService.getActionHistory(platform, action, limit || 50);
    
    return {
      platform,
      action,
      limit: limit || 50,
      history,
      totalRecords: history.length
    };
  }

  // Platform Statistics
  @Get('platforms/:platformId/statistics')
  @ApiOperation({ summary: 'Get platform-specific statistics' })
  @ApiParam({ name: 'platformId', description: 'Platform identifier' })
  @ApiResponse({ status: 200, description: 'Platform statistics' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  async getPlatformStatistics(@Param('platformId') platformId: string) {
    const platform = this.soarService.getPlatform(platformId);
    if (!platform) {
      throw new HttpException(`Platform '${platformId}' not found`, HttpStatus.NOT_FOUND);
    }

    const actions = this.soarService.getActionsByPlatform(platformId);
    const metrics = await this.soarService.getActionMetrics(platformId);

    return {
      platform: {
        id: platform.id,
        name: platform.name,
        type: platform.type,
        isEnabled: platform.isEnabled,
        capabilities: platform.capabilities
      },
      statistics: {
        totalActions: actions.length,
        actionsByCategory: actions.reduce((acc, action) => {
          acc[action.category] = (acc[action.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        ...metrics
      }
    };
  }

  // Webhook endpoint for platform callbacks
  @Post('webhook/:platformId')
  @ApiOperation({ summary: 'Webhook endpoint for platform callbacks' })
  @ApiParam({ name: 'platformId', description: 'Platform identifier' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Param('platformId') platformId: string,
    @Body() payload: any
  ) {
    // Handle webhook callbacks from SOAR platforms
    // This would typically update execution status, results, etc.
    
    console.log(`Received webhook from platform ${platformId}:`, payload);
    
    return {
      received: true,
      platformId,
      timestamp: new Date().toISOString(),
      payloadSize: JSON.stringify(payload).length
    };
  }

  // Health check endpoint
  @Get('health')
  @ApiOperation({ summary: 'Check SOAR integration health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealthStatus() {
    const platforms = this.soarService.getEnabledPlatforms();
    const healthChecks = await Promise.all(
      platforms.map(async platform => {
        const result = await this.soarService.testPlatformConnection(platform.id);
        return {
          platformId: platform.id,
          platformName: platform.name,
          ...result
        };
      })
    );

    const healthyPlatforms = healthChecks.filter(h => h.connected).length;
    const totalPlatforms = platforms.length;

    return {
      overall: totalPlatforms > 0 ? (healthyPlatforms / totalPlatforms >= 0.5 ? 'healthy' : 'degraded') : 'no_platforms',
      platforms: healthChecks,
      summary: {
        total: totalPlatforms,
        healthy: healthyPlatforms,
        unhealthy: totalPlatforms - healthyPlatforms
      },
      checkedAt: new Date().toISOString()
    };
  }
}