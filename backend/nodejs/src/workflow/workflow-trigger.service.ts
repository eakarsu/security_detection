import { Injectable, Logger } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import axios from 'axios';

@Injectable()
export class WorkflowTriggerService {
  private readonly logger = new Logger(WorkflowTriggerService.name);
  private lastCheckedTime: Date = new Date();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly monitoringEnabled = process.env.WORKFLOW_MONITORING_ENABLED === 'true';
  private readonly monitoringInterval = parseInt(process.env.WORKFLOW_MONITORING_INTERVAL || '300000'); // Default 5 minutes

  constructor(private readonly workflowService: WorkflowService) {}

  async startMonitoring() {
    if (!this.monitoringEnabled) {
      this.logger.log('Workflow trigger monitoring is disabled via WORKFLOW_MONITORING_ENABLED environment variable');
      return;
    }

    this.logger.log(`Starting workflow trigger monitoring (interval: ${this.monitoringInterval}ms)`);
    this.lastCheckedTime = new Date();
    
    this.intervalId = setInterval(async () => {
      await this.checkForNewIncidents();
    }, this.monitoringInterval);
  }

  async stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Stopped workflow trigger monitoring');
    }
  }

  private async checkForNewIncidents() {
    try {
      // Get recent incidents from Python API
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8010';
      const response = await axios.get(`${pythonApiUrl}/api/incidents/`);
      const incidents = response.data;

      // Filter incidents created since last check
      const newIncidents = incidents.filter(incident => {
        const createdAt = new Date(incident.created_at);
        return createdAt > this.lastCheckedTime;
      });

      if (newIncidents.length > 0) {
        this.logger.log(`Found ${newIncidents.length} new incidents, checking for matching workflows`);
        
        for (const incident of newIncidents) {
          await this.triggerMatchingWorkflows(incident);
        }
        
        this.lastCheckedTime = new Date();
      }
    } catch (error) {
      this.logger.error('Error checking for new incidents:', error.message);
    }
  }

  private async triggerMatchingWorkflows(incident: any) {
    try {
      // Get all active workflows
      const workflows = await this.workflowService.getAllWorkflows();
      const activeWorkflows = workflows.filter(w => w.isActive);

      for (const workflow of activeWorkflows) {
        if (this.shouldTriggerWorkflow(workflow, incident)) {
          this.logger.log(`Triggering workflow "${workflow.name}" for incident ${incident.incident_id || incident.id}`);
          
          // Execute the workflow with incident data
          const executionResult = await this.workflowService.executeWorkflow(workflow.id, {
            incident,
            triggerType: 'automatic',
            triggerTime: new Date().toISOString()
          });
          
          this.logger.log(`Workflow execution completed`, {
            workflowId: workflow.id,
            executionId: executionResult.executionId,
            status: executionResult.status
          });
        }
      }
    } catch (error) {
      this.logger.error('Error triggering workflows for incident:', error.message);
    }
  }

  private shouldTriggerWorkflow(workflow: any, incident: any): boolean {
    // Simple trigger logic - you can make this more sophisticated
    const incidentSeverity = incident.severity?.toLowerCase() || 'low';
    const incidentType = incident.event_type || incident.threat_type || 'unknown';
    
    // Trigger for high-risk incidents
    if (incidentSeverity === 'high' || incidentSeverity === 'critical') {
      return true;
    }
    
    // Trigger for specific threat types
    const highRiskThreats = ['sql injection', 'ransomware', 'command & control', 'zero-day exploit', 'data exfiltration'];
    if (highRiskThreats.some(threat => incidentType.toLowerCase().includes(threat.toLowerCase()))) {
      return true;
    }
    
    return false;
  }
}