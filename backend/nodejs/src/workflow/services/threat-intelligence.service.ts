import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreatIntelligence, MitreAttackTechnique, ThreatIntelSource } from '../entities/threat-intel.entity';
import axios from 'axios';

interface ThreatIntelQueryResult {
  reputation: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  confidence: number;
  sources: string[];
  geo_location?: {
    country?: string;
    city?: string;
    organization?: string;
    asn?: string;
  };
  external_references?: any;
  malware_families?: string[];
  threat_actors?: string[];
  description?: string;
  tags?: string[];
}

@Injectable()
export class ThreatIntelligenceService {
  constructor(
    @InjectRepository(ThreatIntelligence)
    private threatIntelRepo: Repository<ThreatIntelligence>,
    
    @InjectRepository(MitreAttackTechnique)
    private mitreRepo: Repository<MitreAttackTechnique>,
    
    @InjectRepository(ThreatIntelSource)
    private sourceRepo: Repository<ThreatIntelSource>
  ) {}

  async enrichIndicator(
    indicator_value: string,
    indicator_type: 'ip' | 'domain' | 'hash' | 'url' | 'email',
    apiKeys?: { virustotal?: string; abuseipdb?: string; alienvault?: string }
  ): Promise<ThreatIntelligence> {
    
    // Check if we already have recent data for this indicator
    const existingIntel = await this.threatIntelRepo.findOne({
      where: { 
        indicator_value, 
        indicator_type,
        is_active: true 
      },
      order: { last_seen: 'DESC' }
    });

    // If we have recent data (less than 24 hours old), return it
    if (existingIntel && this.isRecentData(existingIntel.last_seen)) {
      await this.threatIntelRepo.update(existingIntel.id, {
        last_seen: new Date()
      });
      return existingIntel;
    }

    // Otherwise, fetch fresh data from external sources
    const enrichmentResult = await this.fetchThreatIntel(indicator_value, indicator_type, apiKeys);
    
    // Save or update the threat intelligence data
    const threatIntel = await this.saveThreatIntel(indicator_value, indicator_type, enrichmentResult);
    
    return threatIntel;
  }

  private async fetchThreatIntel(
    indicator_value: string,
    indicator_type: string,
    apiKeys?: { virustotal?: string; abuseipdb?: string; alienvault?: string }
  ): Promise<ThreatIntelQueryResult> {
    
    const results = [];
    const sources = await this.getEnabledSources();

    // Query each enabled source
    for (const source of sources) {
      try {
        let result = null;
        
        switch (source.name.toLowerCase()) {
          case 'virustotal':
            if (apiKeys?.virustotal) {
              result = await this.queryVirusTotal(indicator_value, indicator_type, apiKeys.virustotal, source.timeout_ms);
            }
            break;
            
          case 'abuseipdb':
            if (apiKeys?.abuseipdb && indicator_type === 'ip') {
              result = await this.queryAbuseIPDB(indicator_value, apiKeys.abuseipdb, source.timeout_ms);
            }
            break;
            
          case 'alienvault':
            if (apiKeys?.alienvault) {
              result = await this.queryAlienVault(indicator_value, indicator_type, apiKeys.alienvault, source.timeout_ms);
            }
            break;
            
          default:
            // Handle custom sources
            if (source.api_endpoint) {
              result = await this.queryCustomSource(indicator_value, indicator_type, source);
            }
        }

        if (result) {
          results.push({ ...result, source: source.name, reliability: source.reliability_score });
        }

        // Rate limiting
        if (source.rate_limit_ms > 0) {
          await new Promise(resolve => setTimeout(resolve, source.rate_limit_ms));
        }

      } catch (error) {
        console.warn(`Failed to query ${source.name} for ${indicator_value}:`, error.message);
      }
    }

    // Aggregate results from multiple sources
    return this.aggregateThreatIntelResults(results);
  }

  private async queryVirusTotal(
    indicator_value: string,
    indicator_type: string,
    apiKey: string,
    timeout: number
  ): Promise<ThreatIntelQueryResult | null> {
    
    try {
      let endpoint = '';
      const params = new URLSearchParams({ apikey: apiKey });

      switch (indicator_type) {
        case 'ip':
          endpoint = 'https://www.virustotal.com/vtapi/v2/ip-address/report';
          params.append('ip', indicator_value);
          break;
        case 'domain':
          endpoint = 'https://www.virustotal.com/vtapi/v2/domain/report';
          params.append('domain', indicator_value);
          break;
        case 'hash':
          endpoint = 'https://www.virustotal.com/vtapi/v2/file/report';
          params.append('resource', indicator_value);
          break;
        default:
          return null;
      }

      const response = await axios.get(`${endpoint}?${params.toString()}`, {
        timeout,
        headers: { 'User-Agent': 'NodeGuard-Security-Platform' }
      });

      const data = response.data;
      
      if (data.response_code === 1) {
        const positives = data.positives || 0;
        const total = data.total || 1;
        const detectionRatio = positives / total;
        
        let reputation: 'clean' | 'suspicious' | 'malicious' = 'clean';
        let confidence = 0.9;
        
        if (detectionRatio > 0.5) {
          reputation = 'malicious';
          confidence = Math.min(0.95, 0.7 + detectionRatio * 0.3);
        } else if (detectionRatio > 0.1) {
          reputation = 'suspicious';
          confidence = 0.7;
        }

        return {
          reputation,
          confidence,
          sources: ['VirusTotal'],
          external_references: {
            virustotal: {
              positives,
              total,
              scan_date: data.scan_date || new Date().toISOString(),
              permalink: data.permalink || ''
            }
          },
          malware_families: data.scans ? this.extractMalwareFamilies(data.scans) : undefined,
          tags: data.scans ? Object.keys(data.scans).filter(engine => data.scans[engine].detected).slice(0, 10) : []
        };
      }
      
      return null;
    } catch (error) {
      console.warn('VirusTotal API error:', error.message);
      return null;
    }
  }

  private async queryAbuseIPDB(
    ip: string,
    apiKey: string, 
    timeout: number
  ): Promise<ThreatIntelQueryResult | null> {
    
    try {
      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        headers: {
          'Key': apiKey,
          'Accept': 'application/json'
        },
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        },
        timeout
      });

      const data = response.data.data;
      
      if (data) {
        const abuseConfidence = data.abuseConfidencePercentage || 0;
        let reputation: 'clean' | 'suspicious' | 'malicious' = 'clean';
        let confidence = 0.8;
        
        if (abuseConfidence > 75) {
          reputation = 'malicious';
          confidence = 0.9;
        } else if (abuseConfidence > 25) {
          reputation = 'suspicious';
          confidence = 0.7;
        }

        return {
          reputation,
          confidence,
          sources: ['AbuseIPDB'],
          geo_location: {
            country: data.countryCode || 'Unknown',
            organization: data.isp || 'Unknown'
          },
          external_references: {
            abuseipdb: {
              abuse_confidence: abuseConfidence,
              usage_type: data.usageType || 'Unknown',
              isp: data.isp || 'Unknown'
            }
          },
          tags: data.usageType ? [data.usageType] : []
        };
      }
      
      return null;
    } catch (error) {
      console.warn('AbuseIPDB API error:', error.message);
      return null;
    }
  }

  private async queryAlienVault(
    indicator_value: string,
    indicator_type: string,
    apiKey: string,
    timeout: number
  ): Promise<ThreatIntelQueryResult | null> {
    
    try {
      let endpoint = '';
      
      switch (indicator_type) {
        case 'ip':
          endpoint = `https://otx.alienvault.com/api/v1/indicators/IPv4/${indicator_value}/general`;
          break;
        case 'domain':
          endpoint = `https://otx.alienvault.com/api/v1/indicators/domain/${indicator_value}/general`;
          break;
        case 'hash':
          endpoint = `https://otx.alienvault.com/api/v1/indicators/file/${indicator_value}/general`;
          break;
        default:
          return null;
      }

      const response = await axios.get(endpoint, {
        headers: {
          'X-OTX-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        timeout
      });

      const data = response.data;
      
      if (data) {
        const pulseCount = data.pulse_info?.count || 0;
        let reputation: 'clean' | 'suspicious' | 'malicious' = 'clean';
        let confidence = 0.8;
        
        if (pulseCount > 5) {
          reputation = 'malicious';
          confidence = 0.85;
        } else if (pulseCount > 0) {
          reputation = 'suspicious';
          confidence = 0.7;
        }

        const malwareFamilies = data.pulse_info?.pulses ? 
          data.pulse_info.pulses.map(p => p.malware_families).flat().filter(Boolean) : [];

        return {
          reputation,
          confidence,
          sources: ['AlienVault OTX'],
          external_references: {
            alienvault: {
              pulse_count: pulseCount,
              pulses: data.pulse_info?.pulses?.slice(0, 5) || []
            }
          },
          malware_families: malwareFamilies.length > 0 ? malwareFamilies : undefined,
          tags: data.pulse_info?.pulses?.map(p => p.name).slice(0, 10) || []
        };
      }
      
      return null;
    } catch (error) {
      console.warn('AlienVault OTX API error:', error.message);
      return null;
    }
  }

  private async queryCustomSource(
    indicator_value: string,
    indicator_type: string,
    source: ThreatIntelSource
  ): Promise<ThreatIntelQueryResult | null> {
    
    try {
      if (!source.api_endpoint || !source.supported_indicators?.includes(indicator_type)) {
        return null;
      }

      // Basic HTTP request to custom endpoint
      const response = await axios.get(source.api_endpoint, {
        params: {
          indicator: indicator_value,
          type: indicator_type
        },
        timeout: source.timeout_ms
      });

      // Basic parsing - this would need to be customized per source
      const data = response.data;
      
      return {
        reputation: data.reputation || 'unknown',
        confidence: Math.min(data.confidence || 0.5, source.reliability_score),
        sources: [source.name],
        description: data.description,
        tags: data.tags || []
      };
      
    } catch (error) {
      console.warn(`Custom source ${source.name} API error:`, error.message);
      return null;
    }
  }

  private aggregateThreatIntelResults(results: any[]): ThreatIntelQueryResult {
    if (results.length === 0) {
      return {
        reputation: 'unknown',
        confidence: 0.1,
        sources: ['no_data']
      };
    }

    // Determine overall reputation (most severe wins)
    const reputationPriority = { 'malicious': 4, 'suspicious': 3, 'unknown': 2, 'clean': 1 };
    const worstResult = results.reduce((worst, current) => 
      reputationPriority[current.reputation] > reputationPriority[worst.reputation] ? current : worst
    );

    // Weighted average confidence based on source reliability
    const weightedConfidence = results.reduce((sum, r) => {
      const weight = r.reliability || 0.5;
      return sum + (r.confidence * weight);
    }, 0) / results.reduce((sum, r) => sum + (r.reliability || 0.5), 0);

    // Combine all data
    const allSources = [...new Set(results.flatMap(r => r.sources))];
    const allMalwareFamilies = [...new Set(results.flatMap(r => r.malware_families || []))];
    const allThreatActors = [...new Set(results.flatMap(r => r.threat_actors || []))];
    const allTags = [...new Set(results.flatMap(r => r.tags || []))];

    // Merge external references
    const external_references = {};
    results.forEach(r => {
      if (r.external_references) {
        Object.assign(external_references, r.external_references);
      }
    });

    // Use geo location from the most reliable source
    const geoResult = results.find(r => r.geo_location && r.reliability > 0.7);

    return {
      reputation: worstResult.reputation,
      confidence: Math.min(weightedConfidence, 1.0),
      sources: allSources,
      geo_location: geoResult?.geo_location,
      external_references: Object.keys(external_references).length > 0 ? external_references : undefined,
      malware_families: allMalwareFamilies.length > 0 ? allMalwareFamilies : undefined,
      threat_actors: allThreatActors.length > 0 ? allThreatActors : undefined,
      tags: allTags.length > 0 ? allTags : undefined
    };
  }

  private async saveThreatIntel(
    indicator_value: string,
    indicator_type: 'ip' | 'domain' | 'hash' | 'url' | 'email',
    enrichmentResult: ThreatIntelQueryResult
  ): Promise<ThreatIntelligence> {
    
    // Check if record exists
    let threatIntel = await this.threatIntelRepo.findOne({
      where: { indicator_value, indicator_type }
    });

    const now = new Date();

    if (threatIntel) {
      // Update existing record
      await this.threatIntelRepo.update(threatIntel.id, {
        reputation: enrichmentResult.reputation,
        confidence: enrichmentResult.confidence,
        sources: enrichmentResult.sources,
        malware_families: enrichmentResult.malware_families,
        threat_actors: enrichmentResult.threat_actors,
        geo_location: enrichmentResult.geo_location,
        external_references: enrichmentResult.external_references,
        description: enrichmentResult.description,
        tags: enrichmentResult.tags,
        last_seen: now,
        updated_at: now
      });

      return await this.threatIntelRepo.findOne({ where: { id: threatIntel.id } });
    } else {
      // Create new record
      threatIntel = this.threatIntelRepo.create({
        indicator_value,
        indicator_type,
        reputation: enrichmentResult.reputation,
        confidence: enrichmentResult.confidence,
        sources: enrichmentResult.sources,
        malware_families: enrichmentResult.malware_families,
        threat_actors: enrichmentResult.threat_actors,
        geo_location: enrichmentResult.geo_location,
        external_references: enrichmentResult.external_references,
        description: enrichmentResult.description,
        tags: enrichmentResult.tags,
        first_seen: now,
        last_seen: now,
        is_active: true
      });

      return await this.threatIntelRepo.save(threatIntel);
    }
  }

  async getMitreAttackTechniques(threatType?: string): Promise<MitreAttackTechnique[]> {
    const query = this.mitreRepo.createQueryBuilder('technique')
      .where('technique.is_active = :active', { active: true });
    
    if (threatType) {
      query.andWhere('technique.tactics LIKE :threatType', { threatType: `%${threatType}%` });
    }
    
    return await query.orderBy('technique.technique_id', 'ASC').getMany();
  }

  async getEnabledSources(): Promise<ThreatIntelSource[]> {
    return await this.sourceRepo.find({
      where: { is_enabled: true },
      order: { reliability_score: 'DESC' }
    });
  }

  async addThreatIntelSource(sourceData: Partial<ThreatIntelSource>): Promise<ThreatIntelSource> {
    const source = this.sourceRepo.create(sourceData);
    return await this.sourceRepo.save(source);
  }

  async searchThreatIntel(
    indicator_value?: string,
    indicator_type?: string,
    reputation?: string,
    limit: number = 50
  ): Promise<ThreatIntelligence[]> {
    
    const query = this.threatIntelRepo.createQueryBuilder('ti')
      .where('ti.is_active = :active', { active: true });

    if (indicator_value) {
      query.andWhere('ti.indicator_value LIKE :value', { value: `%${indicator_value}%` });
    }

    if (indicator_type) {
      query.andWhere('ti.indicator_type = :type', { type: indicator_type });
    }

    if (reputation) {
      query.andWhere('ti.reputation = :reputation', { reputation });
    }

    return await query
      .orderBy('ti.last_seen', 'DESC')
      .limit(limit)
      .getMany();
  }

  private isRecentData(lastSeen: Date): boolean {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastSeen > twentyFourHoursAgo;
  }

  private extractMalwareFamilies(scans: any): string[] {
    const families = new Set<string>();
    
    for (const [engine, result] of Object.entries(scans as any)) {
      if (result && (result as any).detected && (result as any).result) {
        const malwareName = (result as any).result;
        const family = malwareName.split(/[./\\s]/)[0];
        if (family && family.length > 2) {
          families.add(family);
        }
      }
    }
    
    return Array.from(families);
  }
}