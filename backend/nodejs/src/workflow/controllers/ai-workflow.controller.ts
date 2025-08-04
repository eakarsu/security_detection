import { Controller, Post, Body, Get, Query, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AIWorkflowGeneratorService, WorkflowGenerationRequest, GeneratedWorkflow } from '../services/ai-workflow-generator.service';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { TenantScoped, RequirePermissions, CurrentTenant } from '../../auth/decorators/tenant.decorator';
import { Tenant } from '../../auth/entities/tenant.entity';

class GenerateWorkflowDto {
  description: string;
  requirements?: string[];
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  category?: 'incident-response' | 'threat-hunting' | 'vulnerability-management' | 'compliance' | 'forensics' | 'monitoring';
  constraints?: {
    maxNodes?: number;
    requiredNodes?: string[];
    excludedNodes?: string[];
    timeBudget?: string;
  };
  saveAsTemplate?: boolean;
  templateName?: string;
}

class WorkflowValidationDto {
  workflow: GeneratedWorkflow;
}

@ApiTags('AI Workflow Generation')
@Controller('ai/workflows')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
@TenantScoped()
export class AIWorkflowController {
  constructor(
    private aiWorkflowGeneratorService: AIWorkflowGeneratorService,
    private workflowTemplateService: WorkflowTemplateService
  ) {}

  @Post('generate')
  @RequirePermissions('workflows:create', 'ai:use')
  @ApiOperation({ summary: 'Generate workflow from natural language description' })
  @ApiBody({ type: GenerateWorkflowDto })
  @ApiResponse({ status: 201, description: 'Workflow generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient AI features' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or plan limits' })
  async generateWorkflow(
    @Body() generateDto: GenerateWorkflowDto,
    @CurrentTenant() tenant: Tenant
  ): Promise<{
    workflow: GeneratedWorkflow;
    similar_workflows?: any[];
    validation: { isValid: boolean; errors: string[] };
  }> {
    // Check if tenant has AI features enabled
    if (!tenant.features?.ai_features) {
      throw new HttpException(
        'AI workflow generation requires a plan with AI features enabled',
        HttpStatus.FORBIDDEN
      );
    }

    // Validate input
    if (!generateDto.description || generateDto.description.trim().length < 10) {
      throw new HttpException(
        'Description must be at least 10 characters long',
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      // Generate the workflow
      const generatedWorkflow = await this.aiWorkflowGeneratorService.generateWorkflow({
        description: generateDto.description,
        requirements: generateDto.requirements,
        complexity: generateDto.complexity,
        category: generateDto.category,
        constraints: generateDto.constraints
      });

      // Validate the generated workflow
      const validation = this.aiWorkflowGeneratorService.validateWorkflow(generatedWorkflow);

      // Find similar existing workflows for reference
      const similarWorkflows = await this.aiWorkflowGeneratorService.findSimilarWorkflows(
        generateDto.description,
        3
      );

      // Save as template if requested
      if (generateDto.saveAsTemplate && validation.isValid) {
        const templateName = generateDto.templateName || generatedWorkflow.name;
        
        await this.workflowTemplateService.createTemplate({
          name: templateName,
          description: generatedWorkflow.description,
          category: generatedWorkflow.category as any,
          workflow_definition: generatedWorkflow.workflow_definition,
          complexity: generatedWorkflow.complexity as any,
          tags: generatedWorkflow.workflow_definition.metadata.tags,
          estimated_time: generatedWorkflow.workflow_definition.metadata.estimated_time,
          author: 'AI Generated'
        });
      }

      return {
        workflow: generatedWorkflow,
        similar_workflows: similarWorkflows,
        validation
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate workflow: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('validate')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Validate a generated workflow structure' })
  @ApiBody({ type: WorkflowValidationDto })
  @ApiResponse({ status: 200, description: 'Validation completed' })
  async validateWorkflow(
    @Body() validationDto: WorkflowValidationDto
  ): Promise<{ isValid: boolean; errors: string[]; suggestions: string[] }> {
    const validation = this.aiWorkflowGeneratorService.validateWorkflow(validationDto.workflow);
    
    return {
      ...validation,
      suggestions: validationDto.workflow.suggestions || []
    };
  }

  @Get('similar')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Find similar workflows based on description' })
  @ApiQuery({ name: 'description', description: 'Natural language description' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of results' })
  @ApiResponse({ status: 200, description: 'Similar workflows found' })
  async findSimilarWorkflows(
    @Query('description') description: string,
    @Query('limit') limit: number = 5
  ): Promise<{ workflows: any[]; total: number }> {
    if (!description || description.trim().length < 5) {
      throw new HttpException(
        'Description must be at least 5 characters long',
        HttpStatus.BAD_REQUEST
      );
    }

    const workflows = await this.aiWorkflowGeneratorService.findSimilarWorkflows(
      description,
      Math.min(limit, 20) // Cap at 20 results
    );

    return {
      workflows,
      total: workflows.length
    };
  }

  @Get('suggestions')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get workflow generation suggestions and tips' })
  @ApiResponse({ status: 200, description: 'Generation suggestions' })
  async getGenerationSuggestions(): Promise<{
    tips: string[];
    examples: Array<{ description: string; category: string; complexity: string }>;
    patterns: Array<{ pattern: string; description: string; category: string }>;
  }> {
    const tips = [
      'Be specific about your security objectives and desired outcomes',
      'Mention the types of threats or incidents you want to address',
      'Include the systems or tools you want to integrate',
      'Specify any compliance requirements or constraints',
      'Describe the expected workflow complexity level',
      'Include timing requirements (e.g., real-time, batch processing)',
      'Mention any specific security frameworks (MITRE ATT&CK, NIST, etc.)'
    ];

    const examples = [
      {
        description: 'Create an automated incident response workflow for detecting and containing malware infections on endpoints',
        category: 'incident-response',
        complexity: 'intermediate'
      },
      {
        description: 'Set up a threat hunting workflow to investigate suspicious network traffic and identify potential APT activities',
        category: 'threat-hunting',
        complexity: 'advanced'
      },
      {
        description: 'Build a phishing email detection and response system that automatically analyzes suspicious emails and notifies users',
        category: 'incident-response',
        complexity: 'beginner'
      },
      {
        description: 'Create a vulnerability management workflow that scans assets, prioritizes vulnerabilities, and tracks remediation',
        category: 'vulnerability-management',
        complexity: 'intermediate'
      },
      {
        description: 'Implement a compliance monitoring workflow for GDPR data protection requirements with automated audit trails',
        category: 'compliance',
        complexity: 'beginner'
      }
    ];

    const patterns = [
      {
        pattern: 'incident response',
        description: 'Automated workflows for detecting, analyzing, and responding to security incidents',
        category: 'incident-response'
      },
      {
        pattern: 'threat hunting',
        description: 'Proactive workflows for searching and investigating potential security threats',
        category: 'threat-hunting'
      },
      {
        pattern: 'malware analysis',
        description: 'Workflows for analyzing suspicious files and determining malware characteristics',
        category: 'forensics'
      },
      {
        pattern: 'phishing detection',
        description: 'Automated workflows for identifying and responding to phishing attempts',
        category: 'incident-response'
      },
      {
        pattern: 'vulnerability management',
        description: 'Systematic workflows for identifying, assessing, and remediating security vulnerabilities',
        category: 'vulnerability-management'
      },
      {
        pattern: 'network monitoring',
        description: 'Continuous workflows for monitoring network traffic and detecting anomalies',
        category: 'monitoring'
      },
      {
        pattern: 'compliance audit',
        description: 'Automated workflows for ensuring regulatory compliance and generating audit reports',
        category: 'compliance'
      }
    ];

    return {
      tips,
      examples,
      patterns
    };
  }

  @Get('capabilities')
  @RequirePermissions('workflows:read')
  @ApiOperation({ summary: 'Get AI workflow generation capabilities for current tenant' })
  @ApiResponse({ status: 200, description: 'AI capabilities information' })
  async getAICapabilities(
    @CurrentTenant() tenant: Tenant
  ): Promise<{
    ai_features_enabled: boolean;
    supported_categories: string[];
    max_nodes_per_workflow: number;
    available_complexity_levels: string[];
    supported_integrations: string[];
    monthly_generation_limit: number;
    current_usage: number;
  }> {
    const aiEnabled = tenant.features?.ai_features === true;
    const maxNodes = tenant.features?.max_workflow_nodes || 50;
    const monthlyLimit = tenant.features?.ai_generations_per_month || 10;
    
    // Get current month's usage (placeholder - would need actual usage tracking)
    const currentUsage = 0; // TODO: Implement actual usage tracking

    return {
      ai_features_enabled: aiEnabled,
      supported_categories: [
        'incident-response',
        'threat-hunting',
        'vulnerability-management',
        'compliance',
        'forensics',
        'monitoring'
      ],
      max_nodes_per_workflow: maxNodes,
      available_complexity_levels: ['beginner', 'intermediate', 'advanced'],
      supported_integrations: [
        'threat-intel-lookup',
        'mitre-attack-mapping',
        'soar-actions',
        'notification-systems',
        'log-analysis',
        'sandbox-analysis'
      ],
      monthly_generation_limit: monthlyLimit,
      current_usage: currentUsage
    };
  }

  @Post('feedback')
  @RequirePermissions('workflows:create')
  @ApiOperation({ summary: 'Provide feedback on generated workflow quality' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string' },
        rating: { type: 'number', minimum: 1, maximum: 5 },
        feedback: { type: 'string' },
        issues: { type: 'array', items: { type: 'string' } }
      },
      required: ['workflow_id', 'rating']
    }
  })
  @ApiResponse({ status: 200, description: 'Feedback recorded successfully' })
  async provideFeedback(
    @Body() feedbackDto: {
      workflow_id: string;
      rating: number;
      feedback?: string;
      issues?: string[];
    }
  ): Promise<{ message: string }> {
    // TODO: Implement feedback storage and analysis
    // This would help improve the AI generation algorithms over time
    
    if (feedbackDto.rating < 1 || feedbackDto.rating > 5) {
      throw new HttpException(
        'Rating must be between 1 and 5',
        HttpStatus.BAD_REQUEST
      );
    }

    // Log feedback for analysis (in a real implementation, store in database)
    console.log('AI Workflow Feedback:', {
      workflow_id: feedbackDto.workflow_id,
      rating: feedbackDto.rating,
      feedback: feedbackDto.feedback,
      issues: feedbackDto.issues,
      timestamp: new Date()
    });

    return {
      message: 'Thank you for your feedback! This helps us improve AI workflow generation.'
    };
  }
}