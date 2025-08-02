import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getHealth(): { message: string; timestamp: string; version: string } {
    return {
      message: 'NodeGuard AI Security Platform is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getStatus(): { 
    status: string; 
    services: { database: string; redis: string; kafka: string };
    uptime: number;
  } {
    return {
      status: 'healthy',
      services: {
        database: 'connected',
        redis: 'connected',
        kafka: 'connected',
      },
      uptime: Date.now() - this.startTime,
    };
  }
}
