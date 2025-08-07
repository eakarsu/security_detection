import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { WorkflowTemplate } from '../entities/workflow-template.entity';

export interface CreateWorkflowTemplateDto {
  name: string;
  description: string;
  category: string;
  workflow_definition: any;
  default_config?: Record<string, any>;
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: string;
  author?: string;
  is_enterprise?: boolean;
}

@Injectable()
export class WorkflowTemplateService {
  constructor(
    @InjectRepository(WorkflowTemplate)
    private templateRepo: Repository<WorkflowTemplate>
  ) {}

  async createTemplate(data: CreateWorkflowTemplateDto): Promise<WorkflowTemplate> {
    const template = this.templateRepo.create({
      ...data,
      usage_count: 0,
      rating: 0,
      rating_count: 0,
      is_active: true,
      is_featured: false
    });

    return await this.templateRepo.save(template);
  }

  async getAllTemplates(filters?: {
    category?: string;
    complexity?: string;
    tags?: string[];
    featured?: boolean;
    enterprise?: boolean;
  }): Promise<WorkflowTemplate[]> {
    const query = this.templateRepo.createQueryBuilder('template')
      .where('template.is_active = :active', { active: true });

    if (filters?.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.complexity) {
      query.andWhere('template.complexity = :complexity', { complexity: filters.complexity });
    }

    if (filters?.featured !== undefined) {
      query.andWhere('template.is_featured = :featured', { featured: filters.featured });
    }

    if (filters?.enterprise !== undefined) {
      query.andWhere('template.is_enterprise = :enterprise', { enterprise: filters.enterprise });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.andWhere('template.tags && :tags', { tags: filters.tags });
    }

    return await query
      .orderBy('template.is_featured', 'DESC')
      .addOrderBy('template.rating', 'DESC')
      .addOrderBy('template.usage_count', 'DESC')
      .getMany();
  }

  async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
    return await this.templateRepo.findOne({ where: { id, is_active: true } });
  }

  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    return await this.templateRepo.createQueryBuilder('template')
      .where('template.is_active = :active', { active: true })
      .andWhere('(template.name ILIKE :query OR template.description ILIKE :query)', {
        query: `%${query}%`
      })
      .orderBy('template.rating', 'DESC')
      .getMany();
  }

  async getTemplatesByCategory(category: string): Promise<WorkflowTemplate[]> {
    return await this.templateRepo.find({
      where: { category, is_active: true },
      order: { rating: 'DESC', usage_count: 'DESC' }
    });
  }

  async getFeaturedTemplates(): Promise<WorkflowTemplate[]> {
    return await this.templateRepo.find({
      where: { is_featured: true, is_active: true },
      order: { rating: 'DESC' },
      take: 10
    });
  }

  async getPopularTemplates(limit: number = 10): Promise<WorkflowTemplate[]> {
    return await this.templateRepo.find({
      where: { is_active: true },
      order: { usage_count: 'DESC', rating: 'DESC' },
      take: limit
    });
  }

  async incrementUsage(templateId: string): Promise<void> {
    await this.templateRepo.increment({ id: templateId }, 'usage_count', 1);
  }

  async rateTemplate(templateId: string, rating: number): Promise<WorkflowTemplate | null> {
    const template = await this.templateRepo.findOne({ where: { id: templateId } });
    if (!template) return null;

    // Calculate new average rating
    const newRatingCount = template.rating_count + 1;
    const newRating = ((template.rating * template.rating_count) + rating) / newRatingCount;

    await this.templateRepo.update(templateId, {
      rating: Math.round(newRating * 100) / 100,
      rating_count: newRatingCount
    });

    return await this.templateRepo.findOne({ where: { id: templateId } });
  }

  async getTemplateStatistics(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byComplexity: Record<string, number>;
    featured: number;
    enterprise: number;
    averageRating: number;
  }> {
    const templates = await this.templateRepo.find({ where: { is_active: true } });

    const byCategory = templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byComplexity = templates.reduce((acc, template) => {
      acc[template.complexity] = (acc[template.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRating = templates.reduce((sum, template) => sum + template.rating, 0);
    const averageRating = templates.length > 0 ? totalRating / templates.length : 0;

    return {
      total: templates.length,
      byCategory,
      byComplexity,
      featured: templates.filter(t => t.is_featured).length,
      enterprise: templates.filter(t => t.is_enterprise).length,
      averageRating: Math.round(averageRating * 100) / 100
    };
  }

  async seedDefaultTemplates(): Promise<void> {
    const count = await this.templateRepo.count();
    if (count > 0) {
      console.log('Workflow templates already exist, skipping seed');
      return;
    }

    console.log('Seeding default workflow templates...');

    const templates: DeepPartial<WorkflowTemplate>[] = [
      {
        name: 'Basic Threat Intelligence Enrichment',
        description: 'Enriches security events with threat intelligence data from multiple sources',
        category: 'incident-response',
        complexity: 'beginner' as const,
        estimated_time: '2-5 minutes',
        author: 'NodeGuard Security',
        tags: ['threat-intel', 'enrichment', 'basic'],
        is_featured: true,
        workflow_definition: {
          nodes: [
            {
              id: 'start',
              type: 'input',
              nodeId: 'security-event-input',
              position: { x: 100, y: 100 },
              config: {},
              data: {
                label: 'Security Event',
                description: 'Input security event for analysis'
              }
            },
            {
              id: 'threat-intel',
              type: 'custom',
              nodeId: 'threat-intel-enrichment',
              position: { x: 300, y: 100 },
              config: {
                timeout: 10000,
                enable_geolocation: true,
                sources: 'all'
              },
              data: {
                label: 'Threat Intel Enrichment',
                description: 'Enrich with threat intelligence'
              }
            },
            {
              id: 'mitre',
              type: 'custom',
              nodeId: 'mitre-attack-mapper',
              position: { x: 500, y: 100 },
              config: {
                confidence_threshold: 0.7,
                include_threat_actors: true
              },
              data: {
                label: 'MITRE ATT&CK Mapping',
                description: 'Map to MITRE techniques'
              }
            },
            {
              id: 'output',
              type: 'output',
              nodeId: 'enriched-event-output',
              position: { x: 700, y: 100 },
              config: {},
              data: {
                label: 'Enriched Event',
                description: 'Fully enriched security event'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'threat-intel', animated: true },
            { id: 'e2', source: 'threat-intel', target: 'mitre', animated: true },
            { id: 'e3', source: 'mitre', target: 'output', animated: true }
          ],
          metadata: {
            version: '1.0.0',
            author: 'NodeGuard Security',
            tags: ['threat-intel', 'mitre', 'basic'],
            complexity: 'beginner' as const,
            estimated_time: '2-5 minutes'
          }
        },
        default_config: {
          threat_intel: {
            timeout: 10000,
            enable_geolocation: true
          },
          mitre: {
            confidence_threshold: 0.7
          }
        }
      },
      {
        name: 'Advanced Malware Analysis Pipeline',
        description: 'Comprehensive malware analysis workflow with multiple detection techniques',
        category: 'threat-hunting',
        complexity: 'advanced' as const,
        estimated_time: '10-15 minutes',
        author: 'NodeGuard Security',
        tags: ['malware', 'analysis', 'advanced', 'hunting'],
        is_featured: true,
        is_enterprise: true,
        workflow_definition: {
          nodes: [
            {
              id: 'start',
              type: 'input',
              nodeId: 'security-event-input',
              position: { x: 100, y: 200 },
              config: {},
              data: {
                label: 'Malware Event',
                description: 'Suspected malware event'
              }
            },
            {
              id: 'threat-intel',
              type: 'custom',
              nodeId: 'threat-intel-enrichment',
              position: { x: 300, y: 150 },
              config: {
                sources: 'all',
                timeout: 15000
              },
              data: {
                label: 'Threat Intelligence',
                description: 'Gather threat intelligence'
              }
            },
            {
              id: 'mitre',
              type: 'custom',
              nodeId: 'mitre-attack-mapper',
              position: { x: 300, y: 250 },
              config: {
                include_threat_actors: true
              },
              data: {
                label: 'MITRE Mapping',
                description: 'Map attack techniques'
              }
            },
            {
              id: 'correlation',
              type: 'custom',
              nodeId: 'correlation-engine',
              position: { x: 500, y: 200 },
              config: {
                time_window: '1h',
                correlation_rules: ['malware_family', 'c2_infrastructure']
              },
              data: {
                label: 'Correlation Analysis',
                description: 'Correlate with historical data'
              }
            },
            {
              id: 'output',
              type: 'output',
              nodeId: 'analysis-report-output',
              position: { x: 700, y: 200 },
              config: {},
              data: {
                label: 'Analysis Report',
                description: 'Comprehensive malware analysis'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'threat-intel' },
            { id: 'e2', source: 'start', target: 'mitre' },
            { id: 'e3', source: 'threat-intel', target: 'correlation' },
            { id: 'e4', source: 'mitre', target: 'correlation' },
            { id: 'e5', source: 'correlation', target: 'output' }
          ],
          metadata: {
            version: '1.0.0',
            author: 'NodeGuard Security',
            tags: ['malware', 'advanced', 'correlation'],
            complexity: 'advanced' as const,
            estimated_time: '10-15 minutes'
          }
        }
      },
      {
        name: 'Phishing Email Investigation',
        description: 'Automated phishing email analysis and response workflow',
        category: 'incident-response',
        complexity: 'intermediate' as const,
        estimated_time: '5-8 minutes',
        author: 'NodeGuard Security',
        tags: ['phishing', 'email', 'investigation', 'response'],
        is_featured: true,
        workflow_definition: {
          nodes: [
            {
              id: 'start',
              type: 'input',
              nodeId: 'email-event-input',
              position: { x: 100, y: 200 },
              config: {},
              data: {
                label: 'Phishing Email',
                description: 'Suspected phishing email'
              }
            },
            {
              id: 'url-analysis',
              type: 'custom',
              nodeId: 'url-reputation-check',
              position: { x: 300, y: 150 },
              config: {
                check_redirects: true,
                screenshot: false
              },
              data: {
                label: 'URL Analysis',
                description: 'Analyze URLs in email'
              }
            },
            {
              id: 'attachment-scan',
              type: 'custom',
              nodeId: 'file-analysis',
              position: { x: 300, y: 250 },
              config: {
                sandbox_analysis: true,
                static_analysis: true
              },
              data: {
                label: 'Attachment Scan',
                description: 'Scan email attachments'
              }
            },
            {
              id: 'sender-rep',
              type: 'custom',
              nodeId: 'sender-reputation',
              position: { x: 500, y: 100 },
              config: {
                check_spf: true,
                check_dkim: true,
                check_dmarc: true
              },
              data: {
                label: 'Sender Reputation',
                description: 'Check sender reputation'
              }
            },
            {
              id: 'risk-score',
              type: 'custom',
              nodeId: 'risk-calculator',
              position: { x: 500, y: 250 },
              config: {
                weights: {
                  url_reputation: 0.4,
                  attachment_score: 0.3,
                  sender_reputation: 0.3
                }
              },
              data: {
                label: 'Risk Scoring',
                description: 'Calculate overall risk'
              }
            },
            {
              id: 'response',
              type: 'custom',
              nodeId: 'automated-response',
              position: { x: 700, y: 200 },
              config: {
                quarantine_threshold: 7.0,
                notify_users: true,
                block_sender: true
              },
              data: {
                label: 'Automated Response',
                description: 'Execute response actions'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'url-analysis' },
            { id: 'e2', source: 'start', target: 'attachment-scan' },
            { id: 'e3', source: 'start', target: 'sender-rep' },
            { id: 'e4', source: 'url-analysis', target: 'risk-score' },
            { id: 'e5', source: 'attachment-scan', target: 'risk-score' },
            { id: 'e6', source: 'sender-rep', target: 'risk-score' },
            { id: 'e7', source: 'risk-score', target: 'response' }
          ],
          metadata: {
            version: '1.0.0',
            author: 'NodeGuard Security',
            tags: ['phishing', 'email', 'automation'],
            complexity: 'intermediate' as const,
            estimated_time: '5-8 minutes'
          }
        }
      },
      {
        name: 'Brute Force Attack Detection',
        description: 'Detect and respond to brute force authentication attacks',
        category: 'monitoring',
        complexity: 'intermediate' as const,
        estimated_time: '3-5 minutes',
        author: 'NodeGuard Security',
        tags: ['brute-force', 'authentication', 'detection', 'blocking'],
        workflow_definition: {
          nodes: [
            {
              id: 'start',
              type: 'input',
              nodeId: 'auth-event-input',
              position: { x: 100, y: 200 },
              config: {},
              data: {
                label: 'Auth Event',
                description: 'Authentication event'
              }
            },
            {
              id: 'pattern-detect',
              type: 'custom',
              nodeId: 'brute-force-detector',
              position: { x: 300, y: 200 },
              config: {
                threshold: 5,
                time_window: '5m',
                failed_attempts_only: true
              },
              data: {
                label: 'Pattern Detection',
                description: 'Detect brute force patterns'
              }
            },
            {
              id: 'ip-reputation',
              type: 'custom',
              nodeId: 'threat-intel-enrichment',
              position: { x: 500, y: 150 },
              config: {
                indicator_types: ['ip'],
                sources: ['abuseipdb', 'virustotal']
              },
              data: {
                label: 'IP Reputation',
                description: 'Check attacker IP reputation'
              }
            },
            {
              id: 'geolocation',
              type: 'custom',
              nodeId: 'geolocation-analysis',
              position: { x: 500, y: 250 },
              config: {
                unusual_location_threshold: 1000
              },
              data: {
                label: 'Geo Analysis',
                description: 'Analyze attack origin'
              }
            },
            {
              id: 'response',
              type: 'custom',
              nodeId: 'security-response',
              position: { x: 700, y: 200 },
              config: {
                block_ip: true,
                lock_account: false,
                alert_admin: true,
                duration: '1h'
              },
              data: {
                label: 'Security Response',
                description: 'Block and alert'
              }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'pattern-detect' },
            { id: 'e2', source: 'pattern-detect', target: 'ip-reputation' },
            { id: 'e3', source: 'pattern-detect', target: 'geolocation' },
            { id: 'e4', source: 'ip-reputation', target: 'response' },
            { id: 'e5', source: 'geolocation', target: 'response' }
          ],
          metadata: {
            version: '1.0.0',
            author: 'NodeGuard Security',
            tags: ['brute-force', 'authentication', 'blocking'],
            complexity: 'intermediate' as const,
            estimated_time: '3-5 minutes'
          }
        }
      }
    ];

    for (const templateData of templates) {
      const template = this.templateRepo.create(templateData);
      await this.templateRepo.save(template);
    }

    console.log(`Seeded ${templates.length} workflow templates`);
  }
}