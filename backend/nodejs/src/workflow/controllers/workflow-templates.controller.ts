import { Controller, Get, Post, Put, Param, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkflowTemplateService, CreateWorkflowTemplateDto } from '../services/workflow-template.service';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

@ApiTags('Workflow Templates')
@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(
    private templateService: WorkflowTemplateService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflow templates' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'complexity', required: false, description: 'Filter by complexity level' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Show only featured templates' })
  @ApiQuery({ name: 'enterprise', required: false, type: Boolean, description: 'Show only enterprise templates' })
  @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags (comma-separated)' })
  @ApiResponse({ status: 200, description: 'List of workflow templates' })
  async getAllTemplates(
    @Query('category') category?: string,
    @Query('complexity') complexity?: string,
    @Query('featured') featured?: boolean,
    @Query('enterprise') enterprise?: boolean,
    @Query('tags') tags?: string
  ): Promise<WorkflowTemplate[]> {
    const filters: any = {};
    
    if (category) filters.category = category;
    if (complexity) filters.complexity = complexity;
    if (featured !== undefined) filters.featured = featured;
    if (enterprise !== undefined) filters.enterprise = enterprise;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());

    return await this.templateService.getAllTemplates(filters);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured workflow templates' })
  @ApiResponse({ status: 200, description: 'Featured workflow templates' })
  async getFeaturedTemplates(): Promise<WorkflowTemplate[]> {
    return await this.templateService.getFeaturedTemplates();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular workflow templates' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of templates to return' })
  @ApiResponse({ status: 200, description: 'Popular workflow templates' })
  async getPopularTemplates(
    @Query('limit') limit?: number
  ): Promise<WorkflowTemplate[]> {
    return await this.templateService.getPopularTemplates(limit || 10);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all template categories' })
  @ApiResponse({ status: 200, description: 'Template categories with descriptions' })
  getCategories() {
    return {
      categories: [
        {
          id: 'incident-response',
          name: 'Incident Response',
          description: 'Templates for responding to security incidents',
          icon: 'alert-triangle'
        },
        {
          id: 'threat-hunting',
          name: 'Threat Hunting',
          description: 'Proactive threat detection and analysis',
          icon: 'search'
        },
        {
          id: 'vulnerability-management',
          name: 'Vulnerability Management',
          description: 'Vulnerability assessment and remediation',
          icon: 'shield-alert'
        },
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Regulatory compliance and audit workflows',
          icon: 'check-circle'
        },
        {
          id: 'forensics',
          name: 'Digital Forensics',
          description: 'Evidence collection and analysis',
          icon: 'magnifying-glass'
        },
        {
          id: 'monitoring',
          name: 'Security Monitoring',
          description: 'Continuous security monitoring and alerting',
          icon: 'eye'
        }
      ]
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get workflow template statistics' })
  @ApiResponse({ status: 200, description: 'Template statistics' })
  async getStatistics() {
    return await this.templateService.getTemplateStatistics();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search workflow templates' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchTemplates(
    @Query('q') query: string
  ): Promise<WorkflowTemplate[]> {
    if (!query || query.trim().length < 2) {
      throw new HttpException('Search query must be at least 2 characters', HttpStatus.BAD_REQUEST);
    }

    return await this.templateService.searchTemplates(query.trim());
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiParam({ name: 'category', description: 'Template category' })
  @ApiResponse({ status: 200, description: 'Templates in category' })
  async getTemplatesByCategory(
    @Param('category') category: string
  ): Promise<WorkflowTemplate[]> {
    return await this.templateService.getTemplatesByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific workflow template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Workflow template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('id') id: string): Promise<WorkflowTemplate> {
    const template = await this.templateService.getTemplateById(id);
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }
    return template;
  }

  @Post()
  @ApiOperation({ summary: 'Create new workflow template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid template data' })
  async createTemplate(
    @Body() createDto: CreateWorkflowTemplateDto
  ): Promise<WorkflowTemplate> {
    try {
      return await this.templateService.createTemplate(createDto);
    } catch (error) {
      throw new HttpException('Failed to create template: ' + error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Mark template as used (increment usage count)' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Usage count updated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async useTemplate(@Param('id') id: string): Promise<{ message: string; usage_count: number }> {
    const template = await this.templateService.getTemplateById(id);
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    await this.templateService.incrementUsage(id);
    
    return {
      message: 'Template usage recorded',
      usage_count: template.usage_count + 1
    };
  }

  @Put(':id/rate')
  @ApiOperation({ summary: 'Rate a workflow template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Rating updated' })
  @ApiResponse({ status: 400, description: 'Invalid rating' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async rateTemplate(
    @Param('id') id: string,
    @Body() body: { rating: number }
  ): Promise<{ message: string; new_rating: number; rating_count: number }> {
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      throw new HttpException('Rating must be between 1 and 5', HttpStatus.BAD_REQUEST);
    }

    const updatedTemplate = await this.templateService.rateTemplate(id, rating);
    if (!updatedTemplate) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Rating submitted successfully',
      new_rating: updatedTemplate.rating,
      rating_count: updatedTemplate.rating_count
    };
  }

  @Get(':id/instantiate')
  @ApiOperation({ summary: 'Get template ready for instantiation' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template configuration for instantiation' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async instantiateTemplate(@Param('id') id: string) {
    const template = await this.templateService.getTemplateById(id);
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Mark as used
    await this.templateService.incrementUsage(id);

    // Return workflow definition ready for the workflow builder
    return {
      template_id: template.id,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      description: `Instance of ${template.name}`,
      workflow_definition: template.workflow_definition,
      default_config: template.default_config,
      metadata: {
        source_template: template.id,
        created_from_template: true,
        template_version: template.workflow_definition.metadata.version
      }
    };
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export template as JSON' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template export data' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async exportTemplate(@Param('id') id: string) {
    const template = await this.templateService.getTemplateById(id);
    if (!template) {
      throw new HttpException('Template not found', HttpStatus.NOT_FOUND);
    }

    // Return exportable template format
    return {
      format_version: '1.0',
      export_date: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        complexity: template.complexity,
        estimated_time: template.estimated_time,
        tags: template.tags,
        workflow_definition: template.workflow_definition,
        default_config: template.default_config
      }
    };
  }
}