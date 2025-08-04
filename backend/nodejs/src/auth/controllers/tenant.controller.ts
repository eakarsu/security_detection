import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService, CreateTenantDto, UpdateTenantDto } from '../services/tenant.service';
import { TenantGuard } from '../guards/tenant.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CurrentTenant, CurrentUser, RequireRole, SuperAdminOnly, TenantScoped, RequirePermissions } from '../decorators/tenant.decorator';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';

@ApiTags('Multi-Tenant Management')
@Controller('tenants')
@ApiBearerAuth()
@UseGuards(TenantGuard, PermissionsGuard)
export class TenantController {
  constructor(
    private tenantService: TenantService
  ) {}

  // Super Admin Operations
  @Post()
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Create new tenant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid tenant data' })
  @ApiResponse({ status: 409, description: 'Subdomain or email already taken' })
  async createTenant(@Body() createDto: CreateTenantDto): Promise<Tenant> {
    try {
      return await this.tenantService.createTenant(createDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get all tenants (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'plan', required: false, description: 'Filter by plan' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or subdomain' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async getAllTenants(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('search') search?: string
  ) {
    return await this.tenantService.getAllTenants(page, limit, {
      status,
      plan,
      search
    });
  }

  @Get('statistics')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get tenant statistics (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant statistics' })
  async getTenantStatistics() {
    return await this.tenantService.getTenantStatistics();
  }

  @Get(':tenantId')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Get specific tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenant(@Param('tenantId') tenantId: string): Promise<Tenant> {
    return await this.tenantService.getTenantById(tenantId);
  }

  @Put(':tenantId')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Update tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() updateDto: UpdateTenantDto
  ): Promise<Tenant> {
    return await this.tenantService.updateTenant(tenantId, updateDto);
  }

  @Put(':tenantId/suspend')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Suspend tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant suspended successfully' })
  async suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: { reason?: string }
  ) {
    await this.tenantService.suspendTenant(tenantId, body.reason);
    return { message: 'Tenant suspended successfully' };
  }

  @Put(':tenantId/reactivate')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Reactivate tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant reactivated successfully' })
  async reactivateTenant(@Param('tenantId') tenantId: string) {
    await this.tenantService.reactivateTenant(tenantId);
    return { message: 'Tenant reactivated successfully' };
  }

  @Delete(':tenantId')
  @SuperAdminOnly()
  @ApiOperation({ summary: 'Delete tenant (Super Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  async deleteTenant(@Param('tenantId') tenantId: string) {
    await this.tenantService.deleteTenant(tenantId);
    return { message: 'Tenant deleted successfully' };
  }

  // Tenant Admin Operations
  @Get('current/info')
  @TenantScoped()
  @RequireRole('tenant_admin')
  @ApiOperation({ summary: 'Get current tenant information' })
  @ApiResponse({ status: 200, description: 'Current tenant information' })
  async getCurrentTenantInfo(@CurrentTenant() tenant: Tenant): Promise<Tenant> {
    return tenant;
  }

  @Put('current/info')
  @TenantScoped()
  @RequireRole('tenant_admin')
  @ApiOperation({ summary: 'Update current tenant information' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  async updateCurrentTenant(
    @CurrentTenant() tenant: Tenant,
    @Body() updateDto: Partial<UpdateTenantDto>
  ): Promise<Tenant> {
    // Tenant admins can only update certain fields
    const allowedUpdates = {
      name: updateDto.name,
      description: updateDto.description,
      branding: updateDto.branding
    };

    return await this.tenantService.updateTenant(tenant.id, allowedUpdates);
  }

  // Settings Management
  @Get('current/settings')
  @TenantScoped()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings' })
  async getTenantSettings(@CurrentTenant() tenant: Tenant) {
    const settings = await this.tenantService.getTenantSettings(tenant.id);
    return { settings };
  }

  @Put('current/settings/:key')
  @TenantScoped()
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Update tenant setting' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  async updateTenantSetting(
    @CurrentTenant() tenant: Tenant,
    @Param('key') key: string,
    @Body() body: { value: any; type?: string; description?: string }
  ) {
    await this.tenantService.setTenantSetting(
      tenant.id,
      key,
      body.value,
      body.type,
      body.description
    );

    return { message: 'Setting updated successfully' };
  }

  @Get('current/settings/:key')
  @TenantScoped()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get specific tenant setting' })
  @ApiParam({ name: 'key', description: 'Setting key' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  async getTenantSetting(
    @CurrentTenant() tenant: Tenant,
    @Param('key') key: string
  ) {
    const value = await this.tenantService.getTenantSetting(tenant.id, key);
    return { key, value };
  }

  // Usage and Limits
  @Get('current/usage')
  @TenantScoped()
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getTenantUsage(@CurrentTenant() tenant: Tenant) {
    return {
      plan: tenant.plan,
      features: tenant.features,
      usage_limits: tenant.usage_limits,
      trial_ends_at: tenant.trial_ends_at,
      subscription_ends_at: tenant.subscription_ends_at
    };
  }

  @Get('current/features')
  @TenantScoped()
  @ApiOperation({ summary: 'Get tenant features' })
  @ApiResponse({ status: 200, description: 'Available features' })
  async getTenantFeatures(@CurrentTenant() tenant: Tenant) {
    return {
      plan: tenant.plan,
      features: tenant.features
    };
  }

  @Post('current/check-limit/:resource')
  @TenantScoped()
  @ApiOperation({ summary: 'Check usage limit for resource' })
  @ApiParam({ name: 'resource', description: 'Resource type (users, workflows, etc.)' })
  @ApiResponse({ status: 200, description: 'Limit check result' })
  async checkUsageLimit(
    @CurrentTenant() tenant: Tenant,
    @Param('resource') resource: string
  ) {
    const canCreate = await this.tenantService.checkUsageLimit(tenant.id, resource);
    const current = tenant.usage_limits?.[`current_${resource}`] || 0;
    const limit = tenant.features?.[`max_${resource}`] || 0;

    return {
      resource,
      can_create: canCreate,
      current_usage: current,
      limit: limit === -1 ? 'unlimited' : limit,
      percentage_used: limit === -1 ? 0 : Math.round((current / limit) * 100)
    };
  }

  // Tenant Branding
  @Put('current/branding')
  @TenantScoped()
  @RequireRole('tenant_admin')
  @ApiOperation({ summary: 'Update tenant branding' })
  @ApiResponse({ status: 200, description: 'Branding updated successfully' })
  async updateTenantBranding(
    @CurrentTenant() tenant: Tenant,
    @Body() branding: {
      primary_color?: string;
      secondary_color?: string;
      company_name?: string;
      logo_url?: string;
      custom_css?: string;
    }
  ) {
    // Validate branding data
    if (branding.primary_color && !/^#[0-9A-F]{6}$/i.test(branding.primary_color)) {
      throw new HttpException('Invalid primary color format', HttpStatus.BAD_REQUEST);
    }

    if (branding.secondary_color && !/^#[0-9A-F]{6}$/i.test(branding.secondary_color)) {
      throw new HttpException('Invalid secondary color format', HttpStatus.BAD_REQUEST);
    }

    const updatedTenant = await this.tenantService.updateTenant(tenant.id, {
      branding: { ...tenant.branding, ...branding },
      logo_url: branding.logo_url || tenant.logo_url
    });

    return {
      message: 'Branding updated successfully',
      branding: updatedTenant.branding
    };
  }

  // Domain Management
  @Put('current/domain')
  @TenantScoped()
  @RequireRole('tenant_admin')
  @ApiOperation({ summary: 'Update custom domain' })
  @ApiResponse({ status: 200, description: 'Domain updated successfully' })
  async updateCustomDomain(
    @CurrentTenant() tenant: Tenant,
    @Body() body: { domain: string }
  ) {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(body.domain)) {
      throw new HttpException('Invalid domain format', HttpStatus.BAD_REQUEST);
    }

    try {
      const updatedTenant = await this.tenantService.updateTenant(tenant.id, {
        domain: body.domain
      });

      return {
        message: 'Custom domain updated successfully',
        domain: updatedTenant.domain,
        instructions: {
          dns_record: {
            type: 'CNAME',
            name: body.domain,
            value: `${tenant.subdomain}.nodeguard.com`
          }
        }
      };
    } catch (error) {
      throw new HttpException('Domain already in use', HttpStatus.CONFLICT);
    }
  }

  // Tenant Health Check
  @Get('current/health')
  @TenantScoped()
  @ApiOperation({ summary: 'Get tenant health status' })
  @ApiResponse({ status: 200, description: 'Tenant health status' })
  async getTenantHealth(@CurrentTenant() tenant: Tenant) {
    const now = new Date();
    const isTrialExpired = tenant.trial_ends_at && tenant.trial_ends_at < now;
    const isSubscriptionExpired = tenant.subscription_ends_at && tenant.subscription_ends_at < now;
    
    return {
      tenant_id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      plan: tenant.plan,
      health: {
        is_active: tenant.is_active,
        is_trial_expired: isTrialExpired,
        is_subscription_expired: isSubscriptionExpired,
        trial_days_remaining: tenant.trial_ends_at ? 
          Math.max(0, Math.ceil((tenant.trial_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
        subscription_days_remaining: tenant.subscription_ends_at ?
          Math.max(0, Math.ceil((tenant.subscription_ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
      },
      usage: tenant.usage_limits,
      features: tenant.features
    };
  }
}