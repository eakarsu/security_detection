import { SecurityNode, SecurityEvent, SecurityResult, SecurityNodeConfig, NodeSchema, ValidationResult } from '../interfaces/security-node.interface';
import { ThreatIntelligenceService } from '../services/threat-intelligence.service';
import { Inject } from '@nestjs/common';

interface ThreatIntelResult {
  reputation: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  confidence: number;
  sources: string[];
  indicators: {
    type: 'ip' | 'domain' | 'hash' | 'url';
    value: string;
    first_seen: string;
    last_seen: string;
    tags: string[];
  }[];
  geo_location?: {
    country?: string;
    city?: string;
    organization?: string;
    asn?: string;
  };
  malware_families?: string[];
  threat_actors?: string[];
}

export class ThreatIntelNode extends SecurityNode {
  id = 'threat-intel-enrichment';
  type = 'threat-intel';
  category = 'integration' as const;
  name = 'Threat Intelligence Enrichment';
  description = 'Enriches security events with threat intelligence data from database';
  version = '1.0.0';

  constructor(
    @Inject(ThreatIntelligenceService)
    private threatIntelService: ThreatIntelligenceService
  ) {
    super();
  }

  async execute(input: SecurityEvent, config: SecurityNodeConfig): Promise<SecurityResult> {
    try {
      const indicators = this.extractIndicators(input);
      const enrichmentResults: ThreatIntelResult[] = [];

      // Prepare API keys from config
      const apiKeys = {
        virustotal: config.virustotal_api_key,
        abuseipdb: config.abuseipdb_api_key,
        alienvault: config.alienvault_api_key
      };

      // Enrich each indicator using database-backed service
      for (const indicator of indicators) {
        try {
          const threatIntel = await this.threatIntelService.enrichIndicator(
            indicator.value,
            indicator.type as any,
            apiKeys
          );

          if (threatIntel) {
            enrichmentResults.push({
              reputation: threatIntel.reputation as any,
              confidence: threatIntel.confidence,
              sources: threatIntel.sources || [],
              indicators: [{
                type: threatIntel.indicator_type as any,
                value: threatIntel.indicator_value,
                first_seen: threatIntel.first_seen?.toISOString() || new Date().toISOString(),
                last_seen: threatIntel.last_seen?.toISOString() || new Date().toISOString(),
                tags: threatIntel.tags || []
              }],
              geo_location: threatIntel.geo_location,
              malware_families: threatIntel.malware_families,
              threat_actors: threatIntel.threat_actors
            });
          }
        } catch (error) {
          console.warn(`Failed to enrich indicator ${indicator.value}:`, error.message);
        }
      }

      // Aggregate results
      const aggregatedResult = this.aggregateResults(enrichmentResults);
      
      return this.createResult(true, {
        ...aggregatedResult,
        enriched_indicators: indicators.length,
        processing_time: Date.now()
      }, {
        confidence: aggregatedResult.confidence,
        recommendations: this.generateThreatRecommendations(aggregatedResult)
      });

    } catch (error) {
      return this.createResult(false, null, {
        error: `Threat intelligence enrichment failed: ${error.message}`
      });
    }
  }

  configure(params: SecurityNodeConfig): ValidationResult {
    const schema = this.getSchema();
    return this.validateConfig(params, schema);
  }

  getSchema(): NodeSchema {
    return {
      inputs: [
        {
          name: 'source_ip',
          type: 'string',
          required: false,
          description: 'Source IP address to enrich'
        },
        {
          name: 'destination_ip',
          type: 'string',
          required: false,
          description: 'Destination IP address to enrich'
        },
        {
          name: 'domain',
          type: 'string',
          required: false,
          description: 'Domain name to enrich'
        },
        {
          name: 'file_hash',
          type: 'string',
          required: false,
          description: 'File hash to enrich'
        }
      ],
      outputs: [
        {
          name: 'reputation',
          type: 'string',
          description: 'Overall reputation (clean/suspicious/malicious/unknown)'
        },
        {
          name: 'confidence',
          type: 'number',
          description: 'Confidence score (0-1)'
        },
        {
          name: 'indicators',
          type: 'array',
          description: 'Enriched threat indicators'
        },
        {
          name: 'malware_families',
          type: 'array',
          description: 'Associated malware families'
        },
        {
          name: 'threat_actors',
          type: 'array',
          description: 'Associated threat actors'
        }
      ],
      config: [
        {
          name: 'virustotal_api_key',
          type: 'string',
          required: false,
          description: 'VirusTotal API key'
        },
        {
          name: 'abuseipdb_api_key',
          type: 'string',
          required: false,
          description: 'AbuseIPDB API key'
        },
        {
          name: 'alienvault_api_key',
          type: 'string',
          required: false,
          description: 'AlienVault OTX API key'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          default: 5000,
          description: 'Timeout for API calls (ms)'
        },
        {
          name: 'enable_geolocation',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include geolocation data'
        },
        {
          name: 'sources',
          type: 'select',
          required: false,
          default: 'all',
          options: ['all', 'virustotal', 'alienvault', 'emergingthreats'],
          description: 'Threat intelligence sources to query'
        }
      ]
    };
  }

  private extractIndicators(input: SecurityEvent): Array<{type: string, value: string}> {
    const indicators = [];
    
    if (input.source_ip) {
      indicators.push({ type: 'ip', value: input.source_ip });
    }
    
    if (input.destination_ip) {
      indicators.push({ type: 'ip', value: input.destination_ip });
    }
    
    if (input.domain) {
      indicators.push({ type: 'domain', value: input.domain });
    }
    
    if (input.file_hash) {
      indicators.push({ type: 'hash', value: input.file_hash });
    }

    return indicators;
  }


  private aggregateResults(results: ThreatIntelResult[]): ThreatIntelResult {
    if (results.length === 0) {
      return {
        reputation: 'unknown',
        confidence: 0.1,
        sources: [],
        indicators: []
      };
    }

    // Determine overall reputation (most severe wins)
    const reputationPriority = { 'malicious': 4, 'suspicious': 3, 'unknown': 2, 'clean': 1 };
    const worstReputation = results.reduce((worst, current) => 
      reputationPriority[current.reputation] > reputationPriority[worst.reputation] ? current : worst
    );

    // Aggregate confidence (weighted average)
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // Combine all sources and indicators
    const allSources = [...new Set(results.flatMap(r => r.sources))];
    const allIndicators = results.flatMap(r => r.indicators);
    const allMalwareFamilies = [...new Set(results.flatMap(r => r.malware_families || []))];
    const allThreatActors = [...new Set(results.flatMap(r => r.threat_actors || []))];

    return {
      reputation: worstReputation.reputation,
      confidence: avgConfidence,
      sources: allSources,
      indicators: allIndicators,
      malware_families: allMalwareFamilies.length > 0 ? allMalwareFamilies : undefined,
      threat_actors: allThreatActors.length > 0 ? allThreatActors : undefined
    };
  }

  private generateThreatRecommendations(result: ThreatIntelResult): string[] {
    const recommendations = [];

    switch (result.reputation) {
      case 'malicious':
        recommendations.push('IMMEDIATE ACTION REQUIRED: Block all traffic from this indicator');
        recommendations.push('Add to threat hunting queries');
        recommendations.push('Review related network connections');
        if (result.malware_families?.length) {
          recommendations.push(`Scan for ${result.malware_families.join(', ')} malware`);
        }
        break;
        
      case 'suspicious':
        recommendations.push('Monitor closely for additional suspicious activity');
        recommendations.push('Consider temporary blocking pending investigation');
        recommendations.push('Add to watch list');
        break;
        
      case 'unknown':
        recommendations.push('Investigate further - insufficient threat intelligence');
        recommendations.push('Monitor for patterns of behavior');
        break;
        
      case 'clean':
        recommendations.push('No immediate action required');
        recommendations.push('Continue monitoring as part of normal operations');
        break;
    }

    if (result.confidence < 0.5) {
      recommendations.push('Low confidence - seek additional intelligence sources');
    }

    return recommendations;
  }
}