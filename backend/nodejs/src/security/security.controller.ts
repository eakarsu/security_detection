import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService, SecurityEvent } from './security.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private securityService: SecurityService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze security event with AI' })
  @ApiResponse({ status: 200, description: 'Security event analyzed successfully' })
  async analyzeEvent(@Body() event: SecurityEvent) {
    return this.securityService.analyzeSecurityEvent(event);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics dashboard data' })
  @ApiResponse({ status: 200, description: 'Security metrics retrieved successfully' })
  async getMetrics() {
    return this.securityService.getSecurityMetrics();
  }

  @Get('threat-intelligence')
  @ApiOperation({ summary: 'Get latest threat intelligence data' })
  @ApiResponse({ status: 200, description: 'Threat intelligence retrieved successfully' })
  async getThreatIntelligence() {
    return this.securityService.getThreatIntelligence();
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Get recent security incidents' })
  @ApiResponse({ status: 200, description: 'Security incidents retrieved successfully' })
  async getIncidents() {
    return {
      incidents: [
        {
          id: 'INC-2025-001',
          title: 'Suspicious Login Activity',
          severity: 'High',
          status: 'Investigating',
          assignee: 'John Doe',
          createdAt: '2025-01-15T09:30:00Z',
          description: 'Multiple failed login attempts from unusual location'
        },
        {
          id: 'INC-2025-002',
          title: 'Malware Detection',
          severity: 'Critical',
          status: 'Contained',
          assignee: 'Jane Smith',
          createdAt: '2025-01-15T08:15:00Z',
          description: 'Malicious file detected on endpoint HR-WS-12'
        }
      ],
      total: 2,
      page: 1,
      limit: 10
    };
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance status and reports' })
  @ApiResponse({ status: 200, description: 'Compliance data retrieved successfully' })
  async getCompliance() {
    return {
      overallScore: 87,
      frameworks: [
        {
          name: 'SOC 2',
          score: 92,
          status: 'Compliant',
          lastAudit: '2024-12-15',
          nextAudit: '2025-06-15'
        },
        {
          name: 'ISO 27001',
          score: 85,
          status: 'Compliant',
          lastAudit: '2024-11-20',
          nextAudit: '2025-05-20'
        },
        {
          name: 'GDPR',
          score: 84,
          status: 'Needs Attention',
          lastAudit: '2024-10-10',
          nextAudit: '2025-04-10'
        }
      ],
      recentFindings: [
        {
          id: 'F-001',
          framework: 'GDPR',
          severity: 'Medium',
          description: 'Data retention policy needs update',
          dueDate: '2025-02-15'
        }
      ]
    };
  }
}
