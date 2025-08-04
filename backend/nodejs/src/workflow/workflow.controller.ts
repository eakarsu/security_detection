import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService, Workflow } from './workflow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Workflows')
@Controller('workflows')
// @UseGuards(JwtAuthGuard)  // Temporarily disabled for development
// @ApiBearerAuth()
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async getAllWorkflows() {
    return this.workflowService.getAllWorkflows();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, description: 'Workflow templates retrieved successfully' })
  async getTemplates() {
    return this.workflowService.getWorkflowTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflowById(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    return workflow;
  }

  @Post()
  @ApiOperation({ summary: 'Create new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(@Body() workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.workflowService.createWorkflow(workflow);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async updateWorkflow(@Param('id') id: string, @Body() updates: Partial<Workflow>) {
    const workflow = await this.workflowService.updateWorkflow(id, updates);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    return workflow;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deleteWorkflow(@Param('id') id: string) {
    const deleted = await this.workflowService.deleteWorkflow(id);
    if (!deleted) {
      throw new Error('Workflow not found');
    }
    return { message: 'Workflow deleted successfully' };
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async executeWorkflow(@Param('id') id: string, @Body() inputData: any) {
    return this.workflowService.executeWorkflow(id, inputData);
  }
}
