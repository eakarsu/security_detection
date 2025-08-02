import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth(): { message: string; timestamp: string; version: string } {
    return this.appService.getHealth();
  }

  @Get('status')
  @ApiOperation({ summary: 'Detailed status check' })
  @ApiResponse({ status: 200, description: 'Detailed service status' })
  getStatus(): { 
    status: string; 
    services: { database: string; redis: string; kafka: string };
    uptime: number;
  } {
    return this.appService.getStatus();
  }
}
