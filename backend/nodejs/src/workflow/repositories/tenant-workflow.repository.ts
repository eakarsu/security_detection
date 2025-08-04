import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { BaseTenantRepository } from '../../auth/repositories/base-tenant.repository';
import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class TenantWorkflowRepository extends BaseTenantRepository<Workflow> {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @Inject('REQUEST') request: Request
  ) {
    super(request);
    // Copy repository properties
    Object.setPrototypeOf(this, workflowRepository);
    Object.assign(this, workflowRepository);
  }

  /**
   * Find workflows by status for current tenant
   */
  async findByStatus(status: string): Promise<Workflow[]> {
    return this.createTenantQueryBuilder('workflow')
      .where('workflow.status = :status', { status })
      .getMany();
  }

  /**
   * Find active workflows for current tenant
   */
  async findActiveWorkflows(): Promise<Workflow[]> {
    return this.createTenantQueryBuilder('workflow')
      .where('workflow.is_active = :isActive', { isActive: true })
      .andWhere('workflow.status = :status', { status: 'active' })
      .getMany();
  }

  /**
   * Find workflows by tags for current tenant
   */
  async findByTags(tags: string[]): Promise<Workflow[]> {
    const qb = this.createTenantQueryBuilder('workflow');
    
    tags.forEach((tag, index) => {
      qb.andWhere(`JSON_CONTAINS(workflow.tags, :tag${index})`, { [`tag${index}`]: JSON.stringify(tag) });
    });
    
    return qb.getMany();
  }

  /**
   * Get workflow statistics for current tenant
   */
  async getWorkflowStatistics(): Promise<{
    total: number;
    active: number;
    draft: number;
    paused: number;
    archived: number;
  }> {
    const qb = this.createTenantQueryBuilder('workflow');
    
    const [total, active, draft, paused, archived] = await Promise.all([
      qb.getCount(),
      qb.clone().where('workflow.status = :status', { status: 'active' }).getCount(),
      qb.clone().where('workflow.status = :status', { status: 'draft' }).getCount(),
      qb.clone().where('workflow.status = :status', { status: 'paused' }).getCount(),
      qb.clone().where('workflow.status = :status', { status: 'archived' }).getCount()
    ]);

    return { total, active, draft, paused, archived };
  }

  /**
   * Find workflows created by specific user in current tenant
   */
  async findByCreatedBy(userId: string): Promise<Workflow[]> {
    return this.createTenantQueryBuilder('workflow')
      .where('workflow.created_by = :userId', { userId })
      .orderBy('workflow.created_at', 'DESC')
      .getMany();
  }

  /**
   * Search workflows by name or description in current tenant
   */
  async searchWorkflows(query: string, limit: number = 20): Promise<Workflow[]> {
    return this.createTenantQueryBuilder('workflow')
      .where('(workflow.name LIKE :query OR workflow.description LIKE :query)', 
        { query: `%${query}%` })
      .limit(limit)
      .orderBy('workflow.updated_at', 'DESC')
      .getMany();
  }

  /**
   * Get recent workflows for current tenant
   */
  async getRecentWorkflows(limit: number = 10): Promise<Workflow[]> {
    return this.createTenantQueryBuilder('workflow')
      .orderBy('workflow.updated_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Clone workflow within tenant
   */
  async cloneWorkflow(workflowId: string, newName: string, userId: string): Promise<Workflow> {
    const originalWorkflow = await this.findOneWithAccess(workflowId);
    
    if (!originalWorkflow) {
      throw new Error('Workflow not found or access denied');
    }

    const clonedWorkflow = this.create({
      ...originalWorkflow,
      id: undefined, // Let TypeORM generate new ID
      name: newName,
      status: 'draft',
      version: 0,
      parent_workflow_id: originalWorkflow.id,
      created_by: userId,
      updated_by: userId,
      execution_stats: {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0
      }
    });

    return this.save(clonedWorkflow);
  }
}