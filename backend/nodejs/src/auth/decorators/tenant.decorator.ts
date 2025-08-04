import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const TENANT_KEY = 'tenant';

// Decorator to get current tenant from request
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

// Decorator to get current user from request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Decorator to specify required permissions
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// Decorator to specify required role
export const RequireRole = (...roles: string[]) => 
  SetMetadata('roles', roles);

// Decorator to specify tenant-specific feature requirements
export const RequireFeature = (...features: string[]) => 
  SetMetadata('features', features);

// Decorator to mark endpoints as tenant-scoped
export const TenantScoped = () => SetMetadata('tenant-scoped', true);

// Decorator to mark endpoints as super admin only
export const SuperAdminOnly = () => SetMetadata('super-admin-only', true);