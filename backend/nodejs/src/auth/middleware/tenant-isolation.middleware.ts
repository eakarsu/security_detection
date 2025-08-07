import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service';

export interface TenantRequest extends Request {
  tenant?: any;
  user?: any;
  tenantContext?: {
    tenantId: string;
    userId?: string;
    userRole?: string;
    subdomain?: string;
  };
}

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      await this.extractTenantContext(req);
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid tenant context');
    }
  }

  protected async extractTenantContext(req: TenantRequest): Promise<void> {
    let tenant = null;
    
    // 1. Try to get tenant from subdomain
    const host = req.get('host') || req.get('x-forwarded-host') || '';
    const subdomain = this.extractSubdomain(host);
    
    if (subdomain) {
      tenant = await this.tenantService.findBySubdomain(subdomain);
    }

    // 2. Try to get tenant from custom domain
    if (!tenant) {
      const domain = this.extractDomain(host);
      if (domain && domain !== 'localhost' && !domain.includes('nodeguard.com')) {
        tenant = await this.tenantService.findByDomain(domain);
      }
    }

    // 3. Try to get tenant from header (for API calls)
    if (!tenant) {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (tenantId) {
        tenant = await this.tenantService.getTenantById(tenantId);
      }
    }

    // 4. Try to get tenant from JWT claims (if user is authenticated)
    if (!tenant && req.user) {
      const userTenantId = (req.user as any).tenantId;
      if (userTenantId) {
        tenant = await this.tenantService.getTenantById(userTenantId);
      }
    }

    // 5. For super admins, allow tenant switching via header
    if (req.user && (req.user as any).role === 'super_admin') {
      const switchTenantId = req.headers['x-switch-tenant'] as string;
      if (switchTenantId) {
        const switchTenant = await this.tenantService.getTenantById(switchTenantId);
        if (switchTenant) {
          tenant = switchTenant;
        }
      }
    }

    // Validate tenant status
    if (tenant) {
      await this.validateTenantStatus(tenant);
      
      // Attach tenant to request
      req.tenant = tenant;
      req.tenantContext = {
        tenantId: tenant.id,
        userId: req.user?.id,
        userRole: req.user?.role,
        subdomain: tenant.subdomain
      };
    }

    // For routes that require tenant context, throw error if no tenant found
    if (this.requiresTenantContext(req) && !tenant) {
      throw new UnauthorizedException('Tenant context required');
    }
  }

  protected extractSubdomain(host: string): string | null {
    if (!host) return null;
    
    // Remove port if present
    const hostname = host.split(':')[0];
    
    // Extract subdomain from hostname like "tenant.nodeguard.com"
    const parts = hostname.split('.');
    
    if (parts.length >= 3 && parts[parts.length - 2] === 'nodeguard' && parts[parts.length - 1] === 'com') {
      return parts[0];
    }
    
    return null;
  }

  protected extractDomain(host: string): string | null {
    if (!host) return null;
    
    // Remove port if present
    return host.split(':')[0];
  }

  protected async validateTenantStatus(tenant: any): Promise<void> {
    // Check if tenant is active
    if (!tenant.is_active) {
      throw new UnauthorizedException('Tenant account is inactive');
    }

    // Check if tenant is suspended
    if (tenant.status === 'suspended') {
      throw new UnauthorizedException('Tenant account is suspended');
    }

    // Check if trial has expired
    if (tenant.plan === 'trial' && tenant.trial_ends_at && new Date() > tenant.trial_ends_at) {
      throw new UnauthorizedException('Trial period has expired');
    }

    // Check if subscription has expired
    if (tenant.subscription_ends_at && new Date() > tenant.subscription_ends_at) {
      throw new UnauthorizedException('Subscription has expired');
    }
  }

  protected requiresTenantContext(req: Request): boolean {
    // Routes that require tenant context
    const tenantRequiredPaths = [
      '/api/workflows',
      '/api/threat-intel',
      '/api/mitre',
      '/api/templates',
      '/api/soar',
      '/api/ai',
      '/api/alerts',
      '/api/correlation',
      '/api/response'
    ];

    // Routes that don't require tenant context
    const publicPaths = [
      '/api/auth',
      '/api/health',
      '/api/status',
      '/api/tenants' // Super admin operations
    ];

    const path = req.path;

    // Check if it's a public path
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
      return false;
    }

    // Check if it requires tenant context
    if (tenantRequiredPaths.some(tenantPath => path.startsWith(tenantPath))) {
      return true;
    }

    // Default to not requiring tenant context for unknown paths
    return false;
  }
}

/**
 * Middleware factory for custom tenant isolation configurations
 * Note: This factory is disabled due to TypeScript limitations with protected methods
 * Use TenantIsolationMiddleware directly instead
 */
export function createTenantIsolationMiddleware(options: {
  requireTenantForPaths?: string[];
  allowedPublicPaths?: string[];
  enableSubdomainRouting?: boolean;
  enableCustomDomains?: boolean;
}) {
  // Return the base class for now due to TypeScript limitations
  return TenantIsolationMiddleware;
}