import { Injectable, Inject, Scope } from '@nestjs/common';
import { Request } from 'express';
import { DataSource, Repository, EntityTarget } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userRole?: string;
  permissions?: string[];
}

@Injectable({ scope: Scope.REQUEST })
export class TenantDataService {
  private tenantContext: TenantContext | null = null;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject('REQUEST') private readonly request: Request
  ) {
    this.initializeTenantContext();
  }

  /**
   * Initialize tenant context from request
   */
  private initializeTenantContext(): void {
    const req = this.request as any;
    
    if (req.tenant && req.user) {
      this.tenantContext = {
        tenantId: req.tenant.id,
        userId: req.user.id,
        userRole: req.user.role,
        permissions: req.user.permissions || []
      };
    }
  }

  /**
   * Get current tenant context
   */
  getTenantContext(): TenantContext | null {
    return this.tenantContext;
  }

  /**
   * Set tenant context (for testing or system operations)
   */
  setTenantContext(context: TenantContext): void {
    this.tenantContext = context;
  }

  /**
   * Get tenant ID from context
   */
  getTenantId(): string {
    if (!this.tenantContext) {
      throw new Error('No tenant context available');
    }
    return this.tenantContext.tenantId;
  }

  /**
   * Get user ID from context
   */
  getUserId(): string | undefined {
    return this.tenantContext?.userId;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    if (!this.tenantContext) {
      return false;
    }
    
    return this.tenantContext.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    if (!this.tenantContext) {
      return false;
    }
    
    return this.tenantContext.userRole === role;
  }

  /**
   * Get tenant-scoped repository
   */
  getTenantRepository<Entity>(entityClass: EntityTarget<Entity>): Repository<Entity> {
    const repository = this.dataSource.getRepository(entityClass);
    return this.wrapRepositoryWithTenantFilter(repository);
  }

  /**
   * Wrap repository with tenant filtering
   */
  private wrapRepositoryWithTenantFilter<Entity>(repository: Repository<Entity>): Repository<Entity> {
    const tenantId = this.getTenantId();
    
    // Create a proxy that intercepts repository methods
    return new Proxy(repository, {
      get: (target, prop, receiver) => {
        const originalMethod = Reflect.get(target, prop, receiver);
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }

        // Methods that need tenant filtering
        const tenantFilterMethods = ['find', 'findOne', 'findBy', 'findOneBy', 'count', 'countBy'];
        const tenantInjectMethods = ['save', 'insert', 'create'];

        if (tenantFilterMethods.includes(prop as string)) {
          return (...args: any[]) => {
            // Add tenant filter to the first argument (options)
            if (args[0] && typeof args[0] === 'object') {
              if (!args[0].where) {
                args[0].where = {};
              }
              
              // Check if entity has tenant_id column
              const hasTenanIdColumn = target.metadata.columns.some(col => col.propertyName === 'tenant_id');
              
              if (hasTenanIdColumn) {
                if (Array.isArray(args[0].where)) {
                  args[0].where = args[0].where.map((condition: any) => ({
                    ...condition,
                    tenant_id: tenantId
                  }));
                } else {
                  args[0].where = {
                    ...args[0].where,
                    tenant_id: tenantId
                  };
                }
              }
            } else if (prop === 'findBy' || prop === 'findOneBy' || prop === 'countBy') {
              // For findBy methods, args[0] is the where clause directly
              const hasTenanIdColumn = target.metadata.columns.some(col => col.propertyName === 'tenant_id');
              
              if (hasTenanIdColumn && args[0]) {
                args[0] = {
                  ...args[0],
                  tenant_id: tenantId
                };
              }
            }
            
            return originalMethod.apply(target, args);
          };
        }

        if (tenantInjectMethods.includes(prop as string)) {
          return (...args: any[]) => {
            // Add tenant_id to entities being saved/created
            const hasTenanIdColumn = target.metadata.columns.some(col => col.propertyName === 'tenant_id');
            
            if (hasTenanIdColumn && args[0]) {
              if (Array.isArray(args[0])) {
                args[0].forEach((entity: any) => {
                  if (!entity.tenant_id) {
                    entity.tenant_id = tenantId;
                  }
                });
              } else if (typeof args[0] === 'object') {
                if (!args[0].tenant_id) {
                  args[0].tenant_id = tenantId;
                }
              }
            }
            
            return originalMethod.apply(target, args);
          };
        }

        // For other methods, return as-is
        return (...args: any[]) => originalMethod.apply(target, args);
      }
    });
  }

  /**
   * Create tenant-scoped query builder
   */
  createTenantQueryBuilder<Entity>(entityClass: EntityTarget<Entity>, alias?: string) {
    const repository = this.dataSource.getRepository(entityClass);
    const qb = repository.createQueryBuilder(alias);
    
    // Add tenant filter if entity has tenant_id column
    const hasTenanIdColumn = repository.metadata.columns.some(col => col.propertyName === 'tenant_id');
    
    if (hasTenanIdColumn) {
      const tenantId = this.getTenantId();
      const tableAlias = alias || repository.metadata.tableName;
      qb.andWhere(`${tableAlias}.tenant_id = :tenantId`, { tenantId });
    }
    
    return qb;
  }

  /**
   * Execute raw query with tenant context
   */
  async executeRawQuery(query: string, parameters: any[] = []): Promise<any> {
    // Add tenant_id parameter if not present
    const tenantId = this.getTenantId();
    
    // Replace :tenantId placeholder with actual tenant ID
    const processedQuery = query.replace(/:tenantId/g, `'${tenantId}'`);
    
    return this.dataSource.query(processedQuery, parameters);
  }

  /**
   * Check if entity belongs to current tenant
   */
  async validateTenantAccess<Entity>(entity: Entity): Promise<boolean> {
    const tenantId = this.getTenantId();
    return (entity as any).tenant_id === tenantId;
  }

  /**
   * Bulk update entities for current tenant
   */
  async bulkUpdateForTenant<Entity>(
    entityClass: EntityTarget<Entity>,
    criteria: any,
    partialEntity: any
  ): Promise<any> {
    const qb = this.createTenantQueryBuilder(entityClass)
      .update()
      .set(partialEntity)
      .where(criteria);
    
    return qb.execute();
  }

  /**
   * Bulk delete entities for current tenant
   */
  async bulkDeleteForTenant<Entity>(
    entityClass: EntityTarget<Entity>,
    criteria: any
  ): Promise<any> {
    const qb = this.createTenantQueryBuilder(entityClass)
      .delete()
      .where(criteria);
    
    return qb.execute();
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsageStats(): Promise<{
    workflows: number;
    threat_intel: number;
    mitre_techniques: number;
    threat_sources: number;
  }> {
    const tenantId = this.getTenantId();
    
    const [workflows, threatIntel, mitreTechniques, threatSources] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) as count FROM workflows WHERE tenant_id = ?', [tenantId]),
      this.dataSource.query('SELECT COUNT(*) as count FROM threat_intelligence WHERE tenant_id = ?', [tenantId]),
      this.dataSource.query('SELECT COUNT(*) as count FROM mitre_attack_techniques WHERE tenant_id = ?', [tenantId]),
      this.dataSource.query('SELECT COUNT(*) as count FROM threat_intel_sources WHERE tenant_id = ?', [tenantId])
    ]);

    return {
      workflows: parseInt(workflows[0]?.count || '0'),
      threat_intel: parseInt(threatIntel[0]?.count || '0'),
      mitre_techniques: parseInt(mitreTechniques[0]?.count || '0'),
      threat_sources: parseInt(threatSources[0]?.count || '0')
    };
  }
}