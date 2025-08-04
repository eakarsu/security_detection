import { Repository, SelectQueryBuilder, FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export abstract class BaseTenantRepository<T> extends Repository<T> {
  constructor(
    @Inject('REQUEST') private readonly request: Request
  ) {
    super();
  }

  /**
   * Get the current tenant ID from the request context
   */
  protected getCurrentTenantId(): string {
    const tenant = (this.request as any).tenant;
    if (!tenant) {
      throw new Error('No tenant context found in request');
    }
    return tenant.id;
  }

  /**
   * Add tenant filter to where clause
   */
  protected addTenantFilter(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    const tenantId = this.getCurrentTenantId();
    
    if (Array.isArray(where)) {
      return where.map(condition => ({
        ...condition,
        tenant_id: tenantId
      } as FindOptionsWhere<T>));
    }
    
    return {
      ...where,
      tenant_id: tenantId
    } as FindOptionsWhere<T>;
  }

  /**
   * Create a query builder with automatic tenant filtering
   */
  createTenantQueryBuilder(alias?: string): SelectQueryBuilder<T> {
    const tenantId = this.getCurrentTenantId();
    const qb = this.createQueryBuilder(alias);
    
    // Check if entity has tenant_id column
    const hasTenanIdColumn = this.metadata.columns.some(col => col.propertyName === 'tenant_id');
    
    if (hasTenanIdColumn) {
      const tableAlias = alias || this.metadata.tableName;
      qb.andWhere(`${tableAlias}.tenant_id = :tenantId`, { tenantId });
    }
    
    return qb;
  }

  /**
   * Override find method with tenant filtering
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    if (!options) {
      options = {};
    }
    
    // Add tenant filter to where clause
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      if (options.where) {
        options.where = this.addTenantFilter(options.where);
      } else {
        options.where = { tenant_id: this.getCurrentTenantId() } as FindOptionsWhere<T>;
      }
    }
    
    return super.find(options);
  }

  /**
   * Override findOne method with tenant filtering
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    // Add tenant filter to where clause
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      if (options.where) {
        options.where = this.addTenantFilter(options.where);
      } else {
        options.where = { tenant_id: this.getCurrentTenantId() } as FindOptionsWhere<T>;
      }
    }
    
    return super.findOne(options);
  }

  /**
   * Override findBy method with tenant filtering
   */
  async findBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T[]> {
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      where = this.addTenantFilter(where);
    }
    
    return super.findBy(where);
  }

  /**
   * Override findOneBy method with tenant filtering
   */
  async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      where = this.addTenantFilter(where) as FindOptionsWhere<T>;
    }
    
    return super.findOneBy(where);
  }

  /**
   * Override count method with tenant filtering
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    if (!options) {
      options = {};
    }
    
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      if (options.where) {
        options.where = this.addTenantFilter(options.where);
      } else {
        options.where = { tenant_id: this.getCurrentTenantId() } as FindOptionsWhere<T>;
      }
    }
    
    return super.count(options);
  }

  /**
   * Override save method to automatically add tenant_id
   */
  async save<Entity extends T>(entities: Entity[], options?: any): Promise<Entity[]>;
  async save<Entity extends T>(entity: Entity, options?: any): Promise<Entity>;
  async save<Entity extends T>(entityOrEntities: Entity | Entity[], options?: any): Promise<Entity | Entity[]> {
    const tenantId = this.getCurrentTenantId();
    
    // Add tenant_id to entities being saved
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      if (Array.isArray(entityOrEntities)) {
        entityOrEntities.forEach(entity => {
          if (!(entity as any).tenant_id) {
            (entity as any).tenant_id = tenantId;
          }
        });
      } else {
        if (!(entityOrEntities as any).tenant_id) {
          (entityOrEntities as any).tenant_id = tenantId;
        }
      }
    }
    
    return super.save(entityOrEntities as any, options);
  }

  /**
   * Override create method to automatically add tenant_id
   */
  create(): T;
  create(entityLikeArray: any[]): T[];
  create(entityLike: any): T;
  create(entityLike?: any | any[]): T | T[] {
    const tenantId = this.getCurrentTenantId();
    
    const result = super.create(entityLike);
    
    // Add tenant_id to created entities
    if (this.metadata.columns.some(col => col.propertyName === 'tenant_id')) {
      if (Array.isArray(result)) {
        result.forEach(entity => {
          if (!(entity as any).tenant_id) {
            (entity as any).tenant_id = tenantId;
          }
        });
      } else {
        if (!(result as any).tenant_id) {
          (result as any).tenant_id = tenantId;
        }
      }
    }
    
    return result;
  }

  /**
   * Check if current user can access entity (for row-level security)
   */
  async canAccess(entity: T): Promise<boolean> {
    const tenantId = this.getCurrentTenantId();
    return (entity as any).tenant_id === tenantId;
  }

  /**
   * Get entity with access check
   */
  async findOneWithAccess(id: string): Promise<T | null> {
    const entity = await this.findOneBy({ id } as FindOptionsWhere<T>);
    
    if (!entity) {
      return null;
    }
    
    const hasAccess = await this.canAccess(entity);
    return hasAccess ? entity : null;
  }
}