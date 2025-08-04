import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_settings')
@Index(['tenant_id', 'key'], { unique: true })
export class TenantSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ 
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'json'],
    default: 'string'
  })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  is_encrypted: boolean;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant, tenant => tenant.settings)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Helper methods
  getParsedValue(): any {
    switch (this.type) {
      case 'number':
        return parseFloat(this.value);
      case 'boolean':
        return this.value === 'true';
      case 'json':
        return JSON.parse(this.value);
      default:
        return this.value;
    }
  }

  setParsedValue(value: any): void {
    switch (this.type) {
      case 'json':
        this.value = JSON.stringify(value);
        break;
      default:
        this.value = value.toString();
    }
  }
}