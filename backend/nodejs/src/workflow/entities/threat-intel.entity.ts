import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('threat_intelligence')
@Index(['indicator_value', 'indicator_type'])
@Index(['reputation'])
@Index(['tenant_id'])
export class ThreatIntelligence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  @Index()
  indicator_value: string;

  @Column({ 
    type: 'enum',
    enum: ['ip', 'domain', 'hash', 'url', 'email'],
    default: 'ip'
  })
  indicator_type: string;

  @Column({ 
    type: 'enum',
    enum: ['clean', 'suspicious', 'malicious', 'unknown'],
    default: 'unknown'
  })
  reputation: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  sources: string[];

  @Column({ type: 'json', nullable: true })
  malware_families: string[];

  @Column({ type: 'json', nullable: true })
  threat_actors: string[];

  @Column({ type: 'json', nullable: true })
  geo_location: {
    country?: string;
    city?: string;
    organization?: string;
    asn?: string;
  };

  @Column({ type: 'json', nullable: true })
  external_references: {
    virustotal?: {
      positives: number;
      total: number;
      scan_date: string;
      permalink: string;
    };
    abuseipdb?: {
      abuse_confidence: number;
      usage_type: string;
      isp: string;
    };
    alienvault?: {
      pulse_count: number;
      pulses: any[];
    };
  };

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  first_seen: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  last_seen: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Multi-tenant field
  @Column('uuid')
  tenant_id: string;
}

@Entity('mitre_attack_techniques')
@Index(['tenant_id'])
@Index(['technique_id', 'tenant_id'], { unique: true })
export class MitreAttackTechnique {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  @Index()
  technique_id: string; // e.g., T1190

  @Column({ length: 500 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  tactics: string[];

  @Column({ length: 50 })
  kill_chain_phase: string;

  @Column({ type: 'json', nullable: true })
  mitigations: string[];

  @Column({ type: 'json', nullable: true })
  data_sources: string[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Multi-tenant field
  @Column('uuid')
  tenant_id: string;
}

@Entity('threat_intel_sources')
@Index(['tenant_id'])
@Index(['name', 'tenant_id'], { unique: true })
export class ThreatIntelSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  description: string;

  @Column({ length: 500, nullable: true })
  api_endpoint: string;

  @Column({ length: 500, nullable: true })
  api_key_name: string;

  @Column({ type: 'json', nullable: true })
  supported_indicators: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  reliability_score: number;

  @Column({ default: 5000 })
  timeout_ms: number;

  @Column({ default: 1000 })
  rate_limit_ms: number;

  @Column({ default: true })
  is_enabled: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Multi-tenant field
  @Column('uuid')
  tenant_id: string;
}