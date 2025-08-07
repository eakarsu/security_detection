import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaWorkflowTriggerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaWorkflowTriggerService.name);
  private kafka: Kafka;
  private systemConsumer: Consumer;  // For security.events
  private workflowConsumer: Consumer;  // For workflow.test
  private isRunning = false;

  constructor(private readonly workflowService: WorkflowService) {
    this.kafka = new Kafka({
      clientId: 'workflow-trigger-service',
      brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS || process.env.KAFKA_BROKERS || 'kafka:29092'],
    });
    
    // Consumer for system events (security.events topic)
    this.systemConsumer = this.kafka.consumer({ 
      groupId: 'workflow-system-events',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    // Consumer for workflow test events (workflow.test topic)
    this.workflowConsumer = this.kafka.consumer({ 
      groupId: 'workflow-test-events',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  async startListening() {
    try {
      this.logger.log('Starting Kafka workflow trigger service');
      
      // Start system events consumer
      await this.systemConsumer.connect();
      await this.systemConsumer.subscribe({ topics: ['security.events'], fromBeginning: false });
      
      // Start workflow test events consumer  
      await this.workflowConsumer.connect();
      await this.workflowConsumer.subscribe({ topics: ['workflow.test'], fromBeginning: false });
      
      this.isRunning = true;
      
      // Run both consumers in parallel
      await Promise.all([
        this.systemConsumer.run({
          eachMessage: async (payload: EachMessagePayload) => {
            await this.handleSecurityEvent(payload);
          },
        }),
        this.workflowConsumer.run({
          eachMessage: async (payload: EachMessagePayload) => {
            await this.handleSecurityEvent(payload);
          },
        })
      ]);
      
      this.logger.log('Kafka workflow trigger service started successfully');
    } catch (error) {
      this.logger.error('Failed to start Kafka workflow trigger service:', error.message);
    }
  }

  async stopListening() {
    try {
      this.isRunning = false;
      await Promise.all([
        this.systemConsumer.disconnect(),
        this.workflowConsumer.disconnect()
      ]);
      this.logger.log('Kafka workflow trigger service stopped');
    } catch (error) {
      this.logger.error('Error stopping Kafka workflow trigger service:', error);
    }
  }

  private async handleSecurityEvent(payload: EachMessagePayload) {
    try {
      const eventData = JSON.parse(payload.message.value?.toString() || '{}');
      
      this.logger.debug('Received security event for workflow processing', {
        eventId: eventData.event_id,
        threatType: eventData.threat_type,
        riskScore: eventData.risk_score,
      });

      // Get all active workflows that listen to Kafka
      const workflows = await this.workflowService.getAllWorkflows();
      const kafkaWorkflows = workflows.filter(workflow => 
        workflow.isActive && 
        this.isKafkaWorkflow(workflow)
      );

      for (const workflow of kafkaWorkflows) {
        if (this.shouldTriggerWorkflow(workflow, eventData, payload.topic)) {
          this.logger.log(`Triggering workflow "${workflow.name}" for security event`, {
            workflowId: workflow.id,
            eventId: eventData.event_id,
            threatType: eventData.threat_type,
          });

          try {
            const executionResult = await this.workflowService.executeWorkflow(workflow.id, {
              event: eventData,
              triggerType: 'kafka_event',
              triggerTime: new Date().toISOString(),
              topic: payload.topic,
              partition: payload.partition,
              offset: payload.message.offset,
            });

            this.logger.log('Workflow execution completed', {
              workflowId: workflow.id,
              executionId: executionResult.executionId,
              status: executionResult.status,
              eventId: eventData.event_id,
            });
          } catch (executionError) {
            this.logger.error('Workflow execution failed', {
              workflowId: workflow.id,
              eventId: eventData.event_id,
              error: executionError.message,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling security event:', error.message);
    }
  }

  private isKafkaWorkflow(workflow: any): boolean {
    // Check if workflow has a Kafka input node
    const nodes = workflow.nodes || [];
    return nodes.some(node => 
      node.type === 'input' && 
      node.data?.config?.source === 'kafka'
    );
  }

  private shouldTriggerWorkflow(workflow: any, eventData: any, currentTopic: string): boolean {
    try {
      // Extract workflow configuration
      const nodes = workflow.nodes || [];
      const inputNode = nodes.find(node => 
        node.type === 'input' && 
        node.data?.config?.source === 'kafka'
      );

      if (!inputNode) {
        return false;
      }

      const config = inputNode.data.config;
      const requiredTopic = config.topic || 'security.events';
      
      // Check if this workflow listens to events from the current topic
      if (requiredTopic !== currentTopic) {
        return false;
      }

      // Check risk score threshold
      const riskScore = eventData.risk_score || 0;
      const mlNodes = nodes.filter(node => node.type === 'ml-scoring');
      
      if (mlNodes.length > 0) {
        const mlNode = mlNodes[0];
        const threshold = mlNode.data?.config?.threshold || 0.7;
        
        // Only trigger if risk score meets ML threshold (lowered for testing)
        const scaledThreshold = Math.min(threshold * 10, 3.0); // Lower threshold for testing, max 3.0
        if (riskScore < scaledThreshold) {
          this.logger.debug('Event risk score below workflow threshold', {
            riskScore,
            threshold: scaledThreshold,
            workflowId: workflow.id,
          });
          return false;
        }
      }

      // Check severity requirements
      const severity = eventData.severity?.toLowerCase() || 'low';
      if (['high', 'critical'].includes(severity)) {
        return true;
      }

      // Check for high-risk threat types
      const threatType = eventData.threat_type?.toLowerCase() || '';
      const highRiskThreats = [
        'sql injection', 
        'ransomware', 
        'command & control', 
        'zero-day exploit', 
        'data exfiltration',
        'malware',
        'phishing',
        'brute force',
        'ddos'
      ];

      if (highRiskThreats.some(threat => threatType.includes(threat))) {
        return true;
      }

      // Trigger for high risk scores regardless of other factors
      if (riskScore >= 8.0) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error evaluating workflow trigger conditions:', error.message);
      return false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      consumers: {
        system: {
          topic: 'security.events',
          groupId: 'workflow-system-events'
        },
        workflow: {
          topic: 'workflow.test',  
          groupId: 'workflow-test-events'
        }
      }
    };
  }
}