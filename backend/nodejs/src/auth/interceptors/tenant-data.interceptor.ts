import { Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';

// Decorator to skip tenant filtering for specific methods
export const SkipTenantFilter = () => SetMetadata('skipTenantFilter', true);

@Injectable()
export class TenantDataInterceptor implements NestInterceptor {
  constructor(
    private dataSource: DataSource,
    private reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    // Check if tenant filtering should be skipped
    const skipTenantFilter = this.reflector.get<boolean>('skipTenantFilter', context.getHandler()) ||
                            this.reflector.get<boolean>('skipTenantFilter', context.getClass());

    if (tenant && !skipTenantFilter) {
      // Store enhanced tenant context
      request.tenantContext = {
        tenantId: tenant.id,
        userId: request.user?.id,
        userRole: request.user?.role,
        permissions: request.user?.permissions || [],
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        features: tenant.features
      };

      // Inject tenant data service into request for easy access
      request.getTenantId = () => tenant.id;
      request.getTenantContext = () => request.tenantContext;
      request.hasFeature = (feature: string) => tenant.features?.[feature] === true;
      request.checkUsageLimit = async (resource: string) => {
        const current = tenant.usage_limits?.[`current_${resource}`] || 0;
        const limit = tenant.features?.[`max_${resource}`] || 0;
        return limit === -1 || current < limit; // -1 means unlimited
      };
    }

    return next.handle().pipe(
      tap(() => {
        // Clean up any temporary context modifications
        if (request.tenantContext) {
          delete request.getTenantId;
          delete request.getTenantContext;
          delete request.hasFeature;
          delete request.checkUsageLimit;
        }
      })
    );
  }
}

@Injectable()
export class TenantQueryBuilderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (tenant) {
      // Enhanced tenant context for repositories
      request.tenantContext = {
        tenantId: tenant.id,
        userId: request.user?.id,
        userRole: request.user?.role,
        permissions: request.user?.permissions || [],
        features: tenant.features,
        usageLimits: tenant.usage_limits
      };

      // Add helper methods to request
      request.createTenantQueryBuilder = (entityClass: any, alias?: string) => {
        const repository = request.dataSource?.getRepository(entityClass);
        if (!repository) return null;

        const qb = repository.createQueryBuilder(alias);
        const hasTenanIdColumn = repository.metadata.columns.some(col => col.propertyName === 'tenant_id');
        
        if (hasTenanIdColumn) {
          const tableAlias = alias || repository.metadata.tableName;
          qb.andWhere(`${tableAlias}.tenant_id = :tenantId`, { tenantId: tenant.id });
        }
        
        return qb;
      };

      request.validateTenantAccess = (entity: any) => {
        return entity?.tenant_id === tenant.id;
      };
    }

    return next.handle();
  }
}

// Row-level security interceptor
@Injectable()
export class TenantSecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const user = request.user;

    if (tenant && user) {
      // Add security context
      request.securityContext = {
        tenantId: tenant.id,
        userId: user.id,
        userRole: user.role,
        permissions: user.permissions || [],
        isAdmin: user.role === 'tenant_admin' || user.role === 'super_admin',
        isSuperAdmin: user.role === 'super_admin'
      };

      // Security helper methods
      request.canAccessEntity = (entity: any) => {
        // Check tenant ownership
        if (entity.tenant_id && entity.tenant_id !== tenant.id) {
          return false;
        }

        // Check user ownership for user-specific entities
        if (entity.created_by && !request.securityContext.isAdmin) {
          return entity.created_by === user.id;
        }

        return true;
      };

      request.canModifyEntity = (entity: any) => {
        if (!request.canAccessEntity(entity)) {
          return false;
        }

        // Admins can modify any entity in their tenant
        if (request.securityContext.isAdmin) {
          return true;
        }

        // Regular users can only modify their own entities
        return entity.created_by === user.id;
      };

      request.filterByPermissions = (entities: any[], requiredPermission: string) => {
        if (request.securityContext.isAdmin) {
          return entities;
        }

        if (!request.securityContext.permissions.includes(requiredPermission)) {
          return [];
        }

        return entities.filter(entity => request.canAccessEntity(entity));
      };
    }

    return next.handle();
  }
}