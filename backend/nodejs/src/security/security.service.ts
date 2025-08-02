import { Injectable } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';

export interface SecurityEvent {
  eventId: string;
  timestamp: string;
  srcIp: string;
  dstIp?: string;
  anomalyType: string;
  endpoint: string;
  sessionLog: any;
  modelScore: number;
  userBehaviorScore: number;
  recentAlerts: any[];
}

export interface IncidentReport {
  summary: string;
  riskFactors: string[];
  mitreAttackMappings: string[];
  responseSteps: string[];
  automationData: any;
}

@Injectable()
export class SecurityService {
  constructor(private openRouterService: OpenRouterService) {}

  async analyzeSecurityEvent(event: SecurityEvent): Promise<IncidentReport> {
    try {
      // Generate AI analysis using OpenRouter
      const analysis = await this.openRouterService.analyzeSecurityEvent(event);
      
      return {
        summary: analysis.summary || 'Security event detected requiring investigation',
        riskFactors: analysis.riskFactors || ['High anomaly score', 'Unusual behavior pattern'],
        mitreAttackMappings: analysis.mitreAttackMappings || ['T1078 - Valid Accounts'],
        responseSteps: analysis.responseSteps || [
          'Investigate user activity',
          'Check for lateral movement',
          'Review access logs',
          'Consider account suspension'
        ],
        automationData: analysis.automationData || {}
      };
    } catch (error) {
      console.error('Error analyzing security event:', error);
      
      // Fallback analysis
      return {
        summary: `High-risk security event detected: ${event.anomalyType}`,
        riskFactors: ['High model score', 'Anomalous behavior'],
        mitreAttackMappings: ['T1078 - Valid Accounts'],
        responseSteps: [
          'Immediate investigation required',
          'Review user session logs',
          'Check for privilege escalation',
          'Monitor for lateral movement'
        ],
        automationData: { eventId: event.eventId, priority: 'high' }
      };
    }
  }

  async getSecurityMetrics() {
    return {
      totalAlerts: 1247,
      criticalAlerts: 23,
      resolvedToday: 156,
      averageResponseTime: '4.2 minutes',
      threatLevel: 'Medium',
      activeIncidents: 8
    };
  }

  async getThreatIntelligence() {
    return {
      recentThreats: [
        {
          id: '1',
          name: 'APT29 Campaign',
          severity: 'High',
          description: 'Advanced persistent threat targeting government entities',
          indicators: ['malicious-domain.com', '192.168.1.100'],
          lastSeen: '2025-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Ransomware Family X',
          severity: 'Critical',
          description: 'New ransomware variant targeting healthcare',
          indicators: ['evil-payload.exe', 'C2-server.net'],
          lastSeen: '2025-01-14T15:45:00Z'
        }
      ],
      iocCount: 15420,
      lastUpdate: new Date().toISOString()
    };
  }
}
