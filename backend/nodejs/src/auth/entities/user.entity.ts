import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['tenant_id'])
@Index(['status'])
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 100 })
  first_name: string;

  @Column({ length: 100 })
  last_name: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ 
    type: 'enum',
    enum: ['super_admin', 'tenant_admin', 'analyst', 'viewer'],
    default: 'viewer'
  })
  role: string;

  @Column({ 
    type: 'enum',
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'json', nullable: true })
  permissions: {
    workflows: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
      execute: boolean;
    };
    nodes: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    templates: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    users: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    settings: {
      read: boolean;
      update: boolean;
    };
    analytics: {
      read: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  preferences: {
    theme?: 'light' | 'dark';
    timezone?: string;
    language?: string;
    notifications?: {
      email: boolean;
      browser: boolean;
      workflow_completion: boolean;
      workflow_failure: boolean;
    };
  };

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  @Column({ length: 45, nullable: true })
  last_login_ip: string;

  @Column({ type: 'timestamp', nullable: true })
  email_verified_at: Date;

  @Column({ length: 255, nullable: true })
  email_verification_token: string;

  @Column({ length: 255, nullable: true })
  password_reset_token: string;

  @Column({ type: 'timestamp', nullable: true })
  password_reset_expires_at: Date;

  @Column({ type: 'json', nullable: true })
  mfa_settings: {
    enabled: boolean;
    secret?: string;
    backup_codes?: string[];
  };

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, tenant => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Helper methods
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  hasPermission(resource: string, action: string): boolean {
    if (this.role === 'super_admin') return true;
    if (this.role === 'tenant_admin') return true; // Tenant admins have all permissions within their tenant
    
    return this.permissions?.[resource]?.[action] || false;
  }

  isTenantAdmin(): boolean {
    return this.role === 'tenant_admin';
  }

  isSuperAdmin(): boolean {
    return this.role === 'super_admin';
  }
}