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

  getConfig(): {
    pythonApiUrl: string;
    nodejsApiUrl: string;
    frontendUrl: string;
  } {
    return {
      pythonApiUrl: process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      frontendUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
    };
  }
}
