import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from '../services/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if endpoint requires tenant scoping
    const tenantScoped = this.reflector.get<boolean>('tenant-scoped', context.getHandler()) ||
                        this.reflector.get<boolean>('tenant-scoped', context.getClass());

    // Check if endpoint is super admin only
    const superAdminOnly = this.reflector.get<boolean>('super-admin-only', context.getHandler()) ||
                          this.reflector.get<boolean>('super-admin-only', context.getClass());

    if (superAdminOnly) {
      if (!request.user || request.user.role !== 'super_admin') {
        throw new ForbiddenException('Super admin access required');
      }
      return true;
    }

    if (!tenantScoped) {
      return true; // No tenant scoping required
    }

    // Extract tenant from request (subdomain, domain, or header)
    const tenant = await this.extractTenant(request);
    
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    // Check if tenant is active
    if (!tenant.is_active || tenant.status !== 'active') {
      throw new ForbiddenException('Tenant is not active');
    }

    // Add tenant to request
    request.tenant = tenant;

    // Check if user belongs to this tenant
    if (request.user && request.user.tenant_id !== tenant.id && request.user.role !== 'super_admin') {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    return true;
  }

  private async extractTenant(request: any): Promise<any> {
    // Try to get tenant from subdomain
    const host = request.get('host') || request.hostname;
    
    if (host) {
      // Check for subdomain pattern (e.g., acme.nodeguard.com)
      const subdomainMatch = host.match(/^([a-z0-9-]+)\.nodeguard\.com$/);
      if (subdomainMatch) {
        const subdomain = subdomainMatch[1];
        try {
          return await this.tenantService.getTenantBySubdomain(subdomain);
        } catch (error) {
          // Subdomain not found, continue to check other methods
        }
      }

      // Check for custom domain
      try {
        return await this.tenantService.getTenantByDomain(host);
      } catch (error) {
        // Custom domain not found, continue
      }
    }

    // Try to get tenant from header
    const tenantId = request.get('x-tenant-id');
    if (tenantId) {
      try {
        return await this.tenantService.getTenantById(tenantId);
      } catch (error) {
        // Tenant ID not found
      }
    }

    // Try to get tenant from user if authenticated
    if (request.user && request.user.tenant_id) {
      try {
        return await this.tenantService.getTenantById(request.user.tenant_id);
      } catch (error) {
        // User's tenant not found
      }
    }

    return null;
  }
}