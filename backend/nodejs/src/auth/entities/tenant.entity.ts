import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';
import { TenantSettings } from './tenant-settings.entity';

@Entity('tenants')
@Index(['subdomain'], { unique: true })
@Index(['domain'], { unique: true })
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 50, unique: true })
  subdomain: string; // e.g., 'acme' for acme.nodeguard.com

  @Column({ length: 255, nullable: true, unique: true })
  domain: string; // Custom domain e.g., 'security.acme.com'

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum',
    enum: ['trial', 'starter', 'professional', 'enterprise'],
    default: 'trial'
  })
  plan: string;

  @Column({ 
    type: 'enum',
    enum: ['active', 'suspended', 'cancelled', 'pending'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'json', nullable: true })
  billing_info: {
    company?: string;
    address?: string;
    tax_id?: string;
    billing_email?: string;
  };

  @Column({ type: 'json' })
  features: {
    max_users: number;
    max_workflows: number;
    max_executions_per_month: number;
    soar_integrations: boolean;
    ai_features: boolean;
    advanced_analytics: boolean;
    custom_nodes: boolean;
    sso_enabled: boolean;
    audit_logs: boolean;
    api_access: boolean;
    white_labeling: boolean;
  };

  @Column({ type: 'json', nullable: true })
  usage_limits: {
    current_users: number;
    current_workflows: number;
    executions_this_month: number;
    storage_used_mb: number;
  };

  @Column({ type: 'json', nullable: true })
  integrations: {
    slack_webhook?: string;
    teams_webhook?: string;
    email_smtp?: {
      host: string;
      port: number;
      username: string;
      password: string;
    };
    syslog_endpoint?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscription_ends_at: Date;

  @Column({ length: 255, nullable: true })
  logo_url: string;

  @Column({ type: 'json', nullable: true })
  branding: {
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
    custom_css?: string;
  };

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => TenantSettings, settings => settings.tenant)
  settings: TenantSettings[];
}