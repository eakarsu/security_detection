import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('workflow_templates')
@Index(['tenant_id'])
@Index(['category'])
@Index(['is_active'])
@Index(['created_at'])
@Index(['category', 'tenant_id'])
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ 
    type: 'enum',
    enum: ['incident-response', 'threat-hunting', 'vulnerability-management', 'compliance', 'forensics', 'monitoring'],
    default: 'incident-response'
  })
  category: string;

  @Column({ type: 'json' })
  workflow_definition: {
    nodes: Array<{
      id: string;
      type: string;
      nodeId: string;
      position: { x: number; y: number };
      config: Record<string, any>;
      data: {
        label: string;
        description?: string;
      };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type?: string;
      animated?: boolean;
    }>;
    metadata: {
      version: string;
      author?: string;
      tags: string[];
      complexity: 'beginner' | 'intermediate' | 'advanced';
      estimated_time?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  default_config: Record<string, any>;

  @Column({ type: 'json' })
  tags: string[];

  @Column({ 
    type: 'enum',
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  })
  complexity: string;

  @Column({ length: 100, nullable: true })
  estimated_time: string;

  @Column({ length: 100, nullable: true })
  author: string;

  @Column({ default: 0 })
  usage_count: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  rating: number;

  @Column({ default: 0 })
  rating_count: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ default: false })
  is_enterprise: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Multi-tenant fields
  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  created_by: string;

  @Column('uuid', { nullable: true })
  updated_by: string;
}