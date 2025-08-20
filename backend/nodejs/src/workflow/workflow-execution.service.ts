import { Injectable, Logger } from '@nestjs/common';
import { Workflow, WorkflowNode } from './workflow.service';
import axios from 'axios';

export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  inputData: any;
  nodeResults: Record<string, any>;
  startTime: Date;
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
}

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);
  private aiCallTimes: Map<string, number[]> = new Map();
  private readonly aiRateLimitWindow = 60000; // 1 minute window
  private readonly aiMaxCallsPerWindow = 5; // Max 5 AI calls per minute

  async executeWorkflow(workflow: Workflow, inputData: any): Promise<any> {
    const executionId = Date.now().toString();
    const startTime = new Date();
    
    this.logger.log(`Starting workflow execution`, {
      workflowId: workflow.id,
      executionId,
      inputDataKeys: Object.keys(inputData)
    });

    const context: WorkflowExecutionContext = {
      workflowId: workflow.id,
      executionId,
      inputData,
      nodeResults: {},
      startTime
    };

    try {
      // Execute nodes in topological order based on edges
      const executionOrder = this.getExecutionOrder(workflow);
      const nodeResults: NodeExecutionResult[] = [];

      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const result = await this.executeNode(node, context);
        nodeResults.push(result);
        context.nodeResults[nodeId] = result;

        // Stop execution if a critical node fails
        if (!result.success && this.isCriticalNode(node)) {
          this.logger.error(`Critical node failed, stopping workflow execution`, {
            workflowId: workflow.id,
            nodeId: node.id,
            error: result.error
          });
          break;
        }
      }

      const endTime = new Date();
      const totalExecutionTime = endTime.getTime() - startTime.getTime();

      const executionResult = {
        workflowId: workflow.id,
        executionId,
        status: this.determineExecutionStatus(nodeResults),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        executionTime: totalExecutionTime,
        nodeResults,
        summary: this.generateExecutionSummary(nodeResults),
        outputData: this.extractOutputData(nodeResults)
      };

      this.logger.log(`Workflow execution completed`, {
        workflowId: workflow.id,
        executionId,
        status: executionResult.status,
        executionTime: totalExecutionTime
      });

      // Create incident if workflow detected high-risk threat
      await this.createIncidentIfHighRisk(workflow, context, executionResult);

      return executionResult;

    } catch (error) {
      this.logger.error(`Workflow execution failed`, {
        workflowId: workflow.id,
        executionId,
        error: error.message
      });

      return {
        workflowId: workflow.id,
        executionId,
        status: 'failed',
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        error: error.message,
        nodeResults: []
      };
    }
  }

  private async executeNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Executing node`, {
      nodeId: node.id,
      nodeType: node.type,
      workflowId: context.workflowId
    });

    try {
      let output: any;

      switch (node.type) {
        case 'input':
          output = await this.executeInputNode(node, context);
          break;
        case 'ml-scoring':
          output = await this.executeMlScoringNode(node, context);
          break;
        case 'ai-analysis':
          output = await this.executeAiAnalysisNode(node, context);
          break;
        case 'correlation':
          output = await this.executeCorrelationNode(node, context);
          break;
        case 'alert':
          output = await this.executeAlertNode(node, context);
          break;
        case 'response':
          output = await this.executeResponseNode(node, context);
          break;
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        nodeId: node.id,
        nodeType: node.type,
        success: true,
        output,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.logger.error(`Node execution failed`, {
        nodeId: node.id,
        nodeType: node.type,
        error: error.message
      });

      return {
        nodeId: node.id,
        nodeType: node.type,
        success: false,
        output: null,
        error: error.message,
        executionTime
      };
    }
  }

  private async executeInputNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    // Extract and validate input data based on node configuration
    const config = node.data?.config || {};
    const inputData = context.inputData;

    if (config.source === 'kafka') {
      return {
        source: 'kafka',
        topic: config.topic || 'security.events',
        eventData: inputData.event || inputData,
        batchSize: config.batchSize || 1,
        timestamp: new Date().toISOString()
      };
    }

    return {
      source: 'direct',
      data: inputData,
      timestamp: new Date().toISOString()
    };
  }

  private async executeMlScoringNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    const config = node.data?.config || {};
    const threshold = config.threshold || 0.7;
    const model = config.model || 'ensemble';
    
    // Get input data from previous nodes or context
    const inputData = context.inputData.event || context.inputData;
    
    try {
      // Call Python ML API for actual scoring
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
      const response = await axios.post(`${pythonApiUrl}/api/ml/predict`, {
        event_data: inputData,
        model_type: model,
        features: config.features || ['network', 'temporal', 'behavioral']
      }, { timeout: 5000 });

      const mlResult = response.data;
      const score = mlResult.threat_score || (inputData.risk_score / 10.0) || 0.5;
      const exceedsThreshold = score >= threshold;

      return {
        model,
        threshold,
        score,
        confidence: mlResult.confidence || 0.8,
        exceedsThreshold,
        features: config.features || ['network', 'temporal', 'behavioral'],
        analysis: mlResult.analysis || 'ML analysis completed',
        processingTime: mlResult.processing_time || 0.1
      };

    } catch (error) {
      // Fallback to basic scoring if ML API unavailable
      this.logger.warn('ML API unavailable, using fallback scoring', { error: error.message });
      
      const fallbackScore = (inputData.risk_score / 10.0) || 0.5;
      return {
        model: 'fallback',
        threshold,
        score: fallbackScore,
        confidence: 0.6,
        exceedsThreshold: fallbackScore >= threshold,
        features: config.features || [],
        analysis: 'Fallback scoring based on risk_score',
        processingTime: 0.01
      };
    }
  }

  private async executeAiAnalysisNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    const config = node.data?.config || {};
    const inputData = context.inputData.event || context.inputData;
    
    // Check rate limit before making AI call
    if (!this.checkAiRateLimit(context.workflowId)) {
      this.logger.warn('AI analysis rate limit exceeded, using cached/fallback analysis', {
        workflowId: context.workflowId,
        nodeId: node.id
      });
      
      return {
        model: 'rate_limited',
        analysisType: 'cached',
        analysis: `Rate limit exceeded. Basic threat analysis: ${inputData.threat_type || 'Unknown'}. Risk score: ${inputData.risk_score || 0}`,
        recommendations: ['Review incident manually', 'Check for false positives'],
        confidence: 0.6,
        threatLevel: inputData.severity?.toLowerCase() || 'medium',
        indicators: [inputData.source_ip, inputData.threat_type].filter(Boolean),
        processingTime: 0.001,
        rateLimited: true
      };
    }
    
    try {
      // Record AI call attempt
      this.recordAiCall(context.workflowId);
      
      // Call Python AI analysis API
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
      const response = await axios.post(`${pythonApiUrl}/api/ai/analyze`, {
        event_data: inputData,
        analysis_type: config.analysisType || 'comprehensive',
        include_context: config.includeContext || true,
        model: config.model || 'anthropic/claude-3.5-sonnet'
      }, { timeout: 10000 });

      const aiResult = response.data;
      
      return {
        model: config.model,
        analysisType: config.analysisType,
        analysis: aiResult.analysis || 'AI analysis completed',
        recommendations: aiResult.recommendations || [],
        confidence: aiResult.confidence || 0.85,
        threatLevel: aiResult.threat_level || 'medium',
        indicators: aiResult.indicators || [],
        processingTime: aiResult.processing_time || 0.5
      };

    } catch (error) {
      this.logger.warn('AI analysis API unavailable, using fallback', { error: error.message });
      
      return {
        model: 'fallback',
        analysisType: 'basic',
        analysis: `Security threat detected: ${inputData.threat_type || 'Unknown'}. Risk score: ${inputData.risk_score || 0}`,
        recommendations: ['Monitor closely', 'Investigate source'],
        confidence: 0.7,
        threatLevel: inputData.severity?.toLowerCase() || 'medium',
        indicators: [inputData.source_ip, inputData.threat_type].filter(Boolean),
        processingTime: 0.01
      };
    }
  }

  private async executeCorrelationNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    const config = node.data?.config || {};
    const timeWindow = config.timeWindow || '5m';
    const groupBy = config.groupBy || ['source_ip'];
    const inputData = context.inputData.event || context.inputData;

    try {
      // Call Python API for real correlation analysis
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
      const response = await axios.post(`${pythonApiUrl}/api/correlation/analyze`, {
        event_data: inputData,
        time_window: timeWindow,
        group_by: groupBy,
        correlation_rules: config.correlationRules || []
      }, { timeout: 10000 });

      const correlationResult = response.data;

      return {
        timeWindow,
        groupBy,
        correlationKey: correlationResult.correlation_key,
        relatedEvents: correlationResult.related_events_count || 0,
        relatedEventIds: correlationResult.related_event_ids || [],
        pattern: correlationResult.pattern || 'single_event',
        riskAdjustment: correlationResult.risk_adjustment || 1.0,
        anomalyScore: correlationResult.anomaly_score || 0.0,
        summary: correlationResult.summary || `Event correlated by ${groupBy.join(', ')} within ${timeWindow}`,
        correlationStrength: correlationResult.correlation_strength || 'low',
        temporalPatterns: correlationResult.temporal_patterns || [],
        frequencyAnalysis: correlationResult.frequency_analysis || {}
      };

    } catch (error) {
      this.logger.warn('Correlation API unavailable, using fallback', { error: error.message });
      
      // Fallback correlation logic
      const correlationKey = groupBy.map(field => inputData[field] || 'unknown').join('|');
      
      return {
        timeWindow,
        groupBy,
        correlationKey,
        relatedEvents: 0,
        relatedEventIds: [],
        pattern: 'single_event',
        riskAdjustment: 1.0,
        anomalyScore: 0.5,
        summary: `Fallback correlation by ${groupBy.join(', ')} within ${timeWindow}`,
        correlationStrength: 'unknown',
        temporalPatterns: [],
        frequencyAnalysis: {}
      };
    }
  }

  private async executeAlertNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    const config = node.data?.config || {};
    const severity = config.severity || 'medium';
    const channels = config.channels || ['email'];
    const recipients = config.recipients || ['security@company.com'];
    const alertType = config.alertType || 'email';
    const inputData = context.inputData.event || context.inputData;

    // Get previous node results for context
    const mlResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ml-scoring')?.output;
    const aiResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ai-analysis')?.output;
    const correlationResult = Object.values(context.nodeResults).find(r => r.nodeType === 'correlation')?.output;

    try {
      // Call Python API for real alert dispatch
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
      
      // Prepare enhanced event data with all workflow context
      const enhancedEventData = {
        ...inputData,
        workflow_context: {
          execution_id: context.executionId,
          workflow_id: context.workflowId,
          ml_result: mlResult,
          ai_result: aiResult,
          correlation_result: correlationResult
        }
      };

      const response = await axios.post(`${pythonApiUrl}/api/alerts/dispatch`, {
        alert_type: alertType,
        recipients: recipients,
        event_data: enhancedEventData,
        severity: severity,
        subject: `Security Alert: ${inputData.threat_type || 'Unknown Threat'} from ${inputData.source_ip || 'Unknown'}`,
        message: aiResult?.analysis || `Threat detected with risk score ${inputData.risk_score || 0}`,
        template: config.template || 'default'
      }, { timeout: 10000 });

      const alertResult = response.data;

      return {
        alertGenerated: true,
        alertId: alertResult.alert_id,
        status: alertResult.status,
        channels: recipients,
        severity: severity,
        dispatchTime: alertResult.dispatch_time,
        deliveryStatus: alertResult.delivery_status,
        alertType: alertType,
        recipients: recipients
      };

    } catch (error) {
      this.logger.warn('Alert API unavailable, using fallback notification', { error: error.message });
      
      // Fallback alert handling
      const fallbackAlertId = `fallback-alert-${context.executionId}`;
      
      // Log the alert details for manual review
      this.logger.log('Fallback alert generated', {
        alertId: fallbackAlertId,
        severity,
        threatType: inputData.threat_type,
        sourceIp: inputData.source_ip,
        eventId: inputData.event_id,
        mlScore: mlResult?.score || 0,
        aiThreatLevel: aiResult?.threatLevel || severity,
        correlationPattern: correlationResult?.pattern || 'unknown'
      });

      return {
        alertGenerated: true,
        alertId: fallbackAlertId,
        status: 'fallback_logged',
        channels: recipients,
        severity: severity,
        dispatchTime: new Date().toISOString(),
        deliveryStatus: { 'fallback_log': 'logged' },
        alertType: 'fallback',
        recipients: recipients
      };
    }
  }

  private async executeResponseNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
    const config = node.data?.config || {};
    const actions = config.actions || [];
    const requireApproval = config.requireApproval || false;
    const timeout = config.timeout || '30m';
    const autoRevert = config.autoRevert !== false; // Default to true
    const duration = config.duration || '1h';
    const inputData = context.inputData.event || context.inputData;

    // Get previous node results for context
    const mlResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ml-scoring')?.output;
    const aiResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ai-analysis')?.output;
    const alertResult = Object.values(context.nodeResults).find(r => r.nodeType === 'alert')?.output;

    const responseResults = [];

    // Execute each response action
    for (const actionConfig of actions) {
      let actionType = typeof actionConfig === 'string' ? actionConfig : actionConfig.type;
      
      // Map workflow action types to API action types
      const actionTypeMapping = {
        'quarantine': 'quarantine_host',
        'block': 'block_ip',
        'disable': 'disable_user',
        'isolate': 'isolate_network',
        'kill': 'kill_process',
        'collect': 'collect_forensics'
      };
      
      actionType = actionTypeMapping[actionType] || actionType;
      const target = actionConfig.target || inputData.source_ip || inputData.hostname || 'unknown';
      const severity = actionConfig.severity || inputData.severity || 'medium';
      
      try {
        // Call Python API for real response actions
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
        
        // Prepare enhanced event data with workflow context
        const enhancedEventData = {
          ...inputData,
          workflow_context: {
            execution_id: context.executionId,
            workflow_id: context.workflowId,
            ml_result: mlResult,
            ai_result: aiResult,
            alert_result: alertResult
          }
        };

        const response = await axios.post(`${pythonApiUrl}/api/response/execute`, {
          action_type: actionType,
          target: target,
          event_data: enhancedEventData,
          severity: severity,
          duration: duration,
          reason: `Automated response from workflow ${context.workflowId}`,
          require_approval: requireApproval,
          auto_revert: autoRevert
        }, { timeout: 15000 });

        const actionResult = response.data;

        responseResults.push({
          action: actionType,
          actionId: actionResult.action_id,
          status: actionResult.status,
          target: target,
          executionTime: actionResult.execution_time,
          result: actionResult.result,
          autoRevertAt: actionResult.auto_revert_at,
          message: `${actionType} executed successfully`
        });

        this.logger.log(`Response action executed`, {
          actionType,
          actionId: actionResult.action_id,
          target,
          status: actionResult.status,
          workflowId: context.workflowId
        });

      } catch (error) {
        this.logger.warn(`Response action failed, using fallback`, { 
          actionType, 
          target, 
          error: error.message 
        });
        
        // Fallback response handling
        const fallbackActionId = `fallback-${actionType}-${context.executionId}`;
        
        responseResults.push({
          action: actionType,
          actionId: fallbackActionId,
          status: 'fallback_logged',
          target: target,
          executionTime: new Date().toISOString(),
          result: { success: false, error: error.message, method: 'fallback' },
          autoRevertAt: null,
          message: `${actionType} logged for manual execution`
        });

        // Log fallback action for manual review
        this.logger.log('Fallback response action logged', {
          actionId: fallbackActionId,
          actionType,
          target,
          reason: error.message,
          workflowId: context.workflowId,
          severity: severity,
          requiresManualExecution: true
        });
      }
    }

    // Determine overall status
    const allSuccessful = responseResults.every(r => r.status === 'executed');
    const anyPending = responseResults.some(r => r.status === 'pending');
    
    let overallStatus = 'completed';
    if (requireApproval || anyPending) {
      overallStatus = 'pending_approval';
    } else if (!allSuccessful) {
      overallStatus = 'partial_failure';
    }

    return {
      actionsExecuted: responseResults.length,
      actionsSuccessful: responseResults.filter(r => r.status === 'executed').length,
      actions: responseResults,
      requireApproval,
      timeout,
      duration,
      autoRevert,
      status: overallStatus
    };
  }

  private getExecutionOrder(workflow: Workflow): string[] {
    // Simple topological sort based on edges
    const nodes = [...workflow.nodes];
    const edges = [...workflow.edges];
    const order: string[] = [];
    const visited = new Set<string>();

    // Start with input nodes
    const inputNodes = nodes.filter(node => node.type === 'input');
    const queue = [...inputNodes.map(n => n.id)];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      order.push(nodeId);

      // Add target nodes of this node's edges
      const targetNodes = edges
        .filter(edge => edge.source === nodeId)
        .map(edge => edge.target)
        .filter(target => !visited.has(target));

      queue.push(...targetNodes);
    }

    // Add any remaining nodes (shouldn't happen in well-formed workflows)
    const remainingNodes = nodes
      .map(n => n.id)
      .filter(id => !visited.has(id));
    order.push(...remainingNodes);

    return order;
  }

  private isCriticalNode(node: WorkflowNode): boolean {
    // Input and ML scoring nodes are critical
    return ['input', 'ml-scoring'].includes(node.type);
  }

  private determineExecutionStatus(nodeResults: NodeExecutionResult[]): string {
    if (nodeResults.length === 0) return 'failed';
    
    const failedResults = nodeResults.filter(r => !r.success);
    const criticalFailures = failedResults.filter(r => ['input', 'ml-scoring'].includes(r.nodeType));

    if (criticalFailures.length > 0) return 'failed';
    if (failedResults.length > 0) return 'partial';
    return 'completed';
  }

  private generateExecutionSummary(nodeResults: NodeExecutionResult[]): any {
    const successful = nodeResults.filter(r => r.success).length;
    const failed = nodeResults.filter(r => !r.success).length;
    const totalTime = nodeResults.reduce((sum, r) => sum + r.executionTime, 0);

    return {
      totalNodes: nodeResults.length,
      successful,
      failed,
      totalExecutionTime: totalTime,
      averageNodeTime: nodeResults.length > 0 ? totalTime / nodeResults.length : 0
    };
  }

  private extractOutputData(nodeResults: NodeExecutionResult[]): any {
    const output: any = {};
    
    for (const result of nodeResults) {
      if (result.success && result.output) {
        output[result.nodeType] = result.output;
      }
    }

    return output;
  }

  private async createIncidentIfHighRisk(workflow: Workflow, context: WorkflowExecutionContext, result: any): Promise<void> {
    try {
      // Get ML and AI analysis results
      const mlResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ml-scoring')?.output;
      const aiResult = Object.values(context.nodeResults).find(r => r.nodeType === 'ai-analysis')?.output;
      const alertResult = Object.values(context.nodeResults).find(r => r.nodeType === 'alert')?.output;
      
      // Calculate overall risk score from ML analysis
      const mlScore = mlResult?.score || 0;
      const aiThreatLevel = aiResult?.threatLevel || 'low';
      const confidence = mlResult?.confidence || 0.5;
      
      // Convert to 1-10 scale for consistency with Kafka service
      const riskScore = mlScore * 10;
      
      // Create incident if risk score is high enough or AI detected high threat
      const shouldCreateIncident = riskScore >= 7.0 || 
        ['high', 'critical'].includes(aiThreatLevel) || 
        (mlScore >= 0.7 && confidence >= 0.8);
      
      if (shouldCreateIncident) {
        const incidentData = {
          incident_id: `INC-WF-${Date.now()}-${context.executionId}`,
          title: `Workflow Detected Security Incident`,
          description: `Security workflow ${workflow.id} detected a potential threat with risk score ${riskScore.toFixed(2)}`,
          severity: this.mapRiskToSeverity(riskScore),
          status: 'open',
          workflow_id: workflow.id,
          execution_id: context.executionId,
          ml_score: mlScore,
          ai_threat_level: aiThreatLevel,
          confidence: confidence,
          event_data: context.inputData,
          analysis_results: {
            ml: mlResult,
            ai: aiResult,
            alert: alertResult
          }
        };
        
        // Call Python API to create incident
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
        await axios.post(`${pythonApiUrl}/api/incidents/`, incidentData, { timeout: 5000 });
        
        this.logger.log('Created incident from workflow execution', {
          incidentId: incidentData.incident_id,
          workflowId: workflow.id,
          riskScore,
          aiThreatLevel
        });
      }
    } catch (error) {
      this.logger.error('Failed to create incident from workflow', {
        workflowId: workflow.id,
        error: error.message
      });
    }
  }
  
  private mapRiskToSeverity(riskScore: number): string {
    if (riskScore >= 9.0) return 'critical';
    if (riskScore >= 7.0) return 'high';
    if (riskScore >= 5.0) return 'medium';
    return 'low';
  }

  private checkAiRateLimit(workflowId: string): boolean {
    const now = Date.now();
    const calls = this.aiCallTimes.get(workflowId) || [];
    
    // Remove calls older than the rate limit window
    const recentCalls = calls.filter(callTime => now - callTime < this.aiRateLimitWindow);
    
    // Update the stored calls
    this.aiCallTimes.set(workflowId, recentCalls);
    
    // Check if we're under the limit
    return recentCalls.length < this.aiMaxCallsPerWindow;
  }

  private recordAiCall(workflowId: string): void {
    const now = Date.now();
    const calls = this.aiCallTimes.get(workflowId) || [];
    calls.push(now);
    this.aiCallTimes.set(workflowId, calls);
  }
}