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
      status: 'running',
      services: {
        database: 'initialized-before-bootstrap',
        redis: 'not_checked',
        kafka: 'not_checked',
      },
      uptime: Date.now() - this.startTime,
    };
  }

  getConfig(): {
    pythonApiUrl: string;
    nodejsApiUrl: string;
    frontendUrl: string;
  } {
    return {
      pythonApiUrl: process.env.PUBLIC_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: process.env.PUBLIC_NODEJS_API_URL || 'http://localhost:3001',
      frontendUrl: process.env.PUBLIC_FRONTEND_URL || 'http://localhost:3000',
    };
  }
}
