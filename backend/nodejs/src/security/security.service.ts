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
  requiresHumanReview: true;
  evidence: {
    eventId: string;
    modelScore: number;
    userBehaviorScore: number;
  };
}

@Injectable()
export class SecurityService {
  constructor(private openRouterService: OpenRouterService) {}

  async analyzeSecurityEvent(event: SecurityEvent): Promise<IncidentReport> {
    const analysis = await this.openRouterService.analyzeSecurityEvent(event);
    return {
      ...analysis,
      requiresHumanReview: true,
      evidence: {
        eventId: event.eventId,
        modelScore: event.modelScore,
        userBehaviorScore: event.userBehaviorScore,
      },
    };
  }

  async runtimeAdvice(prompt: string, userId: string) {
    return this.openRouterService.runtimeAdvice(prompt, userId);
  }
}
