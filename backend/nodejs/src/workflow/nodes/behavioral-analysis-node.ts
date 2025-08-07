import { Injectable } from '@nestjs/common';
import { SecurityNode } from '../interfaces/security-node.interface';

export interface BehavioralConfig {
  analysisType: 'user' | 'entity' | 'network' | 'application';
  timeWindow: number; // hours
  baselinePeriod: number; // days
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  anomalyThreshold: number;
  enableMLDetection: boolean;
  enableRuleBasedDetection: boolean;
  enableStatisticalDetection: boolean;
  trackLoginPatterns: boolean;
  trackDataAccess: boolean;
  trackNetworkTraffic: boolean;
  trackApplicationUsage: boolean;
  alertOnDeviation: boolean;
}

export interface BehavioralInput {
  entityId: string;
  entityType: 'user' | 'host' | 'application' | 'service';
  events: Array<{
    timestamp: Date;
    eventType: string;
    source: string;
    details: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  baseline?: {
    period: { start: Date; end: Date };
    patterns: Record<string, any>;
  };
  analysisId?: string;
}

export interface BehavioralResult {
  analysisId: string;
  entityId: string;
  entityType: string;
  analysisTime: Date;
  analysisWindow: { start: Date; end: Date };
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isAnomalous: boolean;
  confidence: number;
  
  patterns: {
    baseline: {
      loginTimes: number[];
      accessLocations: string[];
      dataVolume: { avg: number; std: number };
      applicationUsage: Record<string, number>;
      networkConnections: string[];
    };
    current: {
      loginTimes: number[];
      accessLocations: string[];
      dataVolume: { avg: number; std: number };
      applicationUsage: Record<string, number>;
      networkConnections: string[];
    };
  };
  
  anomalies: Array<{
    id: string;
    type: 'temporal' | 'spatial' | 'volumetric' | 'access_pattern' | 'privilege_escalation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string[];
    confidence: number;
    riskImpact: number;
    detectionMethod: 'ml' | 'rule' | 'statistical';
    timestamp: Date;
    relatedEvents: string[];
  }>;
  
  indicators: Array<{
    indicator: string;
    value: number;
    threshold: number;
    status: 'normal' | 'suspicious' | 'anomalous';
    trend: 'increasing' | 'decreasing' | 'stable';
    description: string;
  }>;
  
  predictions: {
    riskTrend: 'increasing' | 'decreasing' | 'stable';
    nextLikelyAction: string;
    timeToNextAnomaly?: number; // hours
    recommendedActions: string[];
  };
  
  recommendations: string[];
  relatedEntities: string[];
}

@Injectable()
export class BehavioralAnalysisNode extends SecurityNode {
  id = 'behavioral-analysis';
  type = 'analysis';
  category = 'ai-ml' as const;
  name = 'Behavioral Analysis';
  description = 'Advanced behavioral analysis using machine learning to detect anomalous user and entity behavior';
  version = '2.0.0';

  getSchema() {
    return {
      inputs: [
        {
          name: 'entity_events',
          type: 'array' as const,
          required: true,
          description: 'Events and activities for behavioral analysis'
        },
        {
          name: 'entity_id',
          type: 'string' as const,
          required: true,
          description: 'Unique identifier for the entity being analyzed'
        },
        {
          name: 'baseline_data',
          type: 'object' as const,
          required: false,
          description: 'Historical baseline data for comparison'
        }
      ],
      outputs: [
        {
          name: 'analysis_result',
          type: 'object' as const,
          description: 'Comprehensive behavioral analysis results'
        },
        {
          name: 'risk_score',
          type: 'number' as const,
          description: 'Behavioral risk score (0-100)'
        },
        {
          name: 'anomalies',
          type: 'array' as const,
          description: 'Detected behavioral anomalies'
        },
        {
          name: 'is_threat',
          type: 'boolean' as const,
          description: 'Whether behavior indicates potential threat'
        }
      ],
      config: [
        {
          name: 'analysisType',
          type: 'select' as const,
          required: false,
          default: 'user',
          options: ['user', 'entity', 'network', 'application'],
          description: 'Type of behavioral analysis to perform'
        },
        {
          name: 'timeWindow',
          type: 'number' as const,
          required: false,
          default: 24,
          description: 'Analysis time window in hours'
        },
        {
          name: 'baselinePeriod',
          type: 'number' as const,
          required: false,
          default: 30,
          description: 'Baseline period in days'
        },
        {
          name: 'sensitivityLevel',
          type: 'select' as const,
          required: false,
          default: 'medium',
          options: ['low', 'medium', 'high', 'critical'],
          description: 'Sensitivity level for anomaly detection'
        },
        {
          name: 'anomalyThreshold',
          type: 'number' as const,
          required: false,
          default: 0.7,
          description: 'Threshold for anomaly detection (0.0-1.0)'
        },
        {
          name: 'enableMLDetection',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable machine learning-based detection'
        },
        {
          name: 'enableRuleBasedDetection',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable rule-based anomaly detection'
        },
        {
          name: 'enableStatisticalDetection',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Enable statistical anomaly detection'
        },
        {
          name: 'trackLoginPatterns',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Track login time and location patterns'
        },
        {
          name: 'trackDataAccess',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Track data access patterns'
        },
        {
          name: 'trackNetworkTraffic',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Track network traffic patterns'
        },
        {
          name: 'trackApplicationUsage',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Track application usage patterns'
        },
        {
          name: 'alertOnDeviation',
          type: 'boolean' as const,
          required: false,
          default: true,
          description: 'Generate alerts on significant deviations'
        }
      ]
    };
  }

  async execute(input: BehavioralInput, config: BehavioralConfig): Promise<BehavioralResult> {
    const analysisId = input.analysisId || `behavioral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`Starting behavioral analysis ${analysisId} for entity ${input.entityId}`);
      
      // Define analysis window
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (config.timeWindow * 60 * 60 * 1000));
      
      // Filter events within analysis window
      const windowEvents = input.events.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );

      // Build baseline if not provided
      const baseline = input.baseline || await this.buildBaseline(input.entityId, config);
      
      // Extract current patterns
      const currentPatterns = await this.extractPatterns(windowEvents, config);
      
      // Detect anomalies using multiple methods
      const anomalies = await this.detectAnomalies(
        baseline.patterns, 
        currentPatterns, 
        windowEvents, 
        config
      );
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(anomalies, currentPatterns, config);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Generate behavioral indicators
      const indicators = this.generateIndicators(baseline.patterns, currentPatterns, config);
      
      // Make predictions
      const predictions = await this.generatePredictions(currentPatterns, anomalies, windowEvents);
      
      // Find related entities
      const relatedEntities = await this.findRelatedEntities(input.entityId, windowEvents);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(anomalies, riskLevel, predictions);

      const result: BehavioralResult = {
        analysisId,
        entityId: input.entityId,
        entityType: input.entityType,
        analysisTime: new Date(),
        analysisWindow: { start: startTime, end: endTime },
        riskScore,
        riskLevel,
        isAnomalous: anomalies.length > 0 && riskScore >= (config.anomalyThreshold * 100),
        confidence: this.calculateConfidence(anomalies, windowEvents.length),
        patterns: {
          baseline: baseline.patterns,
          current: currentPatterns
        },
        anomalies,
        indicators,
        predictions,
        recommendations,
        relatedEntities
      };

      console.log(`Behavioral analysis ${analysisId} completed. Risk Score: ${riskScore}, Anomalies: ${anomalies.length}`);
      return result;

    } catch (error) {
      throw new Error(`Behavioral analysis failed: ${error.message}`);
    }
  }

  private async buildBaseline(entityId: string, config: BehavioralConfig) {
    // Simulate baseline construction from historical data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (config.baselinePeriod * 24 * 60 * 60 * 1000));
    
    return {
      period: { start: startDate, end: endDate },
      patterns: {
        loginTimes: [8, 9, 10, 17, 18], // Hour of day
        accessLocations: ['Office_Building_A', 'VPN_Home'],
        dataVolume: { avg: 150, std: 25 }, // MB
        applicationUsage: {
          'email': 120, // minutes per day
          'crm': 90,
          'file_sharing': 45,
          'web_browser': 180
        },
        networkConnections: ['192.168.1.0/24', 'external_api.company.com']
      }
    };
  }

  private async extractPatterns(events: BehavioralInput['events'], config: BehavioralConfig) {
    const patterns = {
      loginTimes: [] as number[],
      accessLocations: [] as string[],
      dataVolume: { avg: 0, std: 0 },
      applicationUsage: {} as Record<string, number>,
      networkConnections: [] as string[]
    };

    // Extract login patterns
    if (config.trackLoginPatterns) {
      const loginEvents = events.filter(e => e.eventType === 'login' || e.eventType === 'authentication');
      patterns.loginTimes = loginEvents.map(e => e.timestamp.getHours());
      patterns.accessLocations = [...new Set(loginEvents.map(e => e.details.location || 'unknown'))];
    }

    // Extract data volume patterns
    if (config.trackDataAccess) {
      const dataEvents = events.filter(e => e.eventType === 'data_access' || e.eventType === 'file_download');
      const volumes = dataEvents.map(e => e.details.size || 0);
      patterns.dataVolume.avg = volumes.reduce((a, b) => a + b, 0) / Math.max(volumes.length, 1);
      patterns.dataVolume.std = this.calculateStandardDeviation(volumes);
    }

    // Extract application usage
    if (config.trackApplicationUsage) {
      const appEvents = events.filter(e => e.eventType === 'application_access');
      appEvents.forEach(event => {
        const app = event.details.application;
        const duration = event.details.duration || 1;
        patterns.applicationUsage[app] = (patterns.applicationUsage[app] || 0) + duration;
      });
    }

    // Extract network patterns
    if (config.trackNetworkTraffic) {
      const networkEvents = events.filter(e => e.eventType === 'network_connection');
      patterns.networkConnections = [...new Set(networkEvents.map(e => e.details.destination))];
    }

    return patterns;
  }

  private async detectAnomalies(
    baseline: any, 
    current: any, 
    events: BehavioralInput['events'], 
    config: BehavioralConfig
  ): Promise<BehavioralResult['anomalies']> {
    const anomalies: BehavioralResult['anomalies'] = [];

    // 1. Machine Learning Detection
    if (config.enableMLDetection) {
      const mlAnomalies = await this.detectMLAnomalies(baseline, current, events, config);
      anomalies.push(...mlAnomalies);
    }

    // 2. Rule-based Detection
    if (config.enableRuleBasedDetection) {
      const ruleAnomalies = await this.detectRuleBasedAnomalies(baseline, current, events, config);
      anomalies.push(...ruleAnomalies);
    }

    // 3. Statistical Detection
    if (config.enableStatisticalDetection) {
      const statAnomalies = await this.detectStatisticalAnomalies(baseline, current, config);
      anomalies.push(...statAnomalies);
    }

    return anomalies;
  }

  private async detectMLAnomalies(baseline: any, current: any, events: BehavioralInput['events'], config: BehavioralConfig) {
    const anomalies: BehavioralResult['anomalies'] = [];

    // Simulate ML-based anomaly detection
    if (this.calculateDeviation(baseline.loginTimes, current.loginTimes) > config.anomalyThreshold) {
      anomalies.push({
        id: `ml_temporal_${Date.now()}`,
        type: 'temporal',
        severity: 'medium',
        description: 'Unusual login time pattern detected',
        evidence: [`Current login times: ${current.loginTimes.join(', ')}`, `Baseline: ${baseline.loginTimes.join(', ')}`],
        confidence: 0.85,
        riskImpact: 15,
        detectionMethod: 'ml',
        timestamp: new Date(),
        relatedEvents: events.filter(e => e.eventType === 'login').map(e => e.source)
      });
    }

    // Check for unusual data access volumes
    if (current.dataVolume.avg > baseline.dataVolume.avg + (2 * baseline.dataVolume.std)) {
      anomalies.push({
        id: `ml_volumetric_${Date.now()}`,
        type: 'volumetric',
        severity: 'high',
        description: 'Unusual data access volume detected',
        evidence: [`Current volume: ${current.dataVolume.avg}MB`, `Baseline: ${baseline.dataVolume.avg}±${baseline.dataVolume.std}MB`],
        confidence: 0.9,
        riskImpact: 25,
        detectionMethod: 'ml',
        timestamp: new Date(),
        relatedEvents: events.filter(e => e.eventType === 'data_access').map(e => e.source)
      });
    }

    return anomalies;
  }

  private async detectRuleBasedAnomalies(baseline: any, current: any, events: BehavioralInput['events'], config: BehavioralConfig) {
    const anomalies: BehavioralResult['anomalies'] = [];

    // Rule 1: Off-hours access
    const offHoursLogins = current.loginTimes.filter(hour => hour < 6 || hour > 22);
    if (offHoursLogins.length > 0) {
      anomalies.push({
        id: `rule_offhours_${Date.now()}`,
        type: 'temporal',
        severity: 'medium',
        description: 'Off-hours access detected',
        evidence: [`Login times: ${offHoursLogins.join(', ')}`],
        confidence: 0.8,
        riskImpact: 20,
        detectionMethod: 'rule',
        timestamp: new Date(),
        relatedEvents: events.filter(e => e.eventType === 'login' && offHoursLogins.includes(e.timestamp.getHours())).map(e => e.source)
      });
    }

    // Rule 2: New location access
    const newLocations = current.accessLocations.filter(loc => !baseline.accessLocations.includes(loc));
    if (newLocations.length > 0) {
      anomalies.push({
        id: `rule_location_${Date.now()}`,
        type: 'spatial',
        severity: 'high',
        description: 'Access from new locations detected',
        evidence: [`New locations: ${newLocations.join(', ')}`],
        confidence: 0.9,
        riskImpact: 30,
        detectionMethod: 'rule',
        timestamp: new Date(),
        relatedEvents: events.filter(e => newLocations.includes(e.details.location)).map(e => e.source)
      });
    }

    // Rule 3: Privilege escalation attempts
    const privilegeEvents = events.filter(e => e.eventType === 'privilege_change' || e.eventType === 'admin_access');
    if (privilegeEvents.length > 0) {
      anomalies.push({
        id: `rule_privilege_${Date.now()}`,
        type: 'privilege_escalation',
        severity: 'critical',
        description: 'Privilege escalation attempts detected',
        evidence: [`${privilegeEvents.length} privilege escalation events`],
        confidence: 0.95,
        riskImpact: 40,
        detectionMethod: 'rule',
        timestamp: new Date(),
        relatedEvents: privilegeEvents.map(e => e.source)
      });
    }

    return anomalies;
  }

  private async detectStatisticalAnomalies(baseline: any, current: any, config: BehavioralConfig) {
    const anomalies: BehavioralResult['anomalies'] = [];

    // Z-score based detection for application usage
    Object.keys(current.applicationUsage).forEach(app => {
      const currentUsage = current.applicationUsage[app];
      const baselineUsage = baseline.applicationUsage[app] || 0;
      const zScore = Math.abs(currentUsage - baselineUsage) / Math.max(baselineUsage * 0.1, 1);
      
      if (zScore > 3) { // 3 standard deviations
        anomalies.push({
          id: `stat_app_${app}_${Date.now()}`,
          type: 'access_pattern',
          severity: zScore > 5 ? 'high' : 'medium',
          description: `Unusual ${app} application usage pattern`,
          evidence: [`Current usage: ${currentUsage} minutes`, `Baseline: ${baselineUsage} minutes`, `Z-score: ${zScore.toFixed(2)}`],
          confidence: Math.min(zScore / 5, 1),
          riskImpact: Math.min(zScore * 5, 35),
          detectionMethod: 'statistical',
          timestamp: new Date(),
          relatedEvents: []
        });
      }
    });

    return anomalies;
  }

  private calculateDeviation(baseline: number[], current: number[]): number {
    if (baseline.length === 0 || current.length === 0) return 0;
    
    const baselineSet = new Set(baseline);
    const currentSet = new Set(current);
    const intersection = new Set([...baselineSet].filter(x => currentSet.has(x)));
    const union = new Set([...baselineSet, ...currentSet]);
    
    return 1 - (intersection.size / union.size);
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private calculateRiskScore(anomalies: BehavioralResult['anomalies'], patterns: any, config: BehavioralConfig): number {
    let score = 0;
    
    // Sum risk impact from all anomalies
    anomalies.forEach(anomaly => {
      score += anomaly.riskImpact * anomaly.confidence;
    });
    
    // Apply sensitivity multiplier
    const sensitivityMultiplier = {
      'low': 0.7,
      'medium': 1.0,
      'high': 1.3,
      'critical': 1.6
    };
    
    score *= sensitivityMultiplier[config.sensitivityLevel];
    
    return Math.min(score, 100);
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private generateIndicators(baseline: any, current: any, config: BehavioralConfig): BehavioralResult['indicators'] {
    const indicators: BehavioralResult['indicators'] = [];

    // Login frequency indicator
    indicators.push({
      indicator: 'login_frequency',
      value: current.loginTimes.length,
      threshold: baseline.loginTimes.length * 1.5,
      status: current.loginTimes.length > baseline.loginTimes.length * 1.5 ? 'anomalous' : 'normal',
      trend: current.loginTimes.length > baseline.loginTimes.length ? 'increasing' : 'decreasing',
      description: 'Number of login events in analysis window'
    });

    // Data volume indicator
    indicators.push({
      indicator: 'data_volume',
      value: current.dataVolume.avg,
      threshold: baseline.dataVolume.avg + (2 * baseline.dataVolume.std),
      status: current.dataVolume.avg > baseline.dataVolume.avg + (2 * baseline.dataVolume.std) ? 'anomalous' : 'normal',
      trend: current.dataVolume.avg > baseline.dataVolume.avg ? 'increasing' : 'decreasing',
      description: 'Average data access volume'
    });

    return indicators;
  }

  private async generatePredictions(patterns: any, anomalies: BehavioralResult['anomalies'], events: BehavioralInput['events']): Promise<BehavioralResult['predictions']> {
    // Simple prediction logic based on current trends
    const riskTrend = anomalies.length > 2 ? 'increasing' : 'stable';
    
    // Predict next likely action based on patterns
    const appUsage = Object.entries(patterns.applicationUsage) as [string, number][];
    const mostUsedApp = appUsage.sort((a, b) => b[1] - a[1])[0];
    const nextLikelyAction = mostUsedApp ? `Access ${mostUsedApp[0]} application` : 'Normal activity';
    
    // Calculate time to next anomaly based on current rate
    const timeToNextAnomaly = anomalies.length > 0 ? 6 : undefined; // hours
    
    const recommendedActions = [];
    if (anomalies.some(a => a.severity === 'critical')) {
      recommendedActions.push('Immediate investigation required');
      recommendedActions.push('Consider temporary access restriction');
    }
    if (anomalies.some(a => a.type === 'privilege_escalation')) {
      recommendedActions.push('Review privilege access controls');
    }

    return {
      riskTrend,
      nextLikelyAction,
      timeToNextAnomaly,
      recommendedActions
    };
  }

  private async findRelatedEntities(entityId: string, events: BehavioralInput['events']): Promise<string[]> {
    // Find entities that frequently interact with the analyzed entity
    const relatedEntities = new Set<string>();
    
    events.forEach(event => {
      if (event.details.relatedEntity) {
        relatedEntities.add(event.details.relatedEntity);
      }
      if (event.details.targetUser && event.details.targetUser !== entityId) {
        relatedEntities.add(event.details.targetUser);
      }
    });
    
    return Array.from(relatedEntities).slice(0, 10); // Limit to top 10
  }

  private generateRecommendations(
    anomalies: BehavioralResult['anomalies'], 
    riskLevel: string, 
    predictions: BehavioralResult['predictions']
  ): string[] {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate security investigation required');
      recommendations.push('Consider disabling user account pending investigation');
      recommendations.push('Alert security operations center (SOC)');
    }

    if (anomalies.some(a => a.type === 'spatial')) {
      recommendations.push('Verify user identity through additional authentication');
      recommendations.push('Review VPN and remote access logs');
    }

    if (anomalies.some(a => a.type === 'temporal')) {
      recommendations.push('Implement time-based access controls');
      recommendations.push('Monitor off-hours activity more closely');
    }

    if (anomalies.some(a => a.type === 'volumetric')) {
      recommendations.push('Review data loss prevention (DLP) policies');
      recommendations.push('Monitor large data transfers');
    }

    if (predictions.riskTrend === 'increasing') {
      recommendations.push('Increase monitoring frequency for this entity');
      recommendations.push('Consider implementing stricter access controls');
    }

    return recommendations;
  }

  private calculateConfidence(anomalies: BehavioralResult['anomalies'], eventCount: number): number {
    if (eventCount === 0) return 0;
    
    // Base confidence on number of events and anomaly detection methods
    let confidence = Math.min(eventCount / 100, 0.8); // More events = higher confidence, capped at 80%
    
    // Boost confidence if multiple detection methods agree
    const detectionMethods = new Set(anomalies.map(a => a.detectionMethod));
    if (detectionMethods.size > 1) {
      confidence += 0.15;
    }
    
    // Boost confidence for high-confidence anomalies
    const avgAnomalyConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / Math.max(anomalies.length, 1);
    confidence += avgAnomalyConfidence * 0.1;
    
    return Math.min(confidence, 1.0);
  }

  configure(config: Partial<BehavioralConfig>) {
    const errors: string[] = [];
    
    if (config.timeWindow !== undefined && config.timeWindow < 1) {
      errors.push('timeWindow must be at least 1 hour');
    }
    
    if (config.baselinePeriod !== undefined && config.baselinePeriod < 7) {
      errors.push('baselinePeriod must be at least 7 days');
    }
    
    if (config.anomalyThreshold !== undefined && (config.anomalyThreshold < 0 || config.anomalyThreshold > 1)) {
      errors.push('anomalyThreshold must be between 0.0 and 1.0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}