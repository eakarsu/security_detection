import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { TenantSettings } from '../entities/tenant-settings.entity';
import * as bcrypt from 'bcrypt';

export interface CreateTenantDto {
  name: string;
  subdomain: string;
  domain?: string;
  description?: string;
  plan?: string;
  admin_user: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  };
}

export interface UpdateTenantDto {
  name?: string;
  domain?: string;
  description?: string;
  plan?: string;
  status?: string;
  features?: any;
  branding?: any;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    
    @InjectRepository(User)
    private userRepo: Repository<User>,
    
    @InjectRepository(TenantSettings)
    private settingsRepo: Repository<TenantSettings>
  ) {}

  async createTenant(createDto: CreateTenantDto): Promise<Tenant> {
    // Validate subdomain
    if (!/^[a-z0-9-]+$/.test(createDto.subdomain)) {
      throw new BadRequestException('Subdomain can only contain lowercase letters, numbers, and hyphens');
    }

    // Check if subdomain is already taken
    const existingTenant = await this.tenantRepo.findOne({
      where: { subdomain: createDto.subdomain }
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain is already taken');
    }

    // Check if email is already used
    const existingUser = await this.userRepo.findOne({
      where: { email: createDto.admin_user.email }
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Create tenant
    const tenant = this.tenantRepo.create({
      name: createDto.name,
      subdomain: createDto.subdomain,
      domain: createDto.domain,
      description: createDto.description,
      plan: createDto.plan || 'trial',
      status: 'active',
      features: this.getDefaultFeatures(createDto.plan || 'trial'),
      usage_limits: {
        current_users: 0,
        current_workflows: 0,
        executions_this_month: 0,
        storage_used_mb: 0
      },
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      is_active: true
    });

    const savedTenant = await this.tenantRepo.save(tenant);

    // Create admin user
    const hashedPassword = await bcrypt.hash(createDto.admin_user.password, 12);
    
    const adminUser = this.userRepo.create({
      email: createDto.admin_user.email,
      first_name: createDto.admin_user.first_name,
      last_name: createDto.admin_user.last_name,
      password_hash: hashedPassword,
      role: 'tenant_admin',
      status: 'active',
      tenant_id: savedTenant.id,
      permissions: this.getAdminPermissions(),
      preferences: {
        theme: 'light',
        timezone: 'UTC',
        language: 'en',
        notifications: {
          email: true,
          browser: true,
          workflow_completion: true,
          workflow_failure: true
        }
      },
      email_verified_at: new Date(),
      is_active: true
    });

    await this.userRepo.save(adminUser);

    // Create default settings
    await this.createDefaultSettings(savedTenant.id);

    // Update usage count
    await this.updateUsageLimits(savedTenant.id, { current_users: 1 });

    return savedTenant;
  }

  async getTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId, is_active: true },
      relations: ['users', 'settings']
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { subdomain, is_active: true }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async getTenantByDomain(domain: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { domain, is_active: true }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenant(tenantId: string, updateDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);

    // Validate subdomain if provided
    if (updateDto.name && updateDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepo.findOne({
        where: { name: updateDto.name }
      });
      if (existingTenant && existingTenant.id !== tenantId) {
        throw new ConflictException('Tenant name is already taken');
      }
    }

    Object.assign(tenant, updateDto);
    return await this.tenantRepo.save(tenant);
  }

  async suspendTenant(tenantId: string, reason?: string): Promise<void> {
    await this.tenantRepo.update(tenantId, {
      status: 'suspended',
      updated_at: new Date()
    });

    // Also suspend all users
    await this.userRepo.update(
      { tenant_id: tenantId },
      { status: 'suspended', updated_at: new Date() }
    );
  }

  async reactivateTenant(tenantId: string): Promise<void> {
    await this.tenantRepo.update(tenantId, {
      status: 'active',
      updated_at: new Date()
    });

    // Reactivate all users
    await this.userRepo.update(
      { tenant_id: tenantId, status: 'suspended' },
      { status: 'active', updated_at: new Date() }
    );
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    
    // Soft delete by setting is_active to false
    await this.tenantRepo.update(tenantId, {
      is_active: false,
      status: 'cancelled',
      updated_at: new Date()
    });

    // Deactivate all users
    await this.userRepo.update(
      { tenant_id: tenantId },
      { is_active: false, status: 'inactive', updated_at: new Date() }
    );
  }

  async getAllTenants(
    page: number = 1,
    limit: number = 50,
    filters?: {
      status?: string;
      plan?: string;
      search?: string;
    }
  ): Promise<{ tenants: Tenant[]; total: number; pages: number }> {
    const query = this.tenantRepo.createQueryBuilder('tenant')
      .where('tenant.is_active = :active', { active: true });

    if (filters?.status) {
      query.andWhere('tenant.status = :status', { status: filters.status });
    }

    if (filters?.plan) {
      query.andWhere('tenant.plan = :plan', { plan: filters.plan });
    }

    if (filters?.search) {
      query.andWhere(
        '(tenant.name ILIKE :search OR tenant.subdomain ILIKE :search OR tenant.domain ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const total = await query.getCount();
    const tenants = await query
      .orderBy('tenant.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      tenants,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  // Settings Management
  async getTenantSetting(tenantId: string, key: string): Promise<any> {
    const setting = await this.settingsRepo.findOne({
      where: { tenant_id: tenantId, key, is_active: true }
    });

    return setting ? setting.getParsedValue() : null;
  }

  async setTenantSetting(
    tenantId: string,
    key: string,
    value: any,
    type: string = 'string',
    description?: string
  ): Promise<void> {
    let setting = await this.settingsRepo.findOne({
      where: { tenant_id: tenantId, key }
    });

    if (setting) {
      setting.type = type;
      setting.description = description || setting.description;
      setting.setParsedValue(value);
      setting.updated_at = new Date();
    } else {
      setting = this.settingsRepo.create({
        tenant_id: tenantId,
        key,
        type,
        description,
        is_active: true
      });
      setting.setParsedValue(value);
    }

    await this.settingsRepo.save(setting);
  }

  async getTenantSettings(tenantId: string): Promise<Record<string, any>> {
    const settings = await this.settingsRepo.find({
      where: { tenant_id: tenantId, is_active: true }
    });

    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.getParsedValue();
    });

    return result;
  }

  // Usage Tracking
  async updateUsageLimits(tenantId: string, updates: Partial<any>): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    
    const updatedLimits = {
      ...tenant.usage_limits,
      ...updates
    };

    await this.tenantRepo.update(tenantId, {
      usage_limits: updatedLimits,
      updated_at: new Date()
    });
  }

  async checkUsageLimit(tenantId: string, resource: string): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    const current = tenant.usage_limits?.[`current_${resource}`] || 0;
    const limit = tenant.features?.[`max_${resource}`] || 0;

    return current < limit;
  }

  async incrementUsage(tenantId: string, resource: string, amount: number = 1): Promise<void> {
    const tenant = await this.getTenantById(tenantId);
    const currentKey = `current_${resource}`;
    const current = tenant.usage_limits?.[currentKey] || 0;

    await this.updateUsageLimits(tenantId, {
      [currentKey]: current + amount
    });
  }

  // Helper Methods
  private getDefaultFeatures(plan: string): any {
    const features = {
      trial: {
        max_users: 5,
        max_workflows: 10,
        max_executions_per_month: 1000,
        soar_integrations: false,
        ai_features: false,
        advanced_analytics: false,
        custom_nodes: false,
        sso_enabled: false,
        audit_logs: false,
        api_access: false,
        white_labeling: false
      },
      starter: {
        max_users: 10,
        max_workflows: 50,
        max_executions_per_month: 5000,
        soar_integrations: true,
        ai_features: false,
        advanced_analytics: false,
        custom_nodes: false,
        sso_enabled: false,
        audit_logs: true,
        api_access: true,
        white_labeling: false
      },
      professional: {
        max_users: 50,
        max_workflows: 250,
        max_executions_per_month: 25000,
        soar_integrations: true,
        ai_features: true,
        advanced_analytics: true,
        custom_nodes: true,
        sso_enabled: true,
        audit_logs: true,
        api_access: true,
        white_labeling: false
      },
      enterprise: {
        max_users: -1, // Unlimited
        max_workflows: -1,
        max_executions_per_month: -1,
        soar_integrations: true,
        ai_features: true,
        advanced_analytics: true,
        custom_nodes: true,
        sso_enabled: true,
        audit_logs: true,
        api_access: true,
        white_labeling: true
      }
    };

    return features[plan] || features.trial;
  }

  private getAdminPermissions(): any {
    return {
      workflows: {
        create: true,
        read: true,
        update: true,
        delete: true,
        execute: true
      },
      nodes: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      templates: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      users: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      settings: {
        read: true,
        update: true
      },
      analytics: {
        read: true
      }
    };
  }

  private async createDefaultSettings(tenantId: string): Promise<void> {
    const defaultSettings = [
      {
        key: 'max_workflow_execution_time',
        value: '300000',
        type: 'number',
        description: 'Maximum workflow execution time in milliseconds'
      },
      {
        key: 'enable_audit_logging',
        value: 'true',
        type: 'boolean',
        description: 'Enable audit logging for all tenant activities'
      },
      {
        key: 'default_timezone',
        value: 'UTC',
        type: 'string',
        description: 'Default timezone for the tenant'
      },
      {
        key: 'session_timeout',
        value: '3600',
        type: 'number',
        description: 'Session timeout in seconds'
      },
      {
        key: 'password_policy',
        value: JSON.stringify({
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false
        }),
        type: 'json',
        description: 'Password policy requirements'
      }
    ];

    for (const setting of defaultSettings) {
      await this.setTenantSetting(
        tenantId,
        setting.key,
        setting.value,
        setting.type,
        setting.description
      );
    }
  }

  async getTenantStatistics(): Promise<{
    total_tenants: number;
    active_tenants: number;
    trial_tenants: number;
    paid_tenants: number;
    tenants_by_plan: Record<string, number>;
    recent_signups: number;
  }> {
    const totalTenants = await this.tenantRepo.count({ where: { is_active: true } });
    const activeTenants = await this.tenantRepo.count({ 
      where: { is_active: true, status: 'active' } 
    });
    const trialTenants = await this.tenantRepo.count({ 
      where: { is_active: true, plan: 'trial' } 
    });
    const paidTenants = await this.tenantRepo.count({ 
      where: { is_active: true, plan: ['starter', 'professional', 'enterprise'] } 
    });

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSignups = await this.tenantRepo.count({
      where: {
        is_active: true,
        created_at: { $gte: thirtyDaysAgo } as any
      }
    });

    // Tenants by plan
    const tenantsByPlan = {};
    const plans = ['trial', 'starter', 'professional', 'enterprise'];
    for (const plan of plans) {
      tenantsByPlan[plan] = await this.tenantRepo.count({
        where: { is_active: true, plan }
      });
    }

    return {
      total_tenants: totalTenants,
      active_tenants: activeTenants,
      trial_tenants: trialTenants,
      paid_tenants: paidTenants,
      tenants_by_plan: tenantsByPlan,
      recent_signups: recentSignups
    };
  }
}