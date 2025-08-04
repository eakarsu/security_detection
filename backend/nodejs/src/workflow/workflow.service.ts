import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowExecutionService } from './workflow-execution.service';

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
  private readonly workflowsDir = path.join(process.cwd(), '..', '..', 'data', 'workflows');
  private workflows: Workflow[] = [];

  constructor(private readonly workflowExecutionService: WorkflowExecutionService) {
    this.initializeWorkflows();
  }

  private async initializeWorkflows() {
    try {
      // Ensure workflows directory exists
      await fs.mkdir(this.workflowsDir, { recursive: true });
      
      // Load existing workflows from files
      await this.loadWorkflowsFromFiles();
      
      // If no workflows exist, create default template
      if (this.workflows.length === 0) {
        await this.createDefaultWorkflow();
      }
    } catch (error) {
      console.error('Error initializing workflows:', error);
    }
  }

  private async loadWorkflowsFromFiles() {
    try {
      const files = await fs.readdir(this.workflowsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.workflowsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const workflow = JSON.parse(content);
          this.workflows.push(workflow);
        } catch (error) {
          console.error(`Error loading workflow from ${file}:`, error);
        }
      }
      
      console.log(`Loaded ${this.workflows.length} workflows from filesystem`);
    } catch (error) {
      console.error('Error reading workflows directory:', error);
    }
  }

  private async saveWorkflowToFile(workflow: Workflow) {
    try {
      const fileName = `workflow-${workflow.id}.json`;
      const filePath = path.join(this.workflowsDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
      console.log(`Saved workflow ${workflow.id} to ${filePath}`);
    } catch (error) {
      console.error(`Error saving workflow ${workflow.id}:`, error);
      throw error;
    }
  }

  private async deleteWorkflowFile(id: string) {
    try {
      const fileName = `workflow-${id}.json`;
      const filePath = path.join(this.workflowsDir, fileName);
      await fs.unlink(filePath);
      console.log(`Deleted workflow file ${filePath}`);
    } catch (error) {
      console.error(`Error deleting workflow file for ${id}:`, error);
    }
  }

  private async createDefaultWorkflow() {
    const defaultWorkflow: Workflow = {
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
    };
    
    this.workflows.push(defaultWorkflow);
    await this.saveWorkflowToFile(defaultWorkflow);
  }

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
    await this.saveWorkflowToFile(newWorkflow);
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

    await this.saveWorkflowToFile(this.workflows[index]);
    return this.workflows[index];
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.workflows.splice(index, 1);
    await this.deleteWorkflowFile(id);
    return true;
  }

  async executeWorkflow(id: string, inputData: any): Promise<any> {
    const workflow = await this.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Execute workflow using the real execution service
    return await this.workflowExecutionService.executeWorkflow(workflow, inputData);
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
