import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { BaseTenantRepository } from '../../auth/repositories/base-tenant.repository';
import { ThreatIntelligence, MitreAttackTechnique, ThreatIntelSource } from '../entities/threat-intel.entity';

@Injectable()
export class TenantThreatIntelRepository extends BaseTenantRepository<ThreatIntelligence> {
  constructor(
    @InjectRepository(ThreatIntelligence)
    private threatIntelRepository: Repository<ThreatIntelligence>,
    @Inject('REQUEST') request: Request
  ) {
    super(request);
    Object.setPrototypeOf(this, threatIntelRepository);
    Object.assign(this, threatIntelRepository);
  }

  /**
   * Find threat intelligence by indicator value and type
   */
  async findByIndicator(indicatorValue: string, indicatorType?: string): Promise<ThreatIntelligence[]> {
    const qb = this.createTenantQueryBuilder('threat_intel')
      .where('threat_intel.indicator_value = :indicatorValue', { indicatorValue });
    
    if (indicatorType) {
      qb.andWhere('threat_intel.indicator_type = :indicatorType', { indicatorType });
    }
    
    return qb.getMany();
  }

  /**
   * Find threat intelligence by reputation
   */
  async findByReputation(reputation: string): Promise<ThreatIntelligence[]> {
    return this.createTenantQueryBuilder('threat_intel')
      .where('threat_intel.reputation = :reputation', { reputation })
      .orderBy('threat_intel.confidence', 'DESC')
      .getMany();
  }

  /**
   * Find malicious indicators with high confidence
   */
  async findMaliciousIndicators(minConfidence: number = 0.8): Promise<ThreatIntelligence[]> {
    return this.createTenantQueryBuilder('threat_intel')
      .where('threat_intel.reputation = :reputation', { reputation: 'malicious' })
      .andWhere('threat_intel.confidence >= :minConfidence', { minConfidence })
      .andWhere('threat_intel.is_active = :isActive', { isActive: true })
      .orderBy('threat_intel.confidence', 'DESC')
      .getMany();
  }

  /**
   * Search indicators by partial value
   */
  async searchIndicators(query: string, limit: number = 50): Promise<ThreatIntelligence[]> {
    return this.createTenantQueryBuilder('threat_intel')
      .where('threat_intel.indicator_value LIKE :query', { query: `%${query}%` })
      .andWhere('threat_intel.is_active = :isActive', { isActive: true })
      .limit(limit)
      .orderBy('threat_intel.last_seen', 'DESC')
      .getMany();
  }

  /**
   * Get statistics for current tenant's threat intelligence
   */
  async getThreatIntelStatistics(): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_reputation: Record<string, number>;
    recent_count: number;
  }> {
    const qb = this.createTenantQueryBuilder('threat_intel');
    
    const [total, byType, byReputation, recentCount] = await Promise.all([
      qb.getCount(),
      qb.clone()
        .select('threat_intel.indicator_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('threat_intel.indicator_type')
        .getRawMany(),
      qb.clone()
        .select('threat_intel.reputation', 'reputation')
        .addSelect('COUNT(*)', 'count')
        .groupBy('threat_intel.reputation')
        .getRawMany(),
      qb.clone()
        .where('threat_intel.created_at >= :date', { 
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        })
        .getCount()
    ]);

    return {
      total,
      by_type: byType.reduce((acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }), {}),
      by_reputation: byReputation.reduce((acc, item) => ({ ...acc, [item.reputation]: parseInt(item.count) }), {}),
      recent_count: recentCount
    };
  }

  /**
   * Find expired indicators
   */
  async findExpiredIndicators(): Promise<ThreatIntelligence[]> {
    const now = new Date();
    return this.createTenantQueryBuilder('threat_intel')
      .where('threat_intel.expires_at < :now', { now })
      .andWhere('threat_intel.is_active = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Update indicator reputation and confidence
   */
  async updateIndicatorReputation(
    id: string, 
    reputation: string, 
    confidence: number, 
    source?: string
  ): Promise<ThreatIntelligence> {
    const indicator = await this.findOneWithAccess(id);
    
    if (!indicator) {
      throw new Error('Threat intelligence indicator not found or access denied');
    }

    indicator.reputation = reputation;
    indicator.confidence = confidence;
    indicator.last_seen = new Date();
    
    if (source && indicator.sources) {
      if (!indicator.sources.includes(source)) {
        indicator.sources.push(source);
      }
    }

    return this.save(indicator);
  }
}

@Injectable()
export class TenantMitreAttackRepository extends BaseTenantRepository<MitreAttackTechnique> {
  constructor(
    @InjectRepository(MitreAttackTechnique)
    private mitreRepository: Repository<MitreAttackTechnique>,
    @Inject('REQUEST') request: Request
  ) {
    super(request);
    Object.setPrototypeOf(this, mitreRepository);
    Object.assign(this, mitreRepository);
  }

  /**
   * Find techniques by tactic
   */
  async findByTactic(tactic: string): Promise<MitreAttackTechnique[]> {
    return this.createTenantQueryBuilder('mitre')
      .where('JSON_CONTAINS(mitre.tactics, :tactic)', { tactic: JSON.stringify(tactic) })
      .andWhere('mitre.is_active = :isActive', { isActive: true })
      .orderBy('mitre.technique_id')
      .getMany();
  }

  /**
   * Find technique by ID (e.g., T1190)
   */
  async findByTechniqueId(techniqueId: string): Promise<MitreAttackTechnique | null> {
    return this.findOneBy({ technique_id: techniqueId } as any);
  }

  /**
   * Search techniques by name or description
   */
  async searchTechniques(query: string): Promise<MitreAttackTechnique[]> {
    return this.createTenantQueryBuilder('mitre')
      .where('(mitre.name LIKE :query OR mitre.description LIKE :query)', 
        { query: `%${query}%` })
      .andWhere('mitre.is_active = :isActive', { isActive: true })
      .orderBy('mitre.technique_id')
      .getMany();
  }

  /**
   * Get all tactics for current tenant
   */
  async getAllTactics(): Promise<string[]> {
    const results = await this.createTenantQueryBuilder('mitre')
      .select('mitre.tactics')
      .where('mitre.is_active = :isActive', { isActive: true })
      .getMany();

    const tactics = new Set<string>();
    results.forEach(technique => {
      technique.tactics.forEach(tactic => tactics.add(tactic));
    });

    return Array.from(tactics).sort();
  }
}

@Injectable()
export class TenantThreatIntelSourceRepository extends BaseTenantRepository<ThreatIntelSource> {
  constructor(
    @InjectRepository(ThreatIntelSource)
    private sourceRepository: Repository<ThreatIntelSource>,
    @Inject('REQUEST') request: Request
  ) {
    super(request);
    Object.setPrototypeOf(this, sourceRepository);
    Object.assign(this, sourceRepository);
  }

  /**
   * Find enabled sources
   */
  async findEnabledSources(): Promise<ThreatIntelSource[]> {
    return this.findBy({ is_enabled: true } as any);
  }

  /**
   * Find sources supporting specific indicator types
   */
  async findByIndicatorType(indicatorType: string): Promise<ThreatIntelSource[]> {
    return this.createTenantQueryBuilder('source')
      .where('JSON_CONTAINS(source.supported_indicators, :indicatorType)', 
        { indicatorType: JSON.stringify(indicatorType) })
      .andWhere('source.is_enabled = :isEnabled', { isEnabled: true })
      .orderBy('source.reliability_score', 'DESC')
      .getMany();
  }

  /**
   * Get source statistics
   */
  async getSourceStatistics(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    avg_reliability: number;
  }> {
    const qb = this.createTenantQueryBuilder('source');
    
    const [total, enabled, disabled, avgReliability] = await Promise.all([
      qb.getCount(),
      qb.clone().where('source.is_enabled = :isEnabled', { isEnabled: true }).getCount(),
      qb.clone().where('source.is_enabled = :isEnabled', { isEnabled: false }).getCount(),
      qb.clone()
        .select('AVG(source.reliability_score)', 'avg')
        .where('source.is_enabled = :isEnabled', { isEnabled: true })
        .getRawOne()
    ]);

    return {
      total,
      enabled,
      disabled,
      avg_reliability: parseFloat(avgReliability?.avg || '0')
    };
  }
}