import { Injectable } from '@nestjs/common';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WorkflowService {
  private workflows: Workflow[] = [
    {
      id: '1',
      name: 'Basic Threat Detection',
      description: 'Standard workflow for detecting and responding to security threats',
      nodes: [
        {
          id: 'input-1',
          type: 'input',
          position: { x: 100, y: 100 },
          data: { label: 'Network Traffic', source: 'network_logs' }
        },
        {
          id: 'ml-1',
          type: 'ml-scoring',
          position: { x: 300, y: 100 },
          data: { label: 'ML Scoring', model: 'xgboost', threshold: 0.8 }
        },
        {
          id: 'ai-1',
          type: 'ai-analysis',
          position: { x: 500, y: 100 },
          data: { label: 'AI Analysis', model: 'claude-3.5-sonnet' }
        },
        {
          id: 'alert-1',
          type: 'alert',
          position: { x: 700, y: 100 },
          data: { label: 'Generate Alert', severity: 'high' }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'input-1', target: 'ml-1' },
        { id: 'e2-3', source: 'ml-1', target: 'ai-1' },
        { id: 'e3-4', source: 'ai-1', target: 'alert-1' }
      ],
      isActive: true,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z'
    }
  ];

  async getAllWorkflows(): Promise<Workflow[]> {
    return this.workflows;
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    return this.workflows.find(w => w.id === id) || null;
  }

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.workflows.push(newWorkflow);
    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return null;

    this.workflows[index] = {
      ...this.workflows[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.workflows[index];
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.workflows.splice(index, 1);
    return true;
  }

  async executeWorkflow(id: string, inputData: any): Promise<any> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Simulate workflow execution
    const result = {
      workflowId: id,
      executionId: Date.now().toString(),
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      results: {
        inputProcessed: true,
        mlScore: 0.85,
        aiAnalysis: 'Potential security threat detected',
        alertGenerated: true
      }
    };

    return result;
  }

  async getWorkflowTemplates() {
    return [
      {
        id: 'template-1',
        name: 'Basic Threat Detection',
        description: 'Standard workflow for threat detection and response',
        category: 'Security',
        nodes: [
          { type: 'input', label: 'Data Input' },
          { type: 'ml-scoring', label: 'ML Analysis' },
          { type: 'ai-analysis', label: 'AI Analysis' },
          { type: 'alert', label: 'Alert Generation' }
        ]
      },
      {
        id: 'template-2',
        name: 'Compliance Monitoring',
        description: 'Monitor and report compliance violations',
        category: 'Compliance',
        nodes: [
          { type: 'input', label: 'Audit Logs' },
          { type: 'correlation', label: 'Policy Check' },
          { type: 'alert', label: 'Compliance Alert' }
        ]
      },
      {
        id: 'template-3',
        name: 'Incident Response',
        description: 'Automated incident response workflow',
        category: 'Response',
        nodes: [
          { type: 'input', label: 'Security Event' },
          { type: 'ai-analysis', label: 'Threat Assessment' },
          { type: 'response', label: 'Auto Response' },
          { type: 'alert', label: 'Notify Team' }
        ]
      }
    ];
  }
}
