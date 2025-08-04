import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity('workflows')
@Index(['tenant_id'])
@Index(['created_by'])
@Index(['status'])
@Index(['is_active'])
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  workflow_data: {
    nodes: any[];
    edges: any[];
    metadata?: any;
  };

  @Column({ 
    type: 'enum',
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft'
  })
  status: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'json', nullable: true })
  trigger_config: {
    type: 'manual' | 'scheduled' | 'event' | 'webhook';
    config: any;
  };

  @Column({ type: 'json', nullable: true })
  execution_stats: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    last_execution_at?: Date;
    avg_execution_time?: number;
  };

  @Column({ default: 0 })
  version: number;

  @Column({ type: 'uuid', nullable: true })
  parent_workflow_id: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Multi-tenant fields
  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  created_by: string;

  @Column('uuid', { nullable: true })
  updated_by: string;
}