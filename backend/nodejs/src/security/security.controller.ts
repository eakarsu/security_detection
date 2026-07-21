import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsArray, IsIP, IsNumber, IsObject, IsOptional, IsString, Max, Min, ArrayMaxSize } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export class SecurityEventInput {
  @IsString() eventId: string;
  @IsString() timestamp: string;
  @IsIP() srcIp: string;
  @IsOptional() @IsIP() dstIp?: string;
  @IsString() anomalyType: string;
  @IsString() endpoint: string;
  @IsObject() sessionLog: Record<string, unknown>;
  @IsNumber() @Min(0) @Max(1) modelScore: number;
  @IsNumber() @Min(0) @Max(1) userBehaviorScore: number;
  @IsArray() @ArrayMaxSize(50) recentAlerts: unknown[];
}

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private securityService: SecurityService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze security event with AI' })
  @ApiResponse({ status: 200, description: 'Security event analyzed successfully' })
  async analyzeEvent(@Body() event: SecurityEventInput) {
    return this.securityService.analyzeSecurityEvent(event);
  }
}
